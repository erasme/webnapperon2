// Server.cs
// 
//  The Webnapperon2 HTTP server. Provide all the services
//  of the Webnapperon2
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2013-2014 Departement du Rhone
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

using System;
using System.Text;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Authentication;
using Erasme.Cloud.Queue;
using Erasme.Cloud.HttpProxy;
using Erasme.Cloud.Google;
using Erasme.Cloud.Facebook;
using Erasme.Cloud.Storage;
using Erasme.Cloud.Preview;
using Erasme.Cloud.Audio;
using Erasme.Cloud.Video;
using Erasme.Cloud.Pdf;
using Erasme.Cloud.Message;
using Erasme.Cloud.Manage;
using Erasme.Cloud.StaticFiles;
using Webnapperon2.Compatibility;
using Webnapperon2.PathLog;
using Webnapperon2.News;
using Webnapperon2.Picasa;
using Webnapperon2.Podcast;
using Webnapperon2.User;
using Webnapperon2.Rfid;
using Webnapperon2.Resource;

namespace Webnapperon2
{
	public class Server: HttpServer
	{
		AuthSessionService authSessionService;
		UserService userService;

		public Server(Setup setup): base(setup.Port)
		{
			Setup = setup;

			AllowGZip = Setup.AllowGZip;

			// define the logger which handle logs
			Logger = new FileLogger(Setup.Log+"/webnapperon2.log");
			// define the task factory for long running tasks
			LongRunningTaskFactory = new TaskFactory(new Erasme.Cloud.Utils.LimitedConcurrencyTaskScheduler(Setup.MaximumConcurrency));

			authSessionService = new AuthSessionService(
				Setup.Storage+"/authsession/", Setup.AuthSessionTimeout, Setup.AuthHeader,
				Setup.AuthCookie);
			// plugin to handle auth sessions
			Add(new AuthSessionPlugin(authSessionService, Setup.AuthHeader, Setup.AuthCookie));
			// plugin to remove ETag support in iOS Safari because of iOS bugs
			Add(new SafariETagPlugin());
			// force IE8 to render un compatibility mode (IE7)
			Add(new IECompatibilityPlugin());
			// plugin to remove Keep-Alive support in iOS Safari because of iOS bugs
			Add(new SafariKeepAlivePlugin());
			// plugin to get the connected user JSON profil
			UserPlugin userPlugin = new UserPlugin();
			Add(userPlugin);

			PathMapper mapper = new PathMapper();
			Add(mapper);

			// authentication session web service
			mapper.Add(Setup.Path+"/authsession", authSessionService);

			// public helper services
			mapper.Add(Setup.Path+"/proxy", new ProxyService());
			mapper.Add(Setup.Path+"/googleoauth2", new GoogleAuthenticationService(
				Setup.GoogleClientId, Setup.GoogleClientSecret, Setup.GoogleAuthRedirectUrl,
				OnGoogleGotUserProfile));
			mapper.Add(Setup.Path+"/facebookoauth2", new FacebookAuthenticationService(
				Setup.FacebookClientId, Setup.FacebookClientSecret, Setup.FacebookAuthRedirectUrl,
				OnFacebookGotUserProfile));

			// file storage
			StorageService storageService = new StorageService(
				Setup.Storage+"/storage/", Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger);
			mapper.Add(Setup.Path+"/storage", storageService);
			mapper.Add(Setup.Path+"/preview", new PreviewService(Setup.Storage+"/preview/", storageService, 64, 64, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger));
			mapper.Add(Setup.Path+"/previewhigh", new PreviewService(Setup.Storage+"/previewhigh/", storageService, 1024, 768, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger));
			mapper.Add(Setup.Path+"/audio", new AudioService(Setup.Storage+"/audio/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, LongRunningTaskFactory));
			mapper.Add(Setup.Path+"/video", new VideoService(Setup.Storage+"/video/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, LongRunningTaskFactory));
			mapper.Add(Setup.Path+"/pdf", new PdfService(Setup.Storage+"/pdf/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, LongRunningTaskFactory));
			PicasaService picasaService = new PicasaService(
				Setup.Storage+"/picasa/", storageService, LongRunningTaskFactory, Logger);
			mapper.Add(Setup.Path+"/picasa", picasaService);
			PodcastService podcastService = new PodcastService(
				Setup.Storage+"/podcast/", storageService, LongRunningTaskFactory, Logger);
			mapper.Add(Setup.Path+"/podcast", podcastService);
			NewsService newsService = new NewsService(
				Setup.Storage+"/news/", storageService, Setup.TemporaryDirectory,
				LongRunningTaskFactory, Logger);
			mapper.Add(Setup.Path+"/news", newsService);

			// messagerie
			MessageService messageService = new MessageService(Setup.Storage+"/message/");
			messageService.Rights = new Webnapperon2.Message.MessageRights();
			mapper.Add(Setup.Path+"/message", messageService);

			// Queue
			QueueService queueService = new QueueService();
			mapper.Add(Setup.Path+"/queue", queueService);

			// user
			userService = new UserService(
				Setup.ServerName, Setup.Port, Setup.PublicUrl,
				authSessionService, storageService,
				messageService, picasaService, podcastService, newsService,
				Setup.Storage+"/user/", Setup.Static+"/user/",
				Setup.AuthHeader, Setup.AuthCookie, Setup.SmtpServer,
				Setup.SmtpFrom, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger);
			mapper.Add(Setup.Path+"/user", userService);
			userPlugin.UserService = userService;

			// resource
			mapper.Add(Setup.Path+"/resource", new ResourceService(userService));

			// pathlogs
			PathLogService pathLogService = new PathLogService(Setup.Storage + "/pathlog");
			pathLogService.Rights = new Webnapperon2.PathLog.PathLogRights();
			mapper.Add(Setup.Path+"/pathlog", pathLogService);

			// RFID
			mapper.Add(Setup.Path+"/rfid", new RfidService(userService, messageService, queueService, Logger));

			// management
			mapper.Add(Setup.Path+"/status", new ManageService());

			// static file distribution (web app)
			Add(new StaticFilesService(Setup.Static+"/www/", Setup.DefaultCacheDuration));

		}

		public Setup Setup { get; private set; }

		public ILogger Logger { get; private set; }

		public TaskFactory LongRunningTaskFactory { get; private set; }

		void OnGoogleGotUserProfile(JsonValue token, JsonValue profile, HttpContext context, string state)
		{
			if(state == "grant") {
				if(profile != null) {
					JsonValue diff = new JsonObject();
					diff["googleid"] = (string)profile["id"];
					userService.ChangeUser(context.User, diff);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Headers["content-type"] = "text/html";
				context.Response.Content = new StringContent("<html><head><script>window.close();</script></head></html>");
			}
			else {
				if(profile != null) {
					string user = userService.GetUserFromGoogleId((string)profile["id"]);
					// new user, create it
					if(user == null) {
						JsonValue userProfile = new JsonObject();
						userProfile["googleid"] = (string)profile["id"];
						userProfile["firstname"] = (string)profile["given_name"];
						userProfile["lastname"] = (string)profile["family_name"];
						user = userService.CreateUser(userProfile);
					
						if(profile.ContainsKey("picture") && ((string)profile["picture"] != ""))
							userService.SetUserFaceFromUrl(user, (string)profile["picture"]);
					}
					// connect the user it and redirect it
					JsonValue authSession = authSessionService.Create(user.ToString());
					context.Response.Headers["set-cookie"] = Setup.AuthCookie+"="+(string)authSession["id"]+"; Path=/";
				}
				context.Response.StatusCode = 307;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Headers["location"] = "/";
			}
		}

		void OnFacebookGotUserProfile(JsonValue token, JsonValue profile, HttpContext context, string state)
		{
			if(state == "grant") {
				if(profile != null) {
					JsonValue diff = new JsonObject();
					diff["facebookid"] = (string)profile["id"];
					userService.ChangeUser(context.User, diff);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Headers["content-type"] = "text/html";
				context.Response.Content = new StringContent("<html><head><script>window.close();</script></head></html>");
			}
			else {
				if(profile != null) {
					string user = userService.GetUserFromFacebookId((string)profile["id"]);
					// new user, create it
					if(user == null) {
						JsonValue userProfile = new JsonObject();
						userProfile["facebookid"] = (string)profile["id"];
						if(profile.ContainsKey("first_name"))
							userProfile["firstname"] = (string)profile["first_name"];
						if(profile.ContainsKey("last_name"))
							userProfile["lastname"] = (string)profile["last_name"];
						user = userService.CreateUser(userProfile);
					
						if(profile.ContainsKey("picture")) {
							JsonValue obj = profile["picture"] as JsonValue;
							if((obj != null) && (obj.ContainsKey("data")) && obj["data"].ContainsKey("url")) {
								userService.SetUserFaceFromUrl(user, (string)obj["data"]["url"]);
							}
						}
					}
					// connect the user it and redirect it
					JsonValue authSession = authSessionService.Create(user.ToString());
					context.Response.Headers["set-cookie"] = Setup.AuthCookie+"="+(string)authSession["id"]+"; Path=/";
				}
				context.Response.StatusCode = 307;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Headers["location"] = "/";
			}
		}

		protected override async Task ProcessRequestAsync(HttpContext context)
		{
			await base.ProcessRequestAsync(context);
			// log the request

			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(context.User != null) {
				log.Append(context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");
			// request 
			log.Append("\"");
			log.Append(context.Request.Method);
			log.Append(" ");
			log.Append(context.Request.FullPath);
			log.Append("\" ");
			// response
			if(context.WebSocket != null)
				log.Append("WS ");
			else {
				log.Append(context.Response.StatusCode);
				log.Append(" ");
			}
			// bytes received
			log.Append(context.Request.ReadCounter);
			log.Append("/");
			log.Append(context.Request.WriteCounter);
			log.Append(" ");
			// time
			log.Append(Math.Round((DateTime.Now - context.Request.StartTime).TotalMilliseconds).ToString(CultureInfo.InvariantCulture));
			log.Append("ms");

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());
		}

		protected override void OnWebSocketHandlerOpen(WebSocketHandler handler)
		{
			// log the message
			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(handler.Context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(handler.Context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(handler.Context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(handler.Context.User != null) {
				log.Append(handler.Context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");
			// request 
			log.Append("\"WSOPEN ");
			log.Append(handler.Context.Request.FullPath);
			log.Append("\"");

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());

			base.OnWebSocketHandlerOpen(handler);
		}

		protected override void OnWebSocketHandlerMessage(WebSocketHandler handler, string message)
		{
			// log the message
			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(handler.Context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(handler.Context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(handler.Context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(handler.Context.User != null) {
				log.Append(handler.Context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");
			// request 
			log.Append("\"WSMI ");
			log.Append(handler.Context.Request.FullPath);
			log.Append("\" \"");
			log.Append(message);
			log.Append("\"");

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());

			// handle the message
			base.OnWebSocketHandlerMessage(handler, message);
		}

		protected override void WebSocketHandlerSend(WebSocketHandler handler, string message)
		{
			base.WebSocketHandlerSend(handler, message);

			// log the message
			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(handler.Context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(handler.Context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(handler.Context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(handler.Context.User != null) {
				log.Append(handler.Context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");
			// request 
			log.Append("\"WSMO ");
			log.Append(handler.Context.Request.FullPath);
			log.Append("\" \"");
			log.Append(message);
			log.Append("\"");

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());
		}

		protected override void OnWebSocketHandlerClose(WebSocketHandler handler)
		{
			base.OnWebSocketHandlerClose(handler);

			// log the message
			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(handler.Context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(handler.Context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(handler.Context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(handler.Context.User != null) {
				log.Append(handler.Context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");
			// request 
			log.Append("\"WSCLOSE ");
			log.Append(handler.Context.Request.FullPath);
			log.Append("\"");

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());
		}

		protected override void OnProcessRequestError(HttpContext context, Exception exception)
		{
			base.OnProcessRequestError(context, exception);
			// handle web exceptions
			if(exception is WebException) {
				WebException webException = (WebException)exception;
				context.Response.StatusCode = webException.HttpStatus;
				JsonValue json = new JsonObject();
				json["code"] = webException.Code;
				json["detail"] = webException.Detail;
				context.Response.Content = new JsonContent(json);
			}
			else {
				StringBuilder log = new StringBuilder();

				// remote address
				log.Append(context.Request.RemoteEndPoint.ToString());
				log.Append(" ");

				// x-forwarded-for
				if(context.Request.Headers.ContainsKey("x-forwarded-for")) {
					log.Append("[");
					log.Append(context.Request.Headers["x-forwarded-for"]);
					log.Append("] ");
				}

				// user
				if(context.User != null) {
					log.Append(context.User);
					log.Append(" ");
				}
				else
					log.Append("- ");

				// request 
				log.Append("\"");
				log.Append(context.Request.Method);
				log.Append(" ");
				log.Append(context.Request.FullPath);
				log.Append("\" ");
				// response
				if(context.WebSocket != null)
					log.Append("WS ");
				else {
					log.Append(context.Response.StatusCode);
					log.Append(" ");
				}
				// bytes received
				log.Append(context.Request.ReadCounter);
				log.Append("/");
				log.Append(context.Request.WriteCounter);
				log.Append(" ");
				// time
				log.Append(Math.Round((DateTime.Now - context.Request.StartTime).TotalMilliseconds).ToString(CultureInfo.InvariantCulture));
				log.Append("ms\n");
				// exception details
				log.Append(exception.ToString());

				// write the log
				Logger.Log(LogLevel.Debug, log.ToString());
			}
		}
	}
}

