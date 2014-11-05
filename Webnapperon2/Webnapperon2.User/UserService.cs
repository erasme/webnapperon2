// UserService.cs
// 
//  The user service define what is a webnapperon2's user
//  and all its resources. This is the central directory
//  on the webnapperon2.
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
using System.IO;
using System.Text;
using System.Data;
using System.Net.Mail;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;
using Erasme.Cloud.Authentication;
using Erasme.Cloud.Message;
using Webnapperon2.Picasa;
using Webnapperon2.Podcast;
using Webnapperon2.News;

namespace Webnapperon2.User
{
	public class UserService: IHttpHandler, IDisposable
	{
		object instanceLock = new object();
		Dictionary<string,WebSocketHandlerCollection<MonitorClient>> clients = new Dictionary<string,WebSocketHandlerCollection<MonitorClient>>();

		class MonitorClient: WebSocketHandler
		{
			string user;
			string currentResource = null;

			public MonitorClient(UserService service, string user)
			{
				Service = service;
				this.user = user;
			}

			public UserService Service { get; private set; }
			
			public string User
			{
				get {
					return user;
				}
			}

			void EnsureCanReadResource(string resourceId)
			{
				// need a logged user
				Service.EnsureIsAuthenticated(Context);

				JsonValue rights = Service.GetUserResourceRights(Context.User, resourceId);
				// read rights
				if((bool)rights["read"])
					return;
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
			}

			public override void OnOpen()
			{
				bool first = false;
				lock(Service.instanceLock) {
					WebSocketHandlerCollection<MonitorClient> channelClients;
					if(Service.clients.ContainsKey(User)) {
						channelClients = Service.clients[User];
					}
					else {
						channelClients = new WebSocketHandlerCollection<MonitorClient>();
						Service.clients[User] = channelClients;
						first = true;
					}
					channelClients.Add(this);
				}
				if(first)
					Service.OnUserConnected(User);
			}

			public override void OnMessage(string message)
			{
				JsonValue json = JsonValue.Parse(message);
				// handle watch resource message
				if(json.ContainsKey("type") && (json["type"] == "watch") && (json.ContainsKey("resource") || json.ContainsKey("user"))) {
					string resource;

					if(json.ContainsKey("resource")) {
						resource = json["resource"];
						// check the rights
						EnsureCanReadResource(resource);
					}
					else {
						resource = json["user"];
						// check the rights
						Service.EnsureCanReadShortUser(Context, resource, null);
					}

					lock(Service.instanceLock) {
						if(currentResource != resource) {
							// remove the old watch
							if((currentResource != null) && (Service.clients.ContainsKey(currentResource))) {
								WebSocketHandlerCollection<MonitorClient> channelClients;
								channelClients = Service.clients[currentResource];
								channelClients.Remove(this);
								// remove the channel is empty
								if(channelClients.Count == 0)
									Service.clients.Remove(currentResource);
							}
							currentResource = resource;
							if(currentResource != null) {
								// watch the new current resource
								WebSocketHandlerCollection<MonitorClient> channelClients;
								if(Service.clients.ContainsKey(currentResource)) {
									channelClients = Service.clients[currentResource];
								}
								else {
									channelClients = new WebSocketHandlerCollection<MonitorClient>();
									Service.clients[currentResource] = channelClients;
								}
								channelClients.Add(this);
							}
						}
					}
				}
			}

			public override void OnClose()
			{
				bool last = false;
				lock(Service.instanceLock) {
					if(Service.clients.ContainsKey(User)) {
						WebSocketHandlerCollection<MonitorClient> channelClients;
						channelClients = Service.clients[User];
						channelClients.Remove(this);
						// remove the channel is empty
						if(channelClients.Count == 0) {
							Service.clients.Remove(User);
							last = true;
						}
					}
					// remove the old resource watch
					if((currentResource != null) && Service.clients.ContainsKey(currentResource)) {
						WebSocketHandlerCollection<MonitorClient> channelClients;
						channelClients = Service.clients[currentResource];
						channelClients.Remove(this);
						// remove the channel is empty
						if(channelClients.Count == 0)
							Service.clients.Remove(currentResource);
					}
				}
				if(last)
					Service.OnUserDisconnected(User);
			}
		}

		StorageService storage;
		PicasaService picasa;
		PodcastService podcast;
		NewsService news;
		AuthSessionService authSessionService;
		MessageService messageService;
		string basePath;
		string staticPath;
		string authHeader;
		string authCookie;
		string temporaryDirectory;
		int cacheDuration;
		ILogger logger;
		string url;
		bool isNewDatabase = false;

		IDbConnection dbcon;

		public UserService(string serverName, int port, string publicUrl,
		                   AuthSessionService authSessionService,
		                   StorageService storage, MessageService messageService, PicasaService picasa, PodcastService podcast,
		                   NewsService news, string basepath, string staticpath,
		                   string authHeader, string authCookie, string smtpServer,
		                   string smtpFrom, string temporaryDirectory, int cacheDuration, ILogger logger)
		{
			this.authSessionService = authSessionService;
			this.storage = storage;
			this.messageService = messageService;
			this.picasa = picasa;
			this.podcast = podcast;
			this.news = news;
			basePath = basepath;
			staticPath = staticpath;
			this.authHeader = authHeader;
			this.authCookie = authCookie;
			SmtpServer = smtpServer;
			SmtpFrom = smtpFrom;
			this.temporaryDirectory = temporaryDirectory;
			this.cacheDuration = cacheDuration;
			this.logger = logger;

			url = publicUrl;

			if(!Directory.Exists(basepath))
				Directory.CreateDirectory(basepath);
			
			if(!Directory.Exists(basepath+"/faces"))
				Directory.CreateDirectory(basepath+"/faces");

			bool createNeeded = !File.Exists(basepath+"users.db");

			dbcon = (IDbConnection) new SqliteConnection("URI=file:"+basepath+"users.db");
			dbcon.Open();

			if(createNeeded) {
				isNewDatabase = true;

				// create the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE user (id VARCHAR PRIMARY KEY, firstname VARCHAR, "+
						"lastname VARCHAR, description VARCHAR, email VARCHAR, login VARCHAR, password VARCHAR, "+
							"admin INTEGER(1) DEFAULT 0 NOT NULL, googleid VARCHAR DEFAULT NULL, "+
							"facebookid VARCHAR DEFAULT NULL, face_rev INTEGER DEFAULT 0,"+
							"email_notify_message_received INTEGER(1) DEFAULT 0, "+
							"email_notify_contact_added INTEGER(1) DEFAULT 0, "+
							"email_notify_resource_shared INTEGER(1) DEFAULT 0, "+
							"email_notify_comment_added INTEGER(1) DEFAULT 0, "+
							"create_date INTEGER, default_friend INTEGER(1) DEFAULT 0 NOT NULL,"+
					        "default_share_right INTEGER(1) DEFAULT 0, default_write_right INTEGER(1) DEFAULT 0,"+
					        "data VARCHAR DEFAULT NULL)";
	
					dbcmd.ExecuteNonQuery();
				}
				
				// create the contact table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = 
						"CREATE TABLE contact (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id VARCHAR, "+
						"contact_id VARCHAR, position INTEGER DEFAULT 0)";
					dbcmd.ExecuteNonQuery();
				}

				// create the resource table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = 
						"CREATE TABLE resource "+
						"(id VARCHAR PRIMARY KEY, owner_id VARCHAR, "+
						"type VARCHAR, name VARCHAR, data VARCHAR, public_read INTEGER(1) DEFAULT 0, "+
						"public_write INTEGER(1) DEFAULT 0, public_share INTEGER(1) DEFAULT 0, "+
						"ctime INTEGER, rev INTEGER DEFAULT 0, storage_id VARCHAR DEFAULT NULL, "+
						"preview_file_id INTEGER DEFAULT NULL, preview_file_rev INTEGER DEFAULT NULL)";
					dbcmd.ExecuteNonQuery();
				}

				// create the resource seen table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE resource_seen (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id VARCHAR, user_id VARCHAR, seen_rev INTEGER)";
					dbcmd.ExecuteNonQuery();
				}

				// create the right table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE right (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id VARCHAR, user_id VARCHAR, read INTEGER(1), write INTEGER(1), share INTEGER(1))";
					dbcmd.ExecuteNonQuery();
				}

				// create the bookmark table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id VARCHAR, resource_id VARCHAR, position INTEGER DEFAULT 0)";
					dbcmd.ExecuteNonQuery();
				}

				// create the rfid table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE rfid (id VARCHAR, user_id VARCHAR, path VARCHAR)";
					dbcmd.ExecuteNonQuery();
				}

				// create the device table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE device (id VARCHAR PRIMARY KEY, user_id VARCHAR, ctime INTEGER, name VARCHAR)";
					dbcmd.ExecuteNonQuery();
				}

				// create the reader table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "CREATE TABLE reader (id VARCHAR PRIMARY KEY, user_id VARCHAR, ctime INTEGER, device_id VARCHAR, name VARCHAR)";
					dbcmd.ExecuteNonQuery();
				}
			}
			// disable disk sync.
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
			this.storage.FileChanged += OnStorageFileChanged;
			this.storage.FileCreated += OnStorageFileChanged;
			this.storage.FileDeleted += OnStorageFileChanged;
			this.storage.CommentCreated += OnStorageCommentCreated;
			this.messageService.MessageCreated += OnMessageCreated;
			this.messageService.MessageChanged += OnMessageChanged;
		}

		public void ChangeResourceUpdateStorage(JsonValue jsonResource, JsonValue diff)
		{
			JsonValue root = this.storage.GetFileInfo(jsonResource["storage_id"], 0, 1);
			if(root != null) {
				if(diff == null)
					diff = new JsonObject();

				if(root.ContainsKey("children")) {
					JsonArray files = (JsonArray)root["children"];
					if(files.Count > 0) {
						JsonValue jsonFile = files[0];
						diff["preview_file_id"] = jsonFile["id"];
						diff["preview_file_rev"] = jsonFile["rev"];
					}
					else {
						diff["preview_file_id"] = null;
						diff["preview_file_rev"] = null;
					}
				}
				else {
					diff["preview_file_id"] = null;
					diff["preview_file_rev"] = null;
				}
				diff["rev"] = root["storage_rev"];
				ChangeResource(jsonResource["id"], diff, null);
			}
		}

		void OnStorageFileChanged(string storage, long file)
		{
			// Console.WriteLine("OnStorageFileChanged START");
			//DateTime startTime = DateTime.UtcNow;

			JsonValue jsonResource = GetResourceFromStorage(storage);
			//Console.WriteLine("OnStorageFileChanged STEP1 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
			if(jsonResource != null) {
				if(jsonResource["type"] == "storage")
					ChangeResourceUpdateStorage(jsonResource, null);
				//Console.WriteLine("OnStorageFileChanged STEP2 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
			}
			//Console.WriteLine("OnStorageFileChanged END "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
		}

		void OnStorageCommentCreated(string storage, long file, long comment)
		{
			//Console.WriteLine("OnStorageCommentCreated "+comment+" START");
			//DateTime startTime = DateTime.UtcNow;

			JsonValue resource = GetResourceFromStorage(storage);

			//Console.WriteLine("OnStorageCommentCreated "+comment+" STEP1 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");


			if(resource != null) {
				// update the resource (the revision)
				ChangeResourceUpdateStorage(resource, null);

				JsonValue fileInfo = this.storage.GetFileInfo(storage, file, 0);
				string origin = null;
				string text = "";
				string resource_id = (string)resource["id"];
				List<string> interestedUsers = new List<string>();
				// find all user who let a comment on the resource
				JsonArray comments = (JsonArray)fileInfo["comments"];
				foreach(JsonValue tmp in comments) {
					string user = (string)tmp["user"];
					long id = (long)tmp["id"];
					if(id == comment) {
						origin = user;
						text = (string)tmp["content"];
					}
					if(!interestedUsers.Contains(user))
						interestedUsers.Add(user);
				}
				// add the owner of the resource
				string owner = (string)resource["owner_id"];
				if(!interestedUsers.Contains(owner))
					interestedUsers.Add(owner);

				//Console.WriteLine("OnStorageCommentCreated "+comment+" STEP2 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

				// get all users who bookmark this resource
				List<string> bookmarkUsers = GetUsersWhoBookmarkResource((string)resource["id"]);
				foreach(string bookmarkUser in bookmarkUsers)
					if(!interestedUsers.Contains(bookmarkUser))
						interestedUsers.Add(bookmarkUser);

				foreach(string interestedUser in interestedUsers) {
					if(interestedUser == origin)
						continue;
					JsonValue message = new JsonObject();
					message["type"] = "comment";
					message["origin"] = origin;
					message["destination"] = interestedUser;
					JsonValue contentJson = new JsonObject();
					message["content"] = contentJson;
					contentJson["file"] = file;
					contentJson["comment"] = comment;
					contentJson["text"] = text;
					JsonValue resourceJson = new JsonObject();
					contentJson["resource"] = resourceJson;
					resourceJson["id"] = resource_id;
					resourceJson["name"] = resource["name"];

//					message["content"] = "resource:"+resource_id+":"+file+";comment:"+comment+";text:"+text;

					//Console.WriteLine("OnStorageCommentCreated "+comment+" STEP3 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

					messageService.SendMessageAsync(message);
				}
			}
			//Console.WriteLine("OnStorageCommentCreated "+comment+" END "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
		}

		List<string> GetUsersThatHasContact(string contact)
		{
			List<string> users;
			// get all user that need to be informed
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					users = GetUsersThatHasContact(dbcon, transaction, contact);
					transaction.Commit();
				}
			}
			return users;
		}

		List<string> GetUsersThatHasContact(IDbConnection dbcon, IDbTransaction transaction, string contact)
		{
			List<string> users = new List<string>();
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT DISTINCT(user_id) FROM contact WHERE contact_id=@contact";
				dbcmd.Parameters.Add(new SqliteParameter("contact", contact));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read())
						users.Add(reader.GetString(0));
					reader.Close();
				}
			}
			return users;
		}

		public List<string> GetUsersThatKnowResource(string resource)
		{
			List<string> users;
			// get all user that need to be informed
			lock(dbcon) {		
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					users = GetUsersThatKnowResource(dbcon, transaction, resource);
					transaction.Commit();
				}
			}
			return users;
		}

		List<string> GetUsersThatKnowResource(IDbConnection dbcon, IDbTransaction transaction, string resource)
		{
			List<string> users;
			// get user who bookmark this resource
			users = GetUsersWhoBookmarkResource(dbcon, transaction, resource);
			// get the owner of the resource
			bool isPublic = false;
			string owner = null;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT owner_id,public_read FROM resource WHERE id=@resource";
				dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						owner = reader.GetString(0);
						if(!users.Contains(owner))
							users.Add(owner);
						isPublic = (reader.GetInt32(1) == 1);
					}
					reader.Close();
				}
			}
			// if resource is public, add all users that has that owner in their contacts
