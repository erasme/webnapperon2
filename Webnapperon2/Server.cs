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
using Erasme.Cloud.Compatibility;
using Erasme.Cloud.Utils;
using Webnapperon2.PathLog;
using Webnapperon2.News;
using Webnapperon2.Picasa;
using Webnapperon2.Podcast;
using Webnapperon2.User;
using Webnapperon2.Rfid;
using Webnapperon2.Resource;
using Webnapperon2.Message;
using Webnapperon2.Authentication;
using Webnapperon2.Storage;
using Webnapperon2.Manage;

namespace Webnapperon2
{
	/*	public class TestPlugin: IStoragePlugin
	{
		static readonly string[] mimetypes = new string[] { "**" };

		public string[] MimeTypes {
			get {
				return mimetypes;
			}
		}

		public string Path {
			get {
				return "testplugin";
			}
		}

		public void GetFile(StorageService.StorageFile file)
		{
			Console.WriteLine("TestPlugin.Get id: "+file.Data["id"]+", name: "+file.Data["name"]);
		
			string version = file.GetCacheString("TestPlugin.version");
			if(version == null) {
				Console.WriteLine("TestPlugin NOT IN CACHE");
				version = "v0.1";
				file.SetCacheString("TestPlugin.version", version);
			}
			file.Data["testPlugin"] = version;
		}

		public void CreateFile(StorageService.StorageFile file)
		{
		}

		public void ChangeFile(StorageService.StorageFile file)
		{
		}

		public void DeleteFile(StorageService.StorageFile file)
		{
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<object>(null);
		}
	}

	public class ImagePlugin: IStoragePlugin
	{
		static readonly string[] mimetypes = new string[] { "image/jpeg", "image/png" };

		public string[] MimeTypes {
			get {
				return mimetypes;
			}
		}

		public string Path {
			get {
				return "image";
			}
		}

		public void GetFile(StorageService.StorageFile file)
		{
			Console.WriteLine("ImagePlugin.Get id: "+file.Data["id"]+", name: "+file.Data["name"]);
		}

		public void CreateFile(StorageService.StorageFile file)
		{
		}

		public void ChangeFile(StorageService.StorageFile file)
		{
		}

		public void DeleteFile(StorageService.StorageFile file)
		{
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<object>(null);
		}
	}*/


	public class Server: HttpServer
	{
		AuthSessionService authSessionService;
		UserService userService;