/*			if(isPublic) {
				List<string> contacts = GetUsersThatHasContact(dbcon, transaction, owner);
				foreach(string contact in contacts)
					if(!users.Contains(contact))
						users.Add(contact);
			}
			// if resource is private, get all users that has rights on it
			else {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT DISTINCT(user_id) FROM right WHERE resource_id=@resource AND read=1";
					dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						while(reader.Read()) {
							string rightUser = reader.GetString(0);
							if(!users.Contains(rightUser))
								users.Add(rightUser);
						}
						reader.Close();
					}
				}
			}*/
			return users;
		}
		
		void OnUserConnected(string user)
		{
			List<string> interestedUsers = GetUsersThatHasContact(user);
			if(interestedUsers.Contains(user))
				interestedUsers.Remove(user);
			JsonValue json = new JsonObject();
			json["event"] = "userconnected";
			json["user"] = user;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				foreach(string iUser in interestedUsers) {
					if(clients.ContainsKey(iUser)) {
						clients[iUser].Broadcast(jsonString);
					}
				}
			}
		}

		void OnUserDisconnected(string user)
		{
			List<string> interestedUsers = GetUsersThatHasContact(user);
			if(interestedUsers.Contains(user))
				interestedUsers.Remove(user);
			JsonValue json = new JsonObject();
			json["event"] = "userdisconnected";
			json["user"] = user;
			string jsonString = json.ToString();
			// signal to the monitoring clients
			lock(instanceLock) {
				foreach(string iUser in interestedUsers) {
					if(clients.ContainsKey(iUser)) {
						clients[iUser].Broadcast(jsonString);
					}
				}
			}
		}

		void OnMessageChanged(JsonValue message)
		{
			JsonValue json = new JsonObject();
			json["event"] = "messagechanged";
			json["message"] = message;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				if(clients.ContainsKey((string)message["destination"])) {
					clients[(string)message["destination"]].Broadcast(jsonString);
				}
			}
		}

		void OnMessageCreated(JsonValue message)
		{
			JsonValue destination = GetUserPrefs((string)message["destination"]);
			JsonValue origin = GetUserPrefs((string)message["origin"]);
			if((destination == null) || (origin == null))
				return;

			JsonValue json = new JsonObject();
			json["event"] = "messagereceived";
			json["message"] = message;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				if(clients.ContainsKey((string)message["destination"])) {
					clients[(string)message["destination"]].Broadcast(jsonString);
				}
			}

			string senderName = null;
			if(((string)origin["firstname"] != null) && ((string)origin["lastname"] != null)) {
				senderName = ((string)origin["firstname"])+" "+((string)origin["lastname"]);
			}
			else if((string)origin["firstname"] != null) {
				senderName = ((string)origin["firstname"]);
			}
			else if((string)origin["lastname"] != null) {
				senderName = ((string)origin["lastname"]);
			}
			else if((string)origin["login"] != null) {
				senderName = ((string)origin["login"]);
			}
			else {
				senderName = "Inconnu";
			}

			if((destination["email"] != null) && ((string)destination["email"] != "")) {
				switch((string)message["type"]) {
				case "message":
					if((bool)destination["email_notify_message_received"])
						SendMail((string)destination["email"], "Nouveau message de "+senderName, "Vous avez reçu le message suivant sur HOST de "+senderName+":\n\n"+message["content"]+"\n\nVous pouvez vous connecter à l'adresse suivante:\n"+url);
					break;
				case "contact":
					if((bool)destination["email_notify_contact_added"])
						SendMail((string)destination["email"], "Nouveau contact", senderName+" vous a ajouté à ses contacts sur HOST.\n\nVous pouvez vous connecter à l'adresse suivante:\n" + url);
					break;
				case "resource":
					if((bool)destination["email_notify_resource_shared"])
						SendMail((string)destination["email"], "Nouvelle ressource de "+senderName, senderName+" vous a partagé la ressource \""+message["content"]["name"]+"\" sur HOST.\n\nVous pouvez vous connecter à l'adresse suivante:\n"+url);
					break;
				case "comment":
					if((bool)destination["email_notify_comment_added"])
						SendMail((string)destination["email"], "Nouveau commentaire de "+senderName,
							senderName+" a laissé le commentaire suivant sur la ressource \""+message["content"]["resource"]["name"]+
							"\" sur HOST:\n\n"+message["content"]["text"]+
							"\n\nVous pouvez vous connecter à l'adresse suivante:\n"+url);
					break;
				}
			}
		}

		public string SmtpServer { get; private set; }
		public string SmtpFrom { get; private set; }

		void SendMail(string to, string subject, string body)
		{
			SmtpClient smtpClient = new SmtpClient(SmtpServer);
			smtpClient.Send(SmtpFrom, to, subject, body);
			smtpClient.Dispose();
		}

		public delegate void ResourceCreatedEventHandler(string resource);
		List<ResourceCreatedEventHandler> resourceCreatedHandlers = new List<ResourceCreatedEventHandler>();
		public event ResourceCreatedEventHandler ResourceCreated {
			add {
				lock(resourceCreatedHandlers) {
					resourceCreatedHandlers.Add(value);
				}
			}
			remove {
				lock(resourceCreatedHandlers) {
					resourceCreatedHandlers.Remove(value);
				}
			}
		}
		void RaisesResourceCreated(string resource)
		{
			List<ResourceCreatedEventHandler> handlers;
			lock(resourceCreatedHandlers) {
				handlers = new List<ResourceCreatedEventHandler>(resourceCreatedHandlers);
			}
			foreach(ResourceCreatedEventHandler handler in handlers) {
				try {
					handler(resource);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On ResourceCreated plugin handler fails ("+e.ToString()+")");
				}
			}
		}

		void OnResourceChanged(string resource)
		{
			List<string> interestedUsers = GetUsersThatKnowResource(resource);
			JsonValue json = new JsonObject();
			json["event"] = "resourcechanged";
			json["resource"] = resource;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				foreach(string iUser in interestedUsers) {
					if(clients.ContainsKey(iUser)) {
						clients[iUser].Broadcast(jsonString);
					}
				}
				if(clients.ContainsKey(resource))
					clients[resource].Broadcast(jsonString);
			}
			RaisesResourceChanged(resource);
		}
	
		public delegate void ResourceChangedEventHandler(string resource);
		List<ResourceChangedEventHandler> resourceChangedHandlers = new List<ResourceChangedEventHandler>();
		public event ResourceChangedEventHandler ResourceChanged {
			add {
				lock(resourceChangedHandlers) {
					resourceChangedHandlers.Add(value);
				}
			}
			remove {
				lock(resourceChangedHandlers) {
					resourceChangedHandlers.Remove(value);
				}
			}
		}
		void RaisesResourceChanged(string resource)
		{
			List<ResourceChangedEventHandler> handlers;
			lock(resourceChangedHandlers) {
				handlers = new List<ResourceChangedEventHandler>(resourceChangedHandlers);
			}
			foreach(ResourceChangedEventHandler handler in handlers) {
				try {
					handler(resource);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On ResourceChanged plugin handler fails ("+e.ToString()+")");
				}
			}
		}


		public delegate void ResourceDeletedEventHandler(string resource);
		List<ResourceDeletedEventHandler> resourceDeletedHandlers = new List<ResourceDeletedEventHandler>();
		public event ResourceDeletedEventHandler ResourceDeleted {
			add {
				lock(resourceDeletedHandlers) {
					resourceDeletedHandlers.Add(value);
				}
			}
			remove {
				lock(resourceDeletedHandlers) {
					resourceDeletedHandlers.Remove(value);
				}
			}
		}
		void RaisesResourceDeleted(string resource)
		{
			List<ResourceDeletedEventHandler> handlers;
			lock(resourceDeletedHandlers) {
				handlers = new List<ResourceDeletedEventHandler>(resourceDeletedHandlers);
			}
			foreach(ResourceDeletedEventHandler handler in handlers) {
				try {
					handler(resource);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On ResourceDeleted plugin handler fails ("+e.ToString()+")");
				}
			}
		}

		/// <summary>
		/// Occurs when user created.
		/// </summary>/

		public delegate void UserCreatedEventHandler(string user);
		List<UserCreatedEventHandler> userCreatedHandlers = new List<UserCreatedEventHandler>();
		public event UserCreatedEventHandler UserCreated {
			add {
				lock(userCreatedHandlers) {
					userCreatedHandlers.Add(value);
				}
			}
			remove {
				lock(userCreatedHandlers) {
					userCreatedHandlers.Remove(value);
				}
			}
		}
		void RaisesUserCreated(string user)
		{
			List<UserCreatedEventHandler> handlers;
			lock(userCreatedHandlers) {
				handlers = new List<UserCreatedEventHandler>(userCreatedHandlers);
			}
			foreach(UserCreatedEventHandler handler in handlers) {
				try {
					handler(user);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On UserCreated plugin handler fails ("+e.ToString()+")");
				}
			}
		}

		void OnUserChanged(string user)
		{
			List<string> interestedUsers = GetUsersThatHasContact(user);
			if(!interestedUsers.Contains(user))
				interestedUsers.Add(user);
			JsonValue json = new JsonObject();
			json["event"] = "userchanged";
			json["user"] = user;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				foreach(string iUser in interestedUsers) {
					if(clients.ContainsKey(iUser)) {
						clients[iUser].Broadcast(jsonString);
					}
				}
			}
			RaisesUserChanged(user);
		}

		void OnUserChangedFor(string user, string forUser)
		{
			JsonValue json = new JsonObject();
			json["event"] = "userchanged";
			json["user"] = user;
			string jsonString = json.ToString();

			// signal to the monitoring clients
			lock(instanceLock) {
				if(clients.ContainsKey(forUser)) {
					clients[forUser].Broadcast(jsonString);
				}
			}
		}

		public delegate void UserChangedEventHandler(string user);
		List<UserChangedEventHandler> userChangedHandlers = new List<UserChangedEventHandler>();
		public event UserChangedEventHandler UserChanged {
			add {
				lock(userChangedHandlers) {
					userChangedHandlers.Add(value);
				}
			}
			remove {
				lock(userChangedHandlers) {
					userChangedHandlers.Remove(value);
				}
			}
		}
		void RaisesUserChanged(string user)
		{
			List<UserChangedEventHandler> handlers;
			lock(userChangedHandlers) {
				handlers = new List<UserChangedEventHandler>(userChangedHandlers);
			}
			foreach(UserChangedEventHandler handler in handlers) {
				try {
					handler(user);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On UserChanged plugin handler fails ("+e.ToString()+")");
				}
			}
		}

		void OnUserDeleted(string user)
		{
			// signal to the monitoring clients
			lock(instanceLock) {
				if(clients.ContainsKey(user)) {
					JsonValue json = new JsonObject();
					json["event"] = "userdeleted";
					json["user"] = user;
					clients[user].Broadcast(json.ToString());
				}
			}
			RaisesUserDeleted(user);
		}

		public delegate void UserDeletedEventHandler(string user);
		List<UserDeletedEventHandler> userDeletedHandlers = new List<UserDeletedEventHandler>();
		public event UserDeletedEventHandler UserDeleted {
			add {
				lock(userDeletedHandlers) {
					userDeletedHandlers.Add(value);
				}
			}
			remove {
				lock(userDeletedHandlers) {
					userDeletedHandlers.Remove(value);
				}
			}
		}
		void RaisesUserDeleted(string user)
		{
			List<UserDeletedEventHandler> handlers;
			lock(userDeletedHandlers) {
				handlers = new List<UserDeletedEventHandler>(userDeletedHandlers);
			}
			foreach(UserDeletedEventHandler handler in handlers) {
				try {
					handler(user);
				}
				catch(Exception e) {
					logger.Log(LogLevel.Error, "On UserDeleted plugin handler fails ("+e.ToString()+")");
				}
			}
		}
		
		JsonArray SearchUsers(string firstname, string lastname, string description, string query, int limit)
		{
			JsonArray users = new JsonArray();

			lock(dbcon) {						
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
							
				// select from the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
						string filter = "";
						if(firstname != null) {
							if(filter != "")
								filter += " AND ";
							filter += "firstname LIKE '%"+firstname.Replace("'","''")+"%'";
						}
						if(lastname != null) {
							if(filter != "")
								filter += " AND ";
							filter += "lastname LIKE '%"+lastname.Replace("'","''")+"%'";
						}
						if(description != null) {
							if(filter != "")
								filter += " AND ";
							filter += "description LIKE '%"+description.Replace("'","''")+"%'";
						}
						if(query != null) {
							string[] words = query.Split(' ', '\t', '\n');
							foreach(string word in words) {
								if(filter != "")
									filter += " AND ";
								filter += "(";
								bool first = true;
								foreach(string field in new string[]{"firstname", "lastname", "description"}) {
									if(first)
										first = false;
									else
										filter += " OR ";
									filter += field+" LIKE '%"+word.Replace("'","''")+"%'";
								}
								filter += ")";
							}
						}				
						if(filter != "")
							filter = "WHERE "+filter;
						dbcmd.CommandText = "SELECT id FROM user "+filter+" LIMIT "+limit;
					
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {	
								users.Add(GetUser(dbcon, transaction, reader.GetString(0), false, null, false));
							}
							// clean up
							reader.Close();
						}
					}
					transaction.Commit();
				}
			}
			return users;
		}

		List<string> GetBookmarks(IDbConnection dbcon, IDbTransaction transaction, string user)
		{
			List<string> bookmarks = new List<string>();
			// get all bookmark
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT DISTINCT(resource_id) FROM bookmark WHERE owner_id=@user ORDER BY position ASC";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read())
						bookmarks.Add(reader.GetString(0));
					reader.Close();
				}
			}
			int position = bookmarks.Count;
			// add user own resources
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE owner_id=@user ORDER BY id ASC";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						string id = reader.GetString(0);
						if(!bookmarks.Contains(id)) {
							bookmarks.Add(id);
							using(IDbCommand dbcmd2 = dbcon.CreateCommand()) {
								dbcmd2.CommandText = 
									"INSERT INTO bookmark (owner_id,resource_id,position) VALUES "+
									"(@user,@resource,@position)";
								dbcmd2.Parameters.Add(new SqliteParameter("user", user));
								dbcmd2.Parameters.Add(new SqliteParameter("resource", id));
								dbcmd2.Parameters.Add(new SqliteParameter("position", position));
								dbcmd2.Transaction = transaction;
								dbcmd2.ExecuteNonQuery();
							}
							position++;
						}
					}
					reader.Close();
				}
			}
			return bookmarks;
		}

		public JsonValue GetRfid(string id)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetRfid(dbcon, transaction, id);
					transaction.Commit();
				}
			}
			return res;
		}

		JsonValue GetRfid(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			JsonValue res = null;
			// get the RFID
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user_id,path FROM rfid WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						res = new JsonObject();
						res["rfid"] = id;
						res["user"] = reader.GetString(0);
						res["path"] = reader.GetString(1);
					}
					reader.Close();
				}
			}
			return res;
		}

		JsonArray GetUserRfids(IDbConnection dbcon, IDbTransaction transaction, string user)
		{
			JsonArray rfids = new JsonArray();
			// get all RFIDs
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,path FROM rfid WHERE user_id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue rfid = new JsonObject();
						rfid["id"] = reader.GetString(0);
						rfid["path"] = reader.GetString(1);
						rfids.Add(rfid);
					}
					reader.Close();
				}
			}
			return rfids;
		}

		public JsonValue GetReader(string id)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetReader(dbcon, transaction, id);
					transaction.Commit();
				}
			}
			return res;
		}

		JsonValue GetReader(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			JsonValue res = null;
			// get the reader
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user_id,name,strftime('%s',ctime),device_id FROM reader WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						res = new JsonObject();
						res["id"] = id;
						res["user"] = reader.GetString(0);
						res["name"] = reader.GetString(1);
						res["ctime"] = Convert.ToInt64(reader.GetString(2));
						if(reader.IsDBNull(3))
							res["device"] = null;
						else
							res["device"] = reader.GetString(3);
					}
					reader.Close();
				}
			}
			return res;
		}

		JsonArray GetUserReaders(IDbConnection dbcon, IDbTransaction transaction, string user)
		{
			JsonArray readers = new JsonArray();
			// get all readers
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,name,strftime('%s',ctime),device_id FROM reader WHERE user_id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue rfidReader = new JsonObject();
						rfidReader["user"] = user;
						rfidReader["id"] = reader.GetString(0);
						rfidReader["name"] = reader.GetString(1);
						rfidReader["ctime"] = Convert.ToInt64(reader.GetString(2));
						if(reader.IsDBNull(3))
							rfidReader["device"] = null;
						else
							rfidReader["device"] = reader.GetString(3);
						readers.Add(rfidReader);
					}
					reader.Close();
				}
			}
			return readers;
		}

		public string CreateReader(string user, JsonValue data)
		{
			string id = null;

			string name = "noname";
			if(data.ContainsKey("name"))
				name = (string)data["name"];
			string device = null;
			if(data.ContainsKey("device"))
				device = (string)data["device"];

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					int count = 0;
					// generate the random reader id
					do {
						string randchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
						Random rand = new Random();
						StringBuilder sb = new StringBuilder();
						for(int i = 0; i < 10; i++)
							sb.Append(randchars[rand.Next(randchars.Length)]);
						id = sb.ToString();
						
						// check if reader already exists
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM reader WHERE id='"+id+"'";
							count = Convert.ToInt32(dbcmd.ExecuteScalar());
						}
					} while(count > 0);

					// insert the reader
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						string sql = "INSERT INTO reader (id,user_id,ctime,name,device_id) VALUES (@id,@user,datetime('now'),@name,@device)";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("name", name));
						dbcmd.Parameters.Add(new SqliteParameter("device", device));
						dbcmd.CommandText = sql;
						if(dbcmd.ExecuteNonQuery() == 0)
							throw new Exception("Reader insert fails");
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
			return id;
		}

		public void ChangeReader(string id, JsonValue diff)
		{
			string name = "noname";
			if(diff.ContainsKey("name"))
				name = (string)diff["name"];

			JsonValue data = GetReader(id);
			string user = (string)data["user"];

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// update the reader
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						string sql = "UPDATE reader SET name=@name WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("name", name));
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.CommandText = sql;
						if(dbcmd.ExecuteNonQuery() == 0)
							throw new Exception("Reader update fails");
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void DeleteReader(string user, string id)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM reader WHERE user_id=@user AND id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteScalar();
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public JsonValue GetDevice(string id)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetDevice(dbcon, transaction, id);
					transaction.Commit();
				}
			}
			return res;
		}

		JsonValue GetDevice(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			JsonValue res = null;
			// get all RFIDs
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user_id,name,strftime('%s',ctime) FROM device WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						res = new JsonObject();
						res["id"] = id;
						res["user"] = reader.GetString(0);
						res["name"] = reader.GetString(1);
						res["ctime"] = Convert.ToInt64(reader.GetString(2));
					}
					reader.Close();
				}
			}
			return res;
		}

		JsonArray GetUserDevices(IDbConnection dbcon, IDbTransaction transaction, string user)
		{
			JsonArray devices = new JsonArray();
			// get all readers
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,name,strftime('%s',ctime) FROM device WHERE user_id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue rfidReader = new JsonObject();
						rfidReader["user"] = user;
						rfidReader["id"] = reader.GetString(0);
						rfidReader["name"] = reader.GetString(1);
						rfidReader["ctime"] = Convert.ToInt64(reader.GetString(2));
						devices.Add(rfidReader);
					}
					reader.Close();
				}
			}
			return devices;
		}

		public string CreateDevice(string user, JsonValue data)
		{
			string id = null;

			string name = "noname";
			if(data.ContainsKey("name"))
				name = (string)data["name"];

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					int count = 0;
					// generate the random reader id
					do {
						string randchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
						Random rand = new Random();
						StringBuilder sb = new StringBuilder();
						for(int i = 0; i < 10; i++)
							sb.Append(randchars[rand.Next(randchars.Length)]);
						id = sb.ToString();
						
						// check if reader already exists
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM device WHERE id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("id", id));
							count = Convert.ToInt32(dbcmd.ExecuteScalar());
						}
					} while(count > 0);

					// insert the device
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "INSERT INTO device (id,user_id,ctime,name) VALUES (@id,@user,datetime('now'),@name)";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("name", name));
						if(dbcmd.ExecuteNonQuery() == 0)
							throw new Exception("Device insert fails");
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
			return id;
		}

		public void ChangeDevice(string id, JsonValue diff)
		{
			string name = "noname";
			if(diff.ContainsKey("name"))
				name = (string)diff["name"];

			JsonValue data = GetDevice(id);
			string user = (string)data["user"];

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// update the reader
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						string sql = "UPDATE device SET name=@name WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("name", name));
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.CommandText = sql;
						if(dbcmd.ExecuteNonQuery() == 0)
							throw new Exception("Device update fails");
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void DeleteDevice(string user, string id)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM device WHERE user_id=@user AND id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteScalar();
					}
					// delete associated readers
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM reader WHERE device_id='"+id.Replace("'","''")+"'";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteScalar();
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void CreateResourceBookmark(string user, string resource)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					CreateResourceBookmark(dbcon, transaction, user, resource);
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		void CreateResourceBookmark(IDbConnection dbcon, IDbTransaction transaction, string user, string resource)
		{
			List<string> bookmarks = GetBookmarks(dbcon, transaction, user);
			if(!bookmarks.Contains(resource)) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "INSERT INTO bookmark (owner_id,resource_id,position) VALUES (@user,@resource,@position)";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
					dbcmd.Parameters.Add(new SqliteParameter("position", bookmarks.Count));
					dbcmd.Transaction = transaction;
					dbcmd.ExecuteNonQuery();
				}
			}
		}
		
		public void DeleteResourceBookmark(string user, string resource)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					DeleteResourceBookmark(dbcon, transaction, user, resource);
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}
		
		void DeleteResourceBookmark(IDbConnection dbcon, IDbTransaction transaction, string user, string resource)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "DELETE FROM bookmark WHERE owner_id=@user AND resource_id=@resource";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
				dbcmd.Transaction = transaction;
				dbcmd.ExecuteNonQuery();
			}
			CleanBookmarksPosition(dbcon, transaction, user);
		}

		public void SetResourceBookmarkPosition(string user, string resource, int position)
		{
			lock(dbcon) {										
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					SetResourceBookmarkPosition(dbcon, transaction, user, resource, position);
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		void SetResourceBookmarkPosition(IDbConnection dbcon, IDbTransaction transaction, string user, string resource, int position)
		{
			List<string> bookmarks = GetBookmarks(dbcon, transaction, user);
			int foundPos = -1;
			for(int i = 0; (foundPos == -1) && (i < bookmarks.Count); i++) {
				if(bookmarks[i] == resource)
					foundPos = i;
			}
			// change the position
			if(foundPos >= 0) {
				bookmarks.RemoveAt(foundPos);
				bookmarks.Insert(Math.Max(Math.Min(position,bookmarks.Count), 0), resource);
				UpdateBookmarks(dbcon, transaction, user, bookmarks);
			}
		}

		public List<string> GetUsersWhoBookmarkResource(string id)
		{
			List<string> users;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					users = GetUsersWhoBookmarkResource(dbcon, transaction, id);
					transaction.Commit();
				}
			}
			return users;
		}

		List<string> GetUsersWhoBookmarkResource(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			List<string> users = new List<string>();
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT DISTINCT(owner_id) FROM bookmark WHERE resource_id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						users.Add(reader.GetString(0));
					}
					reader.Close();
				}
			}
			return users;
		}

		public JsonValue GetResourceFromPath(string path)
		{
			int pos = path.IndexOf(':');
			if (pos == -1)
				return null;
			string type = path.Substring(0, pos);
			string subpath = path.Substring(pos + 1);
			if(subpath.IndexOf ('/') != -1) {
				subpath = subpath.Substring (0, subpath.IndexOf ('/'));
			}

			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					string id = null;
					// search for the corresponding resource
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id FROM resource WHERE type=@type AND data=@subpath";
						dbcmd.Parameters.Add(new SqliteParameter("type", type));
						dbcmd.Parameters.Add(new SqliteParameter("data", subpath));
						dbcmd.Transaction = transaction;
						object resId = dbcmd.ExecuteScalar();
						if(resId == null)
							return null;
						id = Convert.ToString(resId);
					}
					res = GetResource(dbcon, transaction, id, null);
					transaction.Commit();
				}
			}
			return res;
		}

		public JsonValue GetResourceFromStorage(string storage)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// select resource
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id FROM resource WHERE storage_id=@storage";
						dbcmd.Parameters.Add(new SqliteParameter("storage", storage));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							if(reader.Read()) {
								string id = reader.GetString(0);
								res = GetResource(dbcon, transaction, id, null);
							}
							reader.Close();
						}
					}
					transaction.Commit();
				}
			}
			return res;
		}

		public JsonValue GetResource(string id)
		{
			return GetResource(id, null);
		}

		public JsonValue GetResource(string id, string filterUserId)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetResource(dbcon, transaction, id, filterUserId);
					transaction.Commit();
				}
			}
			return res;
		}
		
		JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterUserId)
		{
			//Console.WriteLine("GetResource "+id+" START");
			//DateTime startTime = DateTime.UtcNow;

			JsonValue resource = new JsonObject();
			// select resource
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText =
					"SELECT id,owner_id,type,name,data,strftime('%s',ctime),rev,"+
					"public_read,public_write,public_share,storage_id,preview_file_id,preview_file_rev "+
					"FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						throw new WebException(404, 0, "Resource not found");
					resource["id"] = reader.GetString(0);
					resource["owner_id"] = reader.GetString(1);
					resource["type"] = reader.GetString(2);
					if(reader.IsDBNull(3))
						resource["name"] = null;
					else
						resource["name"] = reader.GetString(3);
					if(reader.IsDBNull(4))
						resource["data"] = null;
					else
						resource["data"] = reader.GetString(4);
					if(reader.IsDBNull(5))
						resource["ctime"] = 0;
					else
						resource["ctime"] = Convert.ToInt64(reader.GetString(5));
					resource["rev"] = reader.GetInt64(6);
					resource["public_read"] = (reader.GetInt64(7) != 0);
					resource["public_write"] = (reader.GetInt64(8) != 0);
					resource["public_share"] = (reader.GetInt64(9) != 0);
					if(reader.IsDBNull(10))
						resource["storage_id"] = null;
					else
						resource["storage_id"] = reader.GetString(10);
					if(reader.IsDBNull(11))
						resource["preview_file_id"] = null;
					else
						resource["preview_file_id"] = reader.GetInt64(11);
					if(reader.IsDBNull(12))
						resource["preview_file_rev"] = null;
					else
						resource["preview_file_rev"] = reader.GetInt64(12);
					reader.Close();
				}
			}
			// select rights
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user_id,read,write,share FROM right WHERE resource_id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					JsonArray rights = new JsonArray();
					resource["rights"] = rights;
					while(reader.Read()) {
						JsonValue right = new JsonObject();
						rights.Add(right);

						right["user_id"] = reader.GetString(0);
						right["read"] = (reader.GetInt64(1) == 0)?false:true;
						right["write"] = (reader.GetInt64(2) == 0)?false:true;
						right["share"] = (reader.GetInt64(3) == 0)?false:true;
					}
					reader.Close();
				}
			}
			// get seenByMeRev
			if(filterUserId != null) {
				long seenRev = -1;
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT seen_rev FROM resource_seen WHERE resource_id=@id AND user_id=@filterUserId";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("filterUserId", filterUserId));
					dbcmd.Transaction = transaction;
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						while(reader.Read()) {
							seenRev = reader.GetInt64(0);
						}
						reader.Close();
					}
				}
				resource["seenByMeRev"] = seenRev;
			}
			// get type specific data
			string type = (string)resource["type"];
			switch(type) {
			case "storage":
				//storageId = storage.CreateStorage(-1);
				//data = storageId;
				break;
			case "picasa":
				picasa.GetPicasa(id, resource);
				// update if last update is older than 300 seconds
				if(((long)resource["utime"] == 0L) || (resource["delta"] >= 300.0))
					picasa.QueueUpdatePicasa(resource);
				break;
			case "podcast":
				podcast.GetPodcast(id, resource);
				// update if last update is older than 300 seconds
				if(((long)resource["utime"] == 0L) || (resource["delta"] >= 300.0))
					podcast.QueueUpdatePodcast(resource);
				break;
			case "news":
				news.GetNews(id, resource);
				// update if last update is older than 300 seconds
				if(((long)resource["utime"] == 0L) || (resource["delta"] >= 300.0))
					news.QueueUpdateNews(resource);
				break;
			}

			//Console.WriteLine("GetResource "+id+" END "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

			return resource;
		}

		public JsonValue GetUserResourceRights(string user, string resource)
		{
			JsonValue res = new JsonObject();

			if(UserIsAdmin(user)) {
				res["admin"] = true;
				res["read"] = true;
				res["write"] = true;
				res["share"] = true;
				res["delete"] = true;
			}
			else {
				JsonValue resourceJson = GetResource(resource);

				bool admin = ((string)resourceJson["owner_id"] == user);
				bool read = admin || (bool)resourceJson["public_read"];
				bool write = admin || (bool)resourceJson["public_write"];
				bool share = admin || (bool)resourceJson["public_share"];
				bool delete = admin;

				foreach(JsonValue right in (JsonArray)resourceJson["rights"]) {
					if((string)right["user_id"] == user) {
						read = read || (bool)right["read"];
						write = write || (bool)right["write"];
						share = share || (bool)right["share"];
					}
				}
				res["admin"] = admin;
				res["read"] = read;
				res["write"] = write;
				res["share"] = share;
				res["delete"] = delete;
			}
			return res;
		}

		public JsonArray GetResources(string user, string filterUserId)
		{
			JsonArray res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetResources(dbcon, transaction, user, filterUserId);
					transaction.Commit();
				}
			}
			return res;
		}

		JsonArray GetResources(IDbConnection dbcon, IDbTransaction transaction, string user, string filterUserId)
		{
			JsonArray resources = new JsonArray();
			// select resources
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				// no user filter
				if((filterUserId == null) || (filterUserId == user)) {
					dbcmd.CommandText = "SELECT id FROM resource WHERE owner_id=@user";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
				}
				// filter to get only what a given user can see
				else {
					dbcmd.CommandText = 
						"SELECT DISTINCT(resource.id) FROM resource "+
						"LEFT JOIN right WHERE "+
						// resources owned by the given user
						"resource.owner_id=@user AND ("+
						// resources shared with the filter user
						"(resource.id=right.resource_id AND right.user_id=@filterUserId) OR "+
						// public resource
						"(resource.public_read=1 OR resource.public_write=1 OR resource.public_share=1))";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					dbcmd.Parameters.Add(new SqliteParameter("filterUserId", filterUserId));
				}
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						string resource_id = reader.GetString(0);
						JsonValue resource = GetResource(dbcon, transaction, resource_id, filterUserId);
						resources.Add(resource);
					}
					reader.Close();
				}
			}
			return resources;
		}

		public bool GetIsUserConnected(string id)
		{
			bool res = false;
			lock(instanceLock) {
				if(clients.ContainsKey(id)) {
					foreach(MonitorClient client in clients[id]) {
						if(client.User == id) {
							res = true;
							break;
						}
					}
				}
			}
			return res;
		}

		public JsonValue GetUser(string id)
		{
			return GetUser(id, null);
		}

		public JsonValue GetUser(string id, string filterUserId)
		{
			JsonValue user;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					user = GetUser(dbcon, transaction, id, (filterUserId == null), filterUserId, true);
					// commit the transaction
					transaction.Commit();
				}
			}
			return user;
		}

		public bool UserIsAdmin(string id)
		{
			bool isAdmin = false;
			lock(dbcon) {
				// select from the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT admin FROM user WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					object res = dbcmd.ExecuteScalar();
					if(res != null)
						isAdmin = Convert.ToInt64(res) != 0;
				}
			}
			return isAdmin;
		}

		public JsonValue GetUserPrefs(string id)
		{
			JsonValue user;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					user = GetUserPrefs(dbcon, transaction, id);
					// commit the transaction
					transaction.Commit();
				}
			}
			return user;
		}

		JsonValue GetUserPrefs(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			JsonValue user = new JsonObject();

			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = 
					"SELECT id,firstname,lastname,description,face_rev,"+
					"default_friend,email,email_notify_message_received,email_notify_contact_added,"+
					"email_notify_resource_shared,email_notify_comment_added,login,admin,"+
					"googleid,default_share_right,default_write_right,facebookid FROM user WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						return null;

					user["id"] = reader.GetString(0);
					if(reader.IsDBNull(1))
						user["firstname"] = null;
					else
						user["firstname"] = reader.GetString(1);
					if (reader.IsDBNull(2))
						user["lastname"] = null;
					else
						user["lastname"] = reader.GetString(2);
					if (reader.IsDBNull(3))
						user["description"] = null;
					else
						user["description"] = reader.GetString(3);
					if(reader.IsDBNull(4))
						user["face_rev"] = 0;
					else
						user["face_rev"] = reader.GetInt64(4);
					if(reader.IsDBNull(5))
						user["default_friend"] = false;
					else
						user["default_friend"] = (reader.GetInt64(5) != 0);

					if(reader.IsDBNull(6))
						user["email"] = null;
					else
						user["email"] = reader.GetString(6);
					if(reader.IsDBNull(7))
						user["email_notify_message_received"] = false;
					else
						user["email_notify_message_received"] = (reader.GetInt64(7) != 0);
					if(reader.IsDBNull(8))
						user["email_notify_contact_added"] = false;
					else
						user["email_notify_contact_added"] = (reader.GetInt64(8) != 0);
					if(reader.IsDBNull(9))
						user ["email_notify_resource_shared"] = false;
					else
						user ["email_notify_resource_shared"] = (reader.GetInt64(9) != 0);
					if(reader.IsDBNull(10))
						user["email_notify_comment_added"] = false;
					else
						user["email_notify_comment_added"] = (reader.GetInt64(10) != 0);
					if(reader.IsDBNull(11))
						user["login"] = null;
					else
						user["login"] = reader.GetString(11);
					if(reader.IsDBNull(12))
						user["admin"] = false;
					else
						user["admin"] = (reader.GetInt64(12) != 0);
					if(reader.IsDBNull(13))
						user["googleid"] = null;
					else
						user["googleid"] = reader.GetString(13);
					if(reader.IsDBNull(14))
						user["default_share_right"] = false;
					else
						user["default_share_right"] = (reader.GetInt64(14) != 0);
					if(reader.IsDBNull(15))
						user["default_write_right"] = false;
					else
						user["default_write_right"] = (reader.GetInt64(15) != 0);
					if(reader.IsDBNull(16))
						user["facebookid"] = null;
					else
						user["facebookid"] = reader.GetString(16);
					reader.Close();
				}
			}
			return user;
		}

		JsonValue GetUser(IDbConnection dbcon, IDbTransaction transaction, string id, bool full, string filterUserId, bool resources)
		{
			//Console.WriteLine("GetUser "+id+" START");

			DateTime startTime = DateTime.UtcNow;

			JsonValue user = new JsonObject();

			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = 
					"SELECT id,firstname,lastname,description,face_rev,"+
					"default_friend,email,email_notify_message_received,email_notify_contact_added,"+
					"email_notify_resource_shared,email_notify_comment_added,login,admin,"+
					"googleid,default_share_right,default_write_right,facebookid,data FROM user WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						throw new WebException(404, 0, "User not found");
					
					user["id"] = reader.GetString(0);
					if(reader.IsDBNull(1))
						user["firstname"] = null;
					else
						user["firstname"] = reader.GetString(1);
					if (reader.IsDBNull(2))
						user["lastname"] = null;
					else
						user["lastname"] = reader.GetString(2);
					if (reader.IsDBNull(3))
						user["description"] = null;
					else
						user["description"] = reader.GetString(3);
					if(reader.IsDBNull(4))
						user["face_rev"] = 0;
					else
						user["face_rev"] = reader.GetInt64(4);
					if(reader.IsDBNull(5))
						user["default_friend"] = false;
					else
						user["default_friend"] = (reader.GetInt64(5) != 0);

					//Console.WriteLine("GetUser "+id+" STEP1 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

					user["online"] = GetIsUserConnected(id);

					//Console.WriteLine("GetUser "+id+" STEP2 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

					if(full) {
						if(reader.IsDBNull(6))
							user["email"] = null;
						else
							user["email"] = reader.GetString(6);
						if(reader.IsDBNull(7))
							user["email_notify_message_received"] = false;
						else
							user["email_notify_message_received"] = (reader.GetInt64(7) != 0);
						if(reader.IsDBNull(8))
							user["email_notify_contact_added"] = false;
						else
							user["email_notify_contact_added"] = (reader.GetInt64(8) != 0);
						if(reader.IsDBNull(9))
							user ["email_notify_resource_shared"] = false;
						else
							user ["email_notify_resource_shared"] = (reader.GetInt64(9) != 0);
						if(reader.IsDBNull(10))
							user["email_notify_comment_added"] = false;
						else
							user["email_notify_comment_added"] = (reader.GetInt64(10) != 0);
						if(reader.IsDBNull(11))
							user["login"] = null;
						else
							user["login"] = reader.GetString(11);
						if(reader.IsDBNull(12))
							user["admin"] = false;
						else
							user["admin"] = (reader.GetInt64(12) != 0);
						if(reader.IsDBNull(13))
							user["googleid"] = null;
						else
							user["googleid"] = reader.GetString(13);
						if(reader.IsDBNull(14))
							user["default_share_right"] = false;
						else
							user["default_share_right"] = (reader.GetInt64(14) != 0);
						if(reader.IsDBNull(15))
							user["default_write_right"] = false;
						else
							user["default_write_right"] = (reader.GetInt64(15) != 0);
						if(reader.IsDBNull(16))
							user["facebookid"] = null;
						else
							user["facebookid"] = reader.GetString(16);

						if(reader.IsDBNull(17))
							user["data"] = null;
						else
							user["data"] = JsonValue.Parse(reader.GetString(17));
					}
					reader.Close();
				}
			}
			//Console.WriteLine("GetUser "+id+" STEP3 "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
			if(full) {
				// select contacts
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT id,contact_id FROM contact WHERE user_id=@id ORDER BY position ASC";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Transaction = transaction;
					int position = 0;
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						JsonArray contacts = new JsonArray();
						user["contacts"] = contacts;
						while(reader.Read()) {
							JsonValue contact = GetUser(dbcon, transaction, reader.GetString(1), false, id, false);
							contact["position"] = position++;
							contacts.Add(contact);
						}
						reader.Close();
					}
				}

				//Console.WriteLine("GetUser "+id+" STEP4F "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");

				// select bookmarks
				List<string> bookmarkIds = GetBookmarks(dbcon, transaction, id);
				JsonArray bookmarks = new JsonArray();
				for(int i = 0; i < bookmarkIds.Count; i++) {
					JsonValue bookmark = new JsonObject();
					bookmark["resource"] = bookmarkIds[i];
					bookmark["position"] = i;
					bookmarks.Add(bookmark);
				}
				user["bookmarks"] = bookmarks;

				// select user owned resources
				user["resources"] = GetResources(dbcon, transaction, id, id);

				// select user owned RFIDs
				user["rfids"] = GetUserRfids(dbcon, transaction, id);

				// select user owned devices
				user["devices"] = GetUserDevices(dbcon, transaction, id);

				// select user owned readers
				user["readers"] = GetUserReaders(dbcon, transaction, id);
			}
			else {
				//Console.WriteLine("GetUser "+id+" STEP4S "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
				if(resources)
					user["resources"] = GetResources(dbcon, transaction, id, filterUserId);
			}
			//Console.WriteLine("GetUser "+id+" END "+((DateTime.UtcNow-startTime).TotalMilliseconds)+" ms");
			return user;
		}
		
		string CreateResource(string user, JsonValue resource)
		{
			string type = (string)resource["type"];
			switch(type) {
			case "site":
			case "calendar":
			case "weather":
			case "radio":
				break;
			case "storage":
				resource["storage_id"] = storage.CreateStorage(-1);
				break;
			case "picasa":
				picasa.CreatePicasa(resource);
				break;
			case "podcast":
				podcast.CreatePodcast(resource);
				break;
			case "news":
				news.CreateNews(resource);
				break;
			default:
				throw new WebException(400, 0, "Resource type "+type+" not supported");
			}

			string name = (string)resource["name"];
			string storageId = null;
			if(resource.ContainsKey("storage_id"))
				storageId = (string)resource["storage_id"];
			string data = null;
			if(resource.ContainsKey("data"))
				data = (string)resource["data"];
						
			string id = null;
			lock(dbcon) {										
			using(IDbTransaction transaction = dbcon.BeginTransaction()) {
				int count = 0;
				// generate the random resource id
				do {
					id = GenerateRandomId();
					// check if resource id already exists
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT COUNT(id) FROM resource WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						count = Convert.ToInt32(dbcmd.ExecuteScalar());
					}
				} while(count > 0);

				// create the resource
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = 
						"INSERT INTO resource (id,owner_id,type,name,data,ctime,rev,storage_id) VALUES "+
						"(@id,@user,@type,@name,@data,datetime('now'),0,@storageId)";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					dbcmd.Parameters.Add(new SqliteParameter("type", type));
					dbcmd.Parameters.Add(new SqliteParameter("name", name));
					dbcmd.Parameters.Add(new SqliteParameter("data", data));
					dbcmd.Parameters.Add(new SqliteParameter("storageId", storageId));

					if(dbcmd.ExecuteNonQuery() == 0)
						throw new Exception("Resource insert fails");
				}
				transaction.Commit();
			}
			}
			RaisesResourceCreated(id);
			OnUserChanged(user);
			
			return id;
		}

		public string GetUserFromLoginPassword(string login, string password)
		{
			string foundPassword = null;
			string user = null;
			lock(dbcon) {
				// select from the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT id,password FROM user WHERE login=@login";
					dbcmd.Parameters.Add(new SqliteParameter("login", login));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						if(reader.Read()) {
							user = reader.GetString(0);
							if(!reader.IsDBNull(1)) {
								foundPassword = reader.GetString(1);
							}
						}
						reader.Close ();
					}
				}
			}
			bool passwordGood = false;
			if(foundPassword != null) {
				int pos = foundPassword.IndexOf(':');
				if(pos == -1)
					passwordGood = (password == foundPassword);
				else {
					string method = foundPassword.Substring(0, pos);
					string subPassword = foundPassword.Substring(pos+1);
					if(method == "clear")
						passwordGood = (password == subPassword);
					else if(method == "sha1") {
						System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
						string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(password)));
						passwordGood = (sha1Password == subPassword);
					}
				}
			}
			if(passwordGood)
				return user;
			else
				return null;
		}

		public void ChangeResource(string resource, JsonValue diff, string seenBy)
		{
			List<string> interestedUsersBefore = null;
			bool first = true;

			JsonValue oldResource = null;
			JsonValue resourceJson = null;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					oldResource = GetResource(dbcon, transaction, resource, seenBy);

					string type = oldResource["type"];
					switch(type) {
					case "picasa": 
						picasa.ChangePicasa(resource, oldResource, diff);
						break;
					case "podcast": 
						podcast.ChangePodcast(resource, oldResource, diff);
						break;
					case "news": 
						news.ChangeNews(resource, oldResource, diff);
						break;
					}

					// if we change the public right, keep all user interested before
					if(diff.ContainsKey("public_read"))
						interestedUsersBefore = GetUsersThatKnowResource(resource);

					// update the resource table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						StringBuilder sb = new StringBuilder();
						// handle strings
						foreach(string key in new string[]{ "name", "data", "rev" }) {
							if(diff.ContainsKey(key)) {
								if(first)
									first = false;
								else
									sb.Append(",");
								sb.Append(key); sb.Append("=@"); sb.Append(key);
								dbcmd.Parameters.Add(new SqliteParameter(key, (string)diff[key]));
							}
						}
	
						// handle integer
						foreach(string key in new string[]{ "rev", "preview_file_id", "preview_file_rev" }) {
							if(diff.ContainsKey(key)) {
								if(first)
									first = false;
								else
									sb.Append(",");
								sb.Append(key); sb.Append("=@"); sb.Append(key);
								dbcmd.Parameters.Add(new SqliteParameter(key, (long)diff[key]));
							}
						}
						// handle booleans
						foreach(string key in new string[]{ "public_read","public_write","public_share" }) {
							if(diff.ContainsKey(key)) {
								if(first)
									first = false;
								else
									sb.Append(",");
								sb.Append(key); sb.Append("=@"); sb.Append(key);
								dbcmd.Parameters.Add(new SqliteParameter(key, ((bool)diff[key])?1:0));
							}
						}

						dbcmd.CommandText = "UPDATE resource SET "+sb.ToString()+" WHERE id=@resource";
						dbcmd.Parameters.Add(new SqliteParameter("resource", resource));

						// if something to change
						if(!first) {
							int count = dbcmd.ExecuteNonQuery();
							if(count != 1)
								throw new Exception("Resource update fails");
						}
						resourceJson = GetResource(resource);
					}
					// handle seenByMeRev
					if(diff.ContainsKey("seenByMeRev") && (seenBy != null)) {
						long seenByMeRev = Convert.ToInt64((double)diff["seenByMeRev"]);
						MarkResourceSeen(dbcon, transaction, resource, seenBy, seenByMeRev);
					}
					transaction.Commit();
				}
			}
			// notify only if a change (other than seenByMeRev) was done
			if(!first) {
				// if public right change, find users that lost their "interest"
				if(interestedUsersBefore != null) {
					List<string> interestedUsersAfter = GetUsersThatKnowResource(resource);
					foreach(string user in interestedUsersBefore) {
						if(!interestedUsersAfter.Contains(user)) {
							OnUserChangedFor(resourceJson["owner_id"], user);
						}
					}
					foreach(string user in interestedUsersAfter) {
						if(!interestedUsersBefore.Contains(user)) {
							OnUserChangedFor(resourceJson["owner_id"], user);
						}
					}
				}
				OnResourceChanged(resource);
			}
		}

		public void MarkResourceSeen(string resource, string user, long rev)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					MarkResourceSeen(dbcon, transaction, resource, user, rev);
					transaction.Commit();
				}
			}
		}

		void MarkResourceSeen(IDbConnection dbcon, IDbTransaction transaction, string resource, string user, long rev)
		{
			// delete old rev seen
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM resource_seen WHERE resource_id=@resource AND user_id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.ExecuteNonQuery();
			}
			// create the new one
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO resource_seen (resource_id,user_id,seen_rev) VALUES (@resource,@user,@rev)";
				dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Parameters.Add(new SqliteParameter("rev", rev));
				dbcmd.ExecuteNonQuery();
			}
		}

		public void DeleteResource(string id)
		{
			JsonValue resource;
			List<string> users;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					resource = GetResource(dbcon, transaction, id, null);
					users = GetUsersWhoBookmarkResource(dbcon, transaction, id);

					// delete the resource
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM resource WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						if(dbcmd.ExecuteNonQuery() == 0)
							throw new WebException(404, 0, "Resource not found");
					}

					// delete the resource seen
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM resource_seen WHERE resource_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
			
					// delete rights for remove resources
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM right WHERE resource_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
			
					// delete bookmarks
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM bookmark WHERE resource_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}

					// update the position where the bookmark was removed
					foreach(string user in users)
						CleanBookmarksPosition(dbcon, transaction, user);

					transaction.Commit();
				}
			}

			// delete attached storage if any
			if(resource.ContainsKey("storage_id") && (resource["storage_id"] != null))
				storage.DeleteStorage((string)resource["storage_id"]);

			RaisesResourceDeleted(id);

			string owner = (string)resource["owner_id"];
			if(!users.Contains(owner))
				users.Add(owner);
			foreach(string user in users)
				OnUserChanged(user);
		}

		void UpdateBookmarks(IDbConnection dbcon, IDbTransaction transaction, string user, List<string> bookmarks)
		{
			// delete old bookmarks
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM bookmark WHERE owner_id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.ExecuteNonQuery();
			}
			// create new bookmarks with positions
			for(int i = 0; i < bookmarks.Count; i++) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO bookmark (owner_id,resource_id,position) VALUES (@user,@resource,@position)";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					dbcmd.Parameters.Add(new SqliteParameter("resource", bookmarks[i]));
					dbcmd.Parameters.Add(new SqliteParameter("position", i));
					dbcmd.ExecuteNonQuery();
				}
			}
		}

		void CleanBookmarksPosition(IDbConnection dbcon, IDbTransaction transaction, string user)
		{

			UpdateBookmarks(dbcon, transaction, user, GetBookmarks(dbcon, transaction, user));
		}
		
		public void DeleteUser(string id)
		{
			List<string> storages = new List<string>();
			List<string> contacts = new List<string>();
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					
					// delete user
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM user WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						if(dbcmd.ExecuteNonQuery() <= 0) 
							throw new WebException(404, 0, "User "+id+" does not exists");
					}

					// get all users who set this one as a contact
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT DISTINCT(user_id) FROM contact WHERE contact_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read())
								contacts.Add(reader.GetString(0));
						}
					}

					// delete contacts
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM contact WHERE user_id=@id OR contact_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
				
					// delete rights
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM right WHERE user_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					
					// get attached storages
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT storage_id FROM resource WHERE owner_id=@id AND storage_id IS NOT NULL";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read())
								storages.Add(reader.GetString(0));
							reader.Close();
						}
					}
					// delete rights for remove resources
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM right WHERE resource_id IN (SELECT id FROM resource WHERE resource.owner_id=@id)";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					
					// delete resources
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM resource WHERE owner_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					
					// delete bookmarks
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM bookmark WHERE owner_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
				
					// commit the transaction
					transaction.Commit();
				}
			}
			// delete attached storages
			foreach(string storage_id in storages)
				storage.DeleteStorage(storage_id);

			foreach(string contact in contacts)
				OnUserChanged(contact);

			OnUserDeleted(id);
		}
		
		bool IsPasswordSecure(string password)
		{
			if(password.Length < 8)
				return false;
			bool hasNumber = false;
			bool hasLetter = false;
			for(int i = 0; i < password.Length; i++) {
				char character = password[i];
				if(Char.IsDigit(character))
					hasNumber = true;
				if(Char.IsLetter(character))
					hasLetter = true;
			}
			return hasNumber && hasLetter;
		}

		bool IsEmailValid(string email)
		{
			try {
				new System.Net.Mail.MailAddress(email);
				return true;
			}
			catch {
				return false;
			}
		}
		
		public string CreateUser(JsonValue data)
		{
			string user = null;
			bool first = true;
			StringBuilder sbKeys = new StringBuilder();
			StringBuilder sbValues = new StringBuilder();

			if(data.ContainsKey("login") && (data["login"] != null)) {
				// a password must be given if a login is given
				if(!data.ContainsKey("password") || (data["password"] == null))
					throw new WebException(400, 0, "a password MUST be provided when a login is created");
				// test if password is secure enought
				if(!IsPasswordSecure((string)data["password"]))
					throw new WebException(403, 1, "password is too weak, provide another password");
				// ok, use SHA1 to not store the password in the DB
				System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
				string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes((string)data["password"])));
				data["password"] = "sha1:"+sha1Password;
			}

			if(data.ContainsKey("email")) {
				// empty email is like null
				if((string)data["email"] == "")
					data["email"] = null;
				else if(((string)data["email"] != null) && !IsEmailValid((string)data["email"]))
					throw new WebException(403, 2, "email is not valid. Provide another one");
			}

			foreach(string key in new string[]{ "firstname", "lastname", "description", "email", "login",
				"password", "googleid", "facebookid" }) {
				if(data.ContainsKey(key) && (data[key] != null)) {
					if(first)
						first = false;
					else {
						sbKeys.Append(",");
						sbValues.Append(",");
					}
					sbKeys.Append(key);
					sbValues.Append("'");
					sbValues.Append(((string)data[key]).Replace("'","''"));
					sbValues.Append("'");
				}
			}
			// handle booleans
			foreach(string key in new string[]{ "email_notify_message_received","email_notify_contact_added","email_notify_resource_shared","email_notify_comment_added","default_share_right","default_write_right" }) {
				if(data.ContainsKey(key) && (data[key] != null)) {
					if(first)
						first = false;
					else {
						sbKeys.Append(",");
						sbValues.Append(",");
					}
					sbKeys.Append(key);
					sbValues.Append(((bool)data[key])?1:0);
				}
			}
			if(data.ContainsKey("admin")) {
				if(first)
					first = false;
				else {
					sbKeys.Append(",");
					sbValues.Append(",");
				}
				sbKeys.Append("admin");
				sbValues.Append(((bool)data["admin"])?0:1);
			}

			lock(dbcon) {										
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					int count = 0;
					// generate the random session id
					do {
						user = GenerateRandomId();
						// check if resource id already exists
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("id", user));
							count = Convert.ToInt32(dbcmd.ExecuteScalar());
						}
					} while(count > 0);

					// check if the login is already used
					if(data.ContainsKey("login") && (data["login"] != null)) {
						string login = (string)data["login"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login=@login";
							dbcmd.Parameters.Add(new SqliteParameter("login", login));
							if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
								throw new WebException(409, 2, "login already used, choose another one");
						}
					}

					// check if the googleid is already used
					if(data.ContainsKey("googleid") && (data["googleid"] != null)) {
						string googleid = (string)data["googleid"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE googleid=@googleid";
							dbcmd.Parameters.Add(new SqliteParameter("googleid", googleid));
							if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
								throw new WebException(409, 3, "googleid already used");
						}
					}

					// check if the facebookid is already used
					if(data.ContainsKey("facebookid") && (data["facebookid"] != null)) {
						string facebookid = (string)data["facebookid"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE facebookid=@facebookid";
							dbcmd.Parameters.Add(new SqliteParameter("facebookid", facebookid));
							if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
								throw new WebException(409, 3, "facebookid already used");
						}
					}

					// insert into user table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "INSERT INTO user (id,"+sbKeys.ToString()+",create_date) VALUES (@id,"+sbValues.ToString()+",DATETIME('now'))";
						dbcmd.Parameters.Add(new SqliteParameter("id", user));
						if(dbcmd.ExecuteNonQuery() != 1)
							throw new Exception("User create fails");
					}

					// get default friends and insert them
					List<string> friends = new List<string>();
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT DISTINCT(id) from user WHERE default_friend=1";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read())
								friends.Add(reader.GetString(0));
							reader.Close();
						}
					}
					if(friends.Count > 0) {
						foreach(string friend in friends) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "INSERT INTO contact (user_id,contact_id) VALUES (@user,@friend)";
								dbcmd.Parameters.Add(new SqliteParameter("user", user));
								dbcmd.Parameters.Add(new SqliteParameter("friend", friend));
								dbcmd.ExecuteNonQuery();
							}
						}
					}

					// if first created user, set the admin flags
					if(isNewDatabase) {
						bool needAdmin = false;
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user";
							needAdmin = (Convert.ToInt64(dbcmd.ExecuteScalar()) == 1);
						}
						if(needAdmin) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "UPDATE user SET admin=1 WHERE id=@user";
								dbcmd.Parameters.Add(new SqliteParameter("user", user));
								dbcmd.ExecuteNonQuery();
							}
							isNewDatabase = false;
						}
					}

					// commit the transaction
					transaction.Commit();
				}
			}
			RaisesUserCreated(user);

			return user;
		}
		
		public void ChangeUser(string user, JsonValue diff)
		{			
			bool first = true;
			StringBuilder sb = new StringBuilder();

			// nothing to do if the diff is empty
			if(diff.Keys.Count == 0)
				return;

			if(diff.ContainsKey("password") && (diff["password"] != null)) {
				// test if password is secure enought
				if(!IsPasswordSecure((string)diff["password"]))
					throw new WebException(403, 1, "password is too weak, provide another password");
				// ok, use SHA1 to not store the password in the DB
				System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
				string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes((string)diff["password"])));
				diff["password"] = "sha1:" + sha1Password;
			}

			if(diff.ContainsKey("email")) {
				// empty email is like null
				if((string)diff["email"] == "")
					diff["email"] = null;
				else if(((string)diff["email"] != null) && !IsEmailValid((string)diff["email"]))
					throw new WebException(403, 2, "email is not valid. Provide another one");
			}

			// handle strings
			foreach(string key in new string[]{ "firstname", "lastname", "description", "email", "login",
				"password", "googleid", "facebookid" }) {
				if(diff.ContainsKey(key)) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append(key);
					sb.Append("=");
					string value = (string)diff[key];
					if(value == null)
						sb.Append("null");
					else {
						sb.Append("'");
						sb.Append(value.Replace("'","''"));
						sb.Append("'");
					}
				}
			}
			
			// handle booleans
			foreach(string key in new string[]{ "email_notify_message_received","email_notify_contact_added","email_notify_resource_shared","email_notify_comment_added","default_friend","default_share_right","default_write_right" }) {
				if(diff.ContainsKey(key)) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append(key);
					sb.Append("=");
					sb.Append(((bool)diff[key])?1:0);
				}
			}
			// handle admin			
			if(diff.ContainsKey("admin")) {
				if(first)
					first = false;
				else
					sb.Append(",");
				sb.Append("admin");
				sb.Append("=");
				sb.Append(((bool)diff["admin"])?1:0);
			}
			// handle data
			if(diff.ContainsKey("data")) {
				if(first)
					first = false;
				else
					sb.Append(",");
				sb.Append("data");
				sb.Append("=");
				string value = diff["data"].ToString();
				if(value == null)
					sb.Append("null");
				else {
					sb.Append("'");
					sb.Append(value.Replace("'","''"));
					sb.Append("'");
				}
			}

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
				
					// check if the login is already used
					if(diff.ContainsKey("login") && (diff["login"] != null)) {
						string login = (string)diff["login"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login=@login AND id != @user";
							dbcmd.Parameters.Add(new SqliteParameter("login", login));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							int count = Convert.ToInt32(dbcmd.ExecuteScalar());
							if(count >= 1)
								throw new WebException(409, 0, "login already used, choose another one");
						}
					}
					
					// check if the googleid is already used
					if(diff.ContainsKey("googleid") && (diff["googleid"] != null)) {
						string googleid = (string)diff["googleid"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE googleid=@googleid";
							dbcmd.Parameters.Add(new SqliteParameter("googleid", googleid));
							int count = Convert.ToInt32(dbcmd.ExecuteScalar());
							if(count >= 1)
								throw new WebException(409, 3, "googleid already used");
						}
					}

					// check if the facebookid is already used
					if(diff.ContainsKey("facebookid") && (diff["facebookid"] != null)) {
						string facebookid = (string)diff["facebookid"];
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE facebookid=@facebookid";
							dbcmd.Parameters.Add(new SqliteParameter("facebookid", facebookid));
							int count = Convert.ToInt32(dbcmd.ExecuteScalar());
							if(count >= 1)
								throw new WebException(409, 3, "facebookid already used");
						}
					}
				
					// update the user table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "UPDATE user SET "+sb.ToString()+" WHERE id=@user";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						int count = dbcmd.ExecuteNonQuery();
						if(count != 1)
							throw new Exception("User update fails");
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void AddContacts(string user, JsonArray contacts)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					List<string> currentContacts = new List<string>();
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT contact_id FROM contact WHERE user_id=@user ORDER BY position ASC";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						int i = 0;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								string id = reader.GetString(0);
								currentContacts.Add(id);
								i++;
							}
						}
					}

					foreach(JsonValue contact in contacts) {
						string contactId = (string)contact["id"];
						// check if contact is not the user himself. Refuse this case
						if(user == contactId)
							continue;
						// if contact not found, insert
						if(!currentContacts.Contains(contactId)) {
							using (IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "INSERT INTO contact (user_id,contact_id) VALUES (@user,@contactId)";
								dbcmd.Parameters.Add(new SqliteParameter("user", user));
								dbcmd.Parameters.Add(new SqliteParameter("contactId", contactId));
								dbcmd.ExecuteNonQuery();
							}
							int position = currentContacts.Count;
							if(contact.ContainsKey("position"))
								position = Math.Max(Math.Min((int)contact["position"],contacts.Count), 0);
							currentContacts.Insert(position, contactId);
						}
					}
					// update positions
					for(int i = 0; i < currentContacts.Count; i++) {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "UPDATE contact SET position=@position WHERE contact_id=@contact AND user_id=@user";
							dbcmd.Parameters.Add(new SqliteParameter("position", i));
							dbcmd.Parameters.Add(new SqliteParameter("contact", currentContacts[i]));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.ExecuteNonQuery();
						}
					}
					transaction.Commit();
				}
			}

			OnUserChanged(user);

			foreach(JsonValue contact in contacts) {
				JsonValue message = new JsonObject();
				message["type"] = "contact";
				message["origin"] = user;
				message["destination"] = contact["id"];
				message["content"] = user;
				messageService.SendMessageAsync(message);
			}
		}

		public void ChangeContact(string user, string contact, JsonValue diff)
		{
			if(diff.ContainsKey("position")) {
				int position = (int)diff["position"];
				lock(dbcon) {
					using(IDbTransaction transaction = dbcon.BeginTransaction()) {
						List<string> contacts = new List<string>();
						int foundPos = -1;
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT contact_id FROM contact WHERE user_id=@user ORDER BY position ASC";
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							int i = 0;
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {
									string id = reader.GetString(0);
									if(id == contact)
										foundPos = i;
									contacts.Add(id);
									i++;
								}
							}
						}
						// change the position
						if(foundPos != -1) {
							contacts.RemoveAt(foundPos);
							contacts.Insert(Math.Max(Math.Min(position,contacts.Count), 0), contact);

							for(int i = 0; i < contacts.Count; i++) {
								using(IDbCommand dbcmd = dbcon.CreateCommand()) {
									dbcmd.Transaction = transaction;
									dbcmd.CommandText = "UPDATE contact SET position=@position WHERE contact_id=@contact AND user_id=@user";
									dbcmd.Parameters.Add(new SqliteParameter("position", i));
									dbcmd.Parameters.Add(new SqliteParameter("contact", contacts[i]));
									dbcmd.Parameters.Add(new SqliteParameter("user", user));
									dbcmd.ExecuteNonQuery();
								}
							}
						}
						transaction.Commit ();
					}
				}
			}
			OnUserChanged(user);
		}

		public void DeleteContacts(string user, List<string> contacts)
		{
			bool first = true;
			StringBuilder sb = new StringBuilder();
			foreach(string contact in contacts) {
				if(first)
					first = false;
				else
					sb.Append(",");
				sb.Append("'");
				sb.Append(contact.Replace("'", "''"));
				sb.Append("'");
			}
			if(first)
				return;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// delete contacts
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM contact WHERE user_id=@user AND contact_id IN ("+sb.ToString()+")";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.ExecuteNonQuery();
					}
					// get all contacts
					contacts = new List<string>();
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT contact_id FROM contact WHERE user_id=@user ORDER BY position ASC";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read())
								contacts.Add(reader.GetString(0));
						}
					}
					// change the positions
					for(int i = 0; i < contacts.Count; i++) {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "UPDATE contact SET position=@position WHERE contact_id=@contact AND user_id=@user";
							dbcmd.Parameters.Add(new SqliteParameter("position", i));
							dbcmd.Parameters.Add(new SqliteParameter("contact", contacts[i]));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.ExecuteNonQuery();
						}
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public JsonValue AddUserResourceRights(string resourceId, JsonValue rights)
		{
			string user = (string)rights["user_id"];
			string owner = null;
			List<string> rightUsers = new List<string>();

			string name = null;
			bool found = false;
			bool public_read = false;
			bool read = false;
			bool write = false;
			bool share = false;
			lock(dbcon) {		
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
										
					// get resource owner
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT owner_id,public_read,name FROM resource WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", resourceId));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							if(!reader.Read())
								throw new WebException(404, 0, "Resource not found");
							owner = reader.GetString(0);
							public_read = (reader.GetInt64(1) == 1);
							name = reader.GetString(2);
						}
					}
					// get all users that have a right on it
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT DISTINCT(user_id) FROM right WHERE resource_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", resourceId));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								string rightUser = reader.GetString(0);
								if((rightUser != user) && (rightUser != owner))
									rightUsers.Add(rightUser);
							}
						}
					}

					// get old rights
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT read,write,share FROM right WHERE user_id=@user AND resource_id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("id", resourceId));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								read = (reader.GetInt64(0) == 0)?false:true;
								write = (reader.GetInt64(1) == 0)?false:true;
								share = (reader.GetInt64(2) == 0)?false:true;
								found = true;
							}
						}
					}
					
					// compute new rights
					if(rights.ContainsKey("read"))
						read = (bool)rights["read"];
					if(rights.ContainsKey("write"))
						write = (bool)rights["write"];
					if(rights.ContainsKey("share"))
						share = (bool)rights["share"];

					// delete rights
					if(found) {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.CommandText = "DELETE FROM right WHERE user_id=@user AND resource_id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.Parameters.Add(new SqliteParameter("id", resourceId));
							dbcmd.Transaction = transaction;
							dbcmd.ExecuteNonQuery();
						}
					}
					
					// insert new rights
					if(read || write || share) {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.CommandText =
								"INSERT INTO right (resource_id,user_id,read,write,share) VALUES "+
								"(@id,@user,@read,@write,@share)";
							dbcmd.Parameters.Add(new SqliteParameter("id", resourceId));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.Parameters.Add(new SqliteParameter("read", read?1:0));
							dbcmd.Parameters.Add(new SqliteParameter("write", write?1:0));
							dbcmd.Parameters.Add(new SqliteParameter("share", share?1:0));
							dbcmd.Transaction = transaction;
							dbcmd.ExecuteNonQuery();
						}
					}
					transaction.Commit();
				}
			}

			JsonValue resRights = new JsonObject();
			resRights["user_id"] = user;
			resRights["read"] = read;
			resRights["write"] = write;
			resRights["share"] = share;

			// signal the resource change
			OnResourceChanged(resourceId);

			// if the user has no rights before, this is a new
			// resource for him
			if(!found && !public_read && read) {
				OnUserChangedFor(owner, user);
			}
			// if the user has rights before but no more after this
			// change, the resource was delete for him
			else if(!public_read && !read) {
				OnUserChangedFor(owner, user);
			}

			// send a message to the user to signal the resource share
			if(read || write || share) {
				JsonValue message = new JsonObject();
				message["type"] = "resource";
				message["origin"] = owner;
				message["destination"] = user;

				JsonValue content = new JsonObject();
				message["content"] = content;
				content["id"] = resourceId;
				content["name"] = name;
				messageService.SendMessageAsync(message);
			}

			return resRights;
		}

		public void AddRfids(string user, JsonArray rfids)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					foreach(JsonValue rfid in rfids) {
						// delete old association if found
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "DELETE FROM rfid WHERE user_id=@user AND id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.Parameters.Add(new SqliteParameter("id", (string)rfid["rfid"]));
							dbcmd.ExecuteScalar();
						}
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "INSERT INTO rfid (id,user_id,path) VALUES (@id,@user,@path)";
							dbcmd.Parameters.Add(new SqliteParameter("id", (string)rfid["rfid"]));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
							dbcmd.Parameters.Add(new SqliteParameter("path", (string)rfid["path"]));
							dbcmd.ExecuteNonQuery();
						}
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void DeleteRfid(string user, string id)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// delete old association if found
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM rfid WHERE user_id=@user AND id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteScalar();
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}

		public void SetUserFace(string user, string file) 
		{
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert", file+" -auto-orient -strip -set option:distort:viewport \"%[fx:min(w,h)]x%[fx:min(w,h)]+%[fx:max((w-h)/2,0)]+%[fx:max((h-w)/2,0)]\" -distort SRT 0 +repage -resize 100x100 png:"+basePath+"/faces/"+user);
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			process.WaitForExit();
			process.Dispose();
			// update face revision
			long face_rev;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT face_rev FROM user WHERE id=@user";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						object res = dbcmd.ExecuteScalar();
						face_rev = Convert.ToInt64(res);
					}
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE user SET face_rev=@rev WHERE id=@user";
						dbcmd.Parameters.Add(new SqliteParameter("user", user));
						dbcmd.Parameters.Add(new SqliteParameter("rev", ++face_rev));
						dbcmd.ExecuteNonQuery();
					}
					transaction.Commit();
				}
			}
			OnUserChanged(user);
		}
		
		public long GetUserFaceRev(string user) 
		{
			long face_rev = 0;
			lock(dbcon) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT face_rev FROM user WHERE id=@user";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					object res = dbcmd.ExecuteScalar();
					face_rev = Convert.ToInt64(res);
				}
			}
			return face_rev;
		}
		
		public void SetUserFaceFromUrl(string user, string url) 
		{
			string tmpFile = Path.Combine(temporaryDirectory, Guid.NewGuid().ToString());
			using(FileStream fileStream = File.Create(tmpFile)) {
				// download the image
				using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
					HttpClientResponse response = request.GetResponse();
					response.InputStream.CopyTo(fileStream);
				}
			}
			SetUserFace(user, tmpFile);
			File.Delete(tmpFile);
		}

		public string GetUserFromGoogleId(string googleid)
		{
			string user = null;
			lock(dbcon) {
				// select from the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {								
					dbcmd.CommandText = "SELECT id FROM user WHERE googleid=@googleid";
					dbcmd.Parameters.Add(new SqliteParameter("googleid", googleid));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						if(reader.Read())
							user = reader.GetString(0);
						reader.Close();
					}
				}
			}
			return user;
		}

		public string GetUserFromFacebookId(string facebookid)
		{
			string user = null;
			lock(dbcon) {
				// select from the user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {								
					dbcmd.CommandText = "SELECT id FROM user WHERE facebookid=@facebookid";
					dbcmd.Parameters.Add(new SqliteParameter("facebookid", facebookid));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						if(reader.Read())
							user = reader.GetString(0);
						reader.Close();
					}
				}
			}
			return user;
		}

		public void EnsureIsAuthenticated(HttpContext context)
		{
			if(context.User == null) {
				string authenticatedUser = authSessionService.GetAuthenticatedUser(context);
				if(authenticatedUser == null) {
					// check for HTTP Basic authorization
					if(context.Request.Headers.ContainsKey("authorization")) {
						string[] parts = context.Request.Headers["authorization"].Split(new char[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
						if(parts[0].ToLowerInvariant() == "basic") {
							string authorization = Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]));
							int pos = authorization.IndexOf(':');
							if(pos != -1) {
								string login = authorization.Substring(0, pos);
								string password = authorization.Substring(pos + 1);
								authenticatedUser = GetUserFromLoginPassword(login, password);
								context.User = authenticatedUser;
							}
						}
					}
					if(authenticatedUser == null)
						throw new WebException(401, 0, "Authentication needed");
				}
			}
		}

		public void EnsureCanCreateUser(HttpContext context, JsonValue data)
		{
			// only an admin can create an admin user,
			// else, user creation is free
			if(data.ContainsKey("admin") && ((bool)data["admin"]))
				EnsureIsAdmin(context);
		}

		public void EnsureCanAdminUser(HttpContext context, string user)
		{
			EnsureIsAdmin(context);
		}

		public void EnsureIsAdmin(HttpContext context)
		{
			// need a logged user
			EnsureIsAuthenticated(context);
			// check if the user is an administrator
			if(!UserIsAdmin(context.User))
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		public void EnsureCanDeleteUser(HttpContext context, string userId)
		{
			// need a logged user
			EnsureIsAuthenticated(context);
			// user can remove itself
			if(context.User != userId)
				EnsureIsAdmin(context);
		}

		public void EnsureCanUpdateUser(HttpContext context, string userId)
		{
			// need a logged user
			EnsureIsAuthenticated(context);
			// only the user himself or admins
			if(context.User != userId)
				EnsureIsAdmin(context);
		}

		public void EnsureCanReadShortUser(HttpContext context, string userId, string seenBy)
		{
			// need a logged user
			EnsureIsAuthenticated(context);
			// if seenBy is set
			if(seenBy != null) {
				// only the user himself or admins
				if(context.User != seenBy)
					EnsureIsAdmin(context);
			}
			// allowed to all logged users
		}

		public void EnsureCanReadFullUser(HttpContext context, string userId)
		{
			// need a logged user
			EnsureIsAuthenticated(context);
			// user can view itself
			if(context.User != userId)
				EnsureIsAdmin(context);
		}

		string GenerateRandomId(int size = 10)
		{
			// generate the random id
			string randchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
			Random rand = new Random();
			StringBuilder sb = new StringBuilder(size);
			for(int i = 0; i < size; i++)
				sb.Append(randchars[rand.Next(randchars.Length)]);
			return sb.ToString();
		}

		public bool IsValidId(string id)
		{
			string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";
			for(int i = 0; i < id.Length; i++) {
				bool found = false;
				for(int i2 = 0; !found && (i2 < chars.Length); i2++) {
					found = (chars[i2] == id[i]);
				}
				if(!found)
					return false;
			}
			return true;
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			if(context.Request.IsWebSocketRequest && (parts.Length == 1) && IsValidId(parts[0])) {
				string user = parts[0];
				EnsureCanReadFullUser(context, user);
				// accept the web socket and process it
				await context.AcceptWebSocketRequestAsync(new MonitorClient(this, user));
			}
			// POST /login login
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "login")) {
				JsonValue content = await context.Request.ReadAsJsonAsync();

				string login = (string)content["login"];
				string password = (string)content["password"];

				string user = GetUserFromLoginPassword(login, password);
						
				// password is good
				if(user != null) {
					JsonValue authSession = authSessionService.Create(user);

					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
					context.Response.Headers["set-cookie"] = authCookie+"="+(string)authSession["id"]+"; Path=/";
					authSession["header"] = authHeader;
					context.Response.Content = new JsonContent(authSession);
				}
				else {
					context.Response.StatusCode = 403;
				}
			}
			// GET /[?firstname=firstname][&lastname=lastname][&description=description][&query=words] search
			else if((context.Request.Method == "GET") && (parts.Length == 0)) {

				EnsureIsAuthenticated(context);

				string firstname = null;
				if(context.Request.QueryString.ContainsKey("firstname"))
					firstname = context.Request.QueryString["firstname"];
				string lastname = null;
				if(context.Request.QueryString.ContainsKey("lastname"))
					lastname = context.Request.QueryString["lastname"];
				string description = null;
				if(context.Request.QueryString.ContainsKey("description"))
					description = context.Request.QueryString["description"];
				string query = null;
				if(context.Request.QueryString.ContainsKey("query"))
					query = context.Request.QueryString["query"];
				int limit = 200;
				if(context.Request.QueryString.ContainsKey("limit"))
					limit = Math.Max(0, Math.Min(200, Convert.ToInt32(context.Request.QueryString["limit"])));

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(SearchUsers(firstname, lastname, description, query, limit));
			}
			// GET /[user][?seenby=user] get the user
			else if((context.Request.Method == "GET") && (parts.Length == 1) && IsValidId(parts[0])) {
				string user = parts[0];
				string seenBy = null;
				// do we filter for a given user ?
				if(context.Request.QueryString.ContainsKey("seenBy")) {
					seenBy = context.Request.QueryString["seenBy"];
					// test rights
					EnsureCanReadShortUser(context, user, seenBy);
				}
				else {
					// test rights
					EnsureCanReadFullUser(context, user);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetUser(user, seenBy));
			}
			// GET /[user]/face get the face
			else if((context.Request.Method == "GET") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "face")) {

				EnsureIsAuthenticated(context);

				string user = parts[0];
				if(File.Exists(basePath+"/faces/"+user)) {
					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "max-age="+cacheDuration;
					context.Response.Headers["content-type"] = "image/png";
					context.Response.Content = new FileContent(basePath+"/faces/"+user);
				}
				else {
					context.Response.StatusCode = 200;
					context.Response.Headers["content-type"] = "image/png";
					context.Response.Headers["cache-control"] = "max-age="+cacheDuration;
					context.Response.Content = new FileContent(staticPath+"/default.png");
				}
			}
			// POST / create a user
			else if((context.Request.Method == "POST") && (parts.Length == 0)) {
				// test rights
				JsonValue json = await context.Request.ReadAsJsonAsync();

				EnsureCanCreateUser(context, json);

				string user = CreateUser(json);
									
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetUser(user, null));
			}
			// POST /[user]/face upload the user face
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "face") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				string faceFile = null;
				if(context.Request.Headers["content-type"].StartsWith("multipart/form-data")) {
					MultipartReader reader = context.Request.ReadAsMultipart();
					MultipartPart part;
					while((part = reader.ReadPart()) != null) {
						// the file content
						if(part.Headers.ContentDisposition["name"] == "file") {
							faceFile = Path.Combine(temporaryDirectory, Guid.NewGuid().ToString());
							using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
								part.Stream.CopyTo(fileStream);
							}
						}
					}
				}
				else {
					faceFile = Path.Combine(temporaryDirectory, Guid.NewGuid().ToString());
					using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
						context.Request.InputStream.CopyTo(fileStream);
					}
				}
				if(faceFile != null)
					SetUserFace(user, faceFile);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetUser(user, null));
			}
			// PUT /[user] change user
			else if((context.Request.Method == "PUT") && (parts.Length == 1) && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeUser(user, json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetUser(user, null));
			}
			// POST /[user]/resources create a resource for a given user
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "resources") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				string resource = CreateResource(user, json);
					
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(resource));
			}
			// DELETE /[user id]/contacts/[contact id] delete a contact
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "contacts") && IsValidId(parts[0]) && IsValidId(parts[2])) {
				string user = parts[0];
				string contact = parts[2];
				// test rights
				EnsureCanUpdateUser(context, user);

				DeleteContacts(user, new List<string> () { contact });
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[user id]/contacts add a contact
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "contacts") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				if(json is JsonArray) {
					AddContacts(user, (JsonArray)json);
				}
				else {
					JsonArray contacts = new JsonArray() { json };
					AddContacts(user, contacts);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// PUT /[user id]/contacts/[contact id] change a contact
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "contacts") && IsValidId(parts[0]) && IsValidId(parts[2])) {
				string user = parts[0];
				string contact = parts[2];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeContact(user, contact, json);
					
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[user]/bookmarks create a bookmark
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "bookmarks") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				string resource = (string)json["resource"];
				CreateResourceBookmark(user, resource);
					
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// PUT /[user]/bookmarks/[bookmark] change bookmark
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "bookmarks") && IsValidId(parts[0]) && IsValidId(parts[2])) {
				string user = parts[0];
				string bookmark = parts[2];

				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				if(json.ContainsKey("position")) {
					int position = Convert.ToInt32((double)json["position"]);
					SetResourceBookmarkPosition(user, bookmark, position);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[user]/bookmarks/[bookmark] delete a bookmark
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "bookmarks") && IsValidId(parts[0]) && IsValidId(parts[2])) {
				string user = parts[0];
				string bookmark = parts[2];

				// test rights
				EnsureCanUpdateUser(context, user);

				DeleteResourceBookmark(user, bookmark);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[user]/rfids create a RFID
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "rfids") && IsValidId(parts[0])) {
				string user = parts[0];

				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				if(json is JsonArray)
					AddRfids(user, (JsonArray)json);
				else {
					JsonArray rfids = new JsonArray();
					rfids.Add(json);
					AddRfids(user, rfids);
				}					
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[user]/rfids/[rfid] delete a RFID
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "rfids") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				DeleteRfid(user, parts[2]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[user]/readers create a reader
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "readers") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetReader(CreateReader(user, json)));
			}
			// PUT /[user]/readers/[reader] change a reader
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "readers") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeReader(parts[2], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetReader(parts[2]));
			}
			// DELETE /[user]/readers/[reader] delete a reader
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "readers") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				DeleteReader(user, parts[2]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[user]/devices create a device
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "devices") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetDevice(CreateDevice(user, json)));
			}
			// PUT /[user]/devices/[device] change a device
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "devices") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeDevice(parts[2], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetDevice(parts[2]));
			}
			// DELETE /[user]/devices/[device] delete a device
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "devices") && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanUpdateUser(context, user);

				DeleteDevice(user, parts[2]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[user] delete the user
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && IsValidId(parts[0])) {
				string user = parts[0];
				// test rights
				EnsureCanDeleteUser(context, user);

				DeleteUser(user);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
		}

		public void Dispose()
		{
			if(dbcon != null) {
				dbcon.Close();
				dbcon.Dispose();
				dbcon = null;
			}
		}
	}
}