		public Server(JsonValue setup): base((int)setup["server"]["port"])
		{
			Setup = setup;

			// the setup part needed by clients
			ClientSetup = new JsonObject();
			ClientSetup.server = new JsonObject();
			ClientSetup.server.name = new JsonPrimitive(ServerName);
			ClientSetup.server.publicUrl = Setup.server.publicUrl;
			ClientSetup.server.path = Setup.server.path;
			ClientSetup.webRTC = Setup.webRTC;
			ClientSetup.authentication = new JsonObject();
			ClientSetup.authentication.session = Setup.authentication.session;
			ClientSetup.authentication.services = new JsonArray();
			ClientSetup.style = Setup.style;
			ClientSetup.icons = Setup.icons;

			AllowGZip = Setup.http.allowGZip;
			KeepAliveMax = Setup.http.keepAliveMax;
			KeepAliveTimeout = Setup.http.keepAliveTimeout;

			// define the logger which handle logs
			Logger = new FileLogger(Setup.server.log+"/webnapperon2.log");
			// define the task scheduler for long running tasks
			LongRunningTaskScheduler = new PriorityTaskScheduler(Setup.server.maximumConcurrency);

			authSessionService = new AuthSessionService(
				Setup.server.storage+"/authsession/", Setup.authentication.session.timeout,
				Setup.authentication.session.header, Setup.authentication.session.cookie);
			// plugin to handle auth sessions
			//Add(new AuthSessionPlugin(authSessionService, Setup.AuthHeader, Setup.AuthCookie));
			// plugin to remove ETag support in iOS Safari because of iOS bugs
			Add(new SafariETagPlugin());
			// plugin to remove Keep-Alive support in iOS Safari because of iOS bugs
			Add(new SafariKeepAlivePlugin());

			PathMapper mapper = new PathMapper();
			Add(mapper);

			// authentication session web service
			mapper.Add(Setup.server.path+"/authsession", authSessionService);

			// public helper services
			mapper.Add(Setup.server.path+"/proxy", new ProxyService());
			for(int i = 0; i < Setup.authentication.services.Count; i++) {
				dynamic service = Setup.authentication.services[i];
				if(service.type == "googleoauth2") {
					mapper.Add(Setup.server.path + "/googleoauth2", new GoogleAuthenticationService(
						service.clientId, service.clientSecret, (string)Setup.server.publicUrl + (string)Setup.server.path + "/googleoauth2",
						new Erasme.Cloud.Google.GotUserProfileHandler(OnGoogleGotUserProfile)));
					dynamic clientService = new JsonObject();
					clientService.type = service.type;
					clientService.url = new JsonPrimitive((string)Setup.server.publicUrl + (string)Setup.server.path + "/googleoauth2/redirect");
					ClientSetup.authentication.services.Add(clientService);
				}
				else if(service.type == "facebookoauth2") {
					mapper.Add(Setup.server.path + "/facebookoauth2", new FacebookAuthenticationService(
						service.clientId, service.clientSecret, (string)Setup.server.publicUrl + (string)Setup.server.path + "/facebookoauth2",
						new Erasme.Cloud.Facebook.GotUserProfileHandler(OnFacebookGotUserProfile)));
					dynamic clientService = new JsonObject();
					clientService.type = service.type;
					clientService.url = new JsonPrimitive((string)Setup.server.publicUrl + (string)Setup.server.path + "/facebookoauth2/redirect");
					ClientSetup.authentication.services.Add(clientService);
				}
				else {
					ClientSetup.authentication.services.Add(service);
				}
			}
			mapper.Add(Setup.server.path+"/wallpaper/", new Webnapperon2.Wallpaper.WallpaperService(Setup.server["static"] + "/wallpaper/", Setup.server.storage + "/wallpaper/", Setup.http.defaultCacheDuration));

			// service for a client to get the server setup
			mapper.Add(Setup.server.path + "/setup", new JsonContent(ClientSetup));

			// file storage
			StorageService storageService = new StorageService(
				Setup.server.storage+"/storage/",Setup.server.temporaryDirectory,
				Setup.http.defaultCacheDuration, Logger);
			mapper.Add(Setup.server.path+"/storage", storageService);
			mapper.Add(Setup.server.path+"/preview",
				new PreviewService(Setup.server.storage+"/preview/", storageService,
					64, 64, Setup.server.temporaryDirectory,
					Setup.http.defaultCacheDuration, Logger));
			mapper.Add(Setup.server.path+"/previewhigh",
				new PreviewService(Setup.server.storage+"/previewhigh/", storageService,
					1024, 768, Setup.server.temporaryDirectory,
					Setup.http.defaultCacheDuration, Logger));
			mapper.Add(Setup.server.path+"/audio",
				new AudioService(Setup.server.storage+"/audio/", storageService,
					Setup.server.temporaryDirectory, Setup.http.defaultCacheDuration,
					LongRunningTaskScheduler));
			mapper.Add(Setup.server.path+"/video",
				new VideoService(Setup.server.storage+"/video/", storageService,
					Setup.server.temporaryDirectory, Setup.http.defaultCacheDuration,
					LongRunningTaskScheduler));
			mapper.Add(Setup.server.path+"/pdf",
				new PdfService(Setup.server.storage+"/pdf/", storageService,
					Setup.server.temporaryDirectory, Setup.http.defaultCacheDuration,
					LongRunningTaskScheduler));

			//storageService.AddPlugin(new TestPlugin());
			//storageService.AddPlugin(new ImagePlugin());

			// messagerie
			MessageService messageService = new MessageService(Setup.server.storage+"/message/");
			mapper.Add(Setup.server.path+"/message", messageService);

			// Queue
			QueueService queueService = new QueueService();
			mapper.Add(Setup.server.path+"/queue", queueService);

			PicasaService picasaService = new PicasaService(
				Setup.server.storage+"/picasa/", storageService, LongRunningTaskScheduler, Logger);
			PodcastService podcastService = new PodcastService(
				Setup.server.storage+"/podcast/", storageService, LongRunningTaskScheduler, Logger);
			NewsService newsService = new NewsService(
				Setup.server.storage+"/news/", storageService, Setup.server.temporaryDirectory,
				LongRunningTaskScheduler, Logger);

			// user
			userService = new UserService(
				Setup.server.name, Setup.server.port, Setup.server.publicUrl,
				authSessionService, storageService,
				messageService, picasaService, podcastService, newsService,
				Setup.server.storage+"/user/", Setup.server["static"]+"/user/",
				Setup.authentication.session.header, Setup.authentication.session.cookie, Setup.mail.servers[0].host,
				Setup.mail.from, Setup.server.temporaryDirectory, Setup.http.defaultCacheDuration, Logger);
			mapper.Add(Setup.server.path+"/user", userService);
			picasaService.UserService = userService;
			podcastService.UserService = userService;
			newsService.UserService = userService;

			messageService.Rights = new MessageRights(userService);
			authSessionService.Rights = new AuthSessionRights(userService);
			storageService.Rights = new StorageRights(userService);

			// resource
			mapper.Add(Setup.server.path+"/resource", new ResourceService(userService));

			// pathlogs
			PathLogService pathLogService = new PathLogService(Setup.server.storage + "/pathlog");
			pathLogService.Rights = new PathLogRights(userService);
			mapper.Add(Setup.server.path+"/pathlog", pathLogService);

			// RFID
			mapper.Add(Setup.server.path+"/rfid", new RfidService(userService, messageService, queueService, Logger));

			// management
			ManageService manageService = new ManageService(LongRunningTaskScheduler);
			manageService.Rights = new ManageRights(userService);
			mapper.Add(Setup.server.path+"/status", manageService);

			// static file distribution (web app)
			Add(new StaticFilesService(Setup.server["static"]+"/www/", Setup.http.defaultCacheDuration));

			// replace application/json by text/plain for IE <9
			// force IE8 to render un compatibility mode (IE7)
			Add(new IECompatibilityPlugin());
		}

		public dynamic Setup { get; private set; }

		public dynamic ClientSetup { get; private set; }

		public ILogger Logger { get; private set; }

		public PriorityTaskScheduler LongRunningTaskScheduler { get; private set; }

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
					context.Response.Headers["set-cookie"] = Setup.authentication.session.cookie+"="+(string)authSession["id"]+"; Path=/";
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
					context.Response.Headers["set-cookie"] = Setup.authentication.session.cookie+"="+(string)authSession["id"]+"; Path=/";
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

