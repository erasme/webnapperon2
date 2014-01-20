// PicasaService.cs
// 
//  Service to synchronize a Picasa album from a RSS feed with a local storage
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2013 Departement du Rhone
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
using System.Xml;
using System.Xml.Linq;
using System.Data;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;

namespace Webnapperon2.Picasa
{
	public class PicasaService: IHttpHandler, IDisposable
	{
		StorageService storageService;
		ILogger logger;
		TaskFactory longRunningTaskFactory;
		object instanceLock = new object();
		Dictionary<string,Task> runningTasks = new Dictionary<string, Task>();

		IDbConnection dbcon;

		public PicasaService(string basePath, StorageService storageService, TaskFactory longRunningTaskFactory, ILogger logger)
		{
			this.storageService = storageService;
			this.longRunningTaskFactory = longRunningTaskFactory;
			this.logger = logger;

			if(!Directory.Exists(basePath))
				Directory.CreateDirectory(basePath);

			bool createNeeded = !File.Exists(basePath+"/picasa.db");

			dbcon = (IDbConnection) new SqliteConnection("URI=file:"+basePath+"/picasa.db");
			dbcon.Open();

			if(createNeeded) {
				// create the message table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE picasa (id INTEGER PRIMARY KEY AUTOINCREMENT, url VARCHAR, storage VARCHAR, utime INTEGER, failcount INTEGER DEFAULT 0)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
			}
			// disable disk sync.
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
		}

		public bool IsUrlValid(string rss)
		{
			// TODO
			return true;
		}

		public long CreatePicasa(string url)
		{
			if(!IsUrlValid(url))
				throw new WebException(400, 1, "RSS URL is not a valid Picasa album");

			long picasaId = -1;
			// create a corresponding storage
			string storageId = storageService.CreateStorage(-1);

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// insert into picasa table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "INSERT INTO picasa (storage,url,utime) VALUES (@storage,@url,NULL)";
						dbcmd.Parameters.Add(new SqliteParameter("storage", storageId));
						dbcmd.Parameters.Add(new SqliteParameter("url", url));
						int count = dbcmd.ExecuteNonQuery();
						if(count != 1)
							throw new Exception("Create Picasa fails");
					}
					// get the insert id
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT last_insert_rowid()";
						picasaId = Convert.ToInt64(dbcmd.ExecuteScalar());
					}
					transaction.Commit();
				}
			}
			return picasaId;
		}

		public void DeletePicasa(long id)
		{
			string storageId = null;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// select storage in the picasa table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT storage FROM picasa WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						object res = dbcmd.ExecuteScalar();
						if(res == null)
							throw new WebException(404, 1, "Delete Picasa fails, album not found");
						storageId = Convert.ToString(res);
					}
					// delete the album
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM picasa WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					transaction.Commit();
				}
			}
			// delete the corresponding storage
			storageService.DeleteStorage(storageId);
		}

		public bool GetPicasaInfo(long id, out string storage, out string url, out long utime, out int failcount, out double delta)
		{
			storage = null;
			url = null;
			utime = 0;
			failcount = 0;
			delta = 0;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// select storage in the picasa table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT storage,url,strftime('%s',utime),failcount,(julianday(datetime('now'))-julianday(utime))*24*3600 FROM picasa WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							if(!reader.Read())
								return false;
							storage = reader.GetString(0);
							url = reader.GetString(1);
							if(reader.IsDBNull(2))
								utime = 0;
							else
								utime = Convert.ToInt64(reader.GetString(2));
							failcount = reader.GetInt32(3);
							if(reader.IsDBNull(4))
								delta = 0;
							else
								delta = reader.GetDouble(4);
						}
					}
					transaction.Commit();
				}
			}
			return true;
		}

		public JsonValue GetPicasa(long id)
		{
			JsonValue res = new JsonObject();
			res["id"] = id;
			string storage = null;
			string url = null;
			long utime = 0;
			int failcount = 0;
			double delta = 0;
			if(!GetPicasaInfo(id, out storage, out url, out utime, out failcount, out delta))
				throw new WebException(404, 0, "Picasa album not found");
			else {
				res["storage"] = storage;
				res["url"] = url;
				res["utime"] = utime;
				res["failcount"] = failcount;
				res["delta"] = delta;
			}
			return res;
		}

		struct PicasaElement
		{
			public string Guid;
			public XElement Content;
			public XElement Item;
		}

		void UpdatePicasa(long id)
		{
			string storage = null;
			string url = null;
			long utime = 0;
			int failcount = 0;
			double delta = 0;

			if(GetPicasaInfo(id, out storage, out url, out utime, out failcount, out delta)) {
				List<PicasaElement> newItems = new List<PicasaElement>();
				Dictionary<string, JsonValue> storageItems = new Dictionary<string, JsonValue>();

				// get storage infos
				JsonValue ts = storageService.GetFileInfo(storage, 0, 1);
				if(ts.ContainsKey("children")) {
					JsonArray children = (JsonArray)ts["children"];
					foreach(JsonValue child in children) {
						if(child.ContainsKey("meta")) {
							JsonValue meta = child["meta"];
							if(meta.ContainsKey("picasaGuid"))
								storageItems[(string)meta["picasaGuid"]] = child;
						}
					}
				}

				// get the RSS
				using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
					HttpClientResponse response = request.GetResponse();
									
					XNamespace media = "http://search.yahoo.com/mrss/";
					XElement root = XElement.Load(response.InputStream);

					foreach(XElement item in root.Element("channel").Elements("item")) {
						// get unique id of the item
						string guid = item.Element("guid").Value;

						XElement group = item.Element(media + "group");
						XElement content = null;
						foreach(XElement tmp in group.Elements(media+"content")) {
							if(content == null) {
								if((tmp.Attribute("medium").Value == "video") || (tmp.Attribute("medium").Value == "image"))
									content = tmp;
							}
							else {
								if(tmp.Attribute("medium").Value == "image") {
									// if we already have an image, get the highest resolution
									if(content.Attribute("medium").Value == "image") {
										int cw = Convert.ToInt32(content.Attribute("width").Value);
										int ch = Convert.ToInt32(content.Attribute("height").Value);
										int tw = Convert.ToInt32(tmp.Attribute("width").Value);
										int th = Convert.ToInt32(tmp.Attribute("height").Value);
										if(tw * th > cw * ch)
											content = tmp;
									}
								}
								else if(tmp.Attribute("medium").Value == "video") {
									// prefer video to image
									if(content.Attribute("medium").Value == "image")
										content = tmp;
									// prefer mpeg4 video
									else if(tmp.Attribute("type").Value == "video/mpeg4") {
										if(content.Attribute("type").Value != "video/mpeg4")
											content = tmp;
										// prefer highest resolution
										else {
											int cw = Convert.ToInt32(content.Attribute("width").Value);
											int ch = Convert.ToInt32(content.Attribute("height").Value);
											int tw = Convert.ToInt32(tmp.Attribute("width").Value);
											int th = Convert.ToInt32(tmp.Attribute("height").Value);
											if(tw * th > cw * ch)
												content = tmp;
										}
									}
									// if we already have a video, prefer highest resolution
									else if(content.Attribute("type").Value != "video/mpeg4") {
										int cw = Convert.ToInt32(content.Attribute("width").Value);
										int ch = Convert.ToInt32(content.Attribute("height").Value);
										int tw = Convert.ToInt32(tmp.Attribute("width").Value);
										int th = Convert.ToInt32(tmp.Attribute("height").Value);
										if(tw * th > cw * ch)
											content = tmp;
									}
								}
							}
							if(content != null) {
								if(storageItems.ContainsKey(guid))
									storageItems[guid]["seen"] = true;
								else {
									PicasaElement p = new PicasaElement();
									p.Guid = guid;
									p.Item = item;
									p.Content = content;
									newItems.Add(p);
								}
								//Console.WriteLine("item guid: "+guid+", url: "+content.Attribute("url").Value);
							}
						}
					}
				}
				newItems.Reverse();
				// create new items
				//Console.WriteLine("NEW ITEMS: "+newItems.Count);
				foreach(PicasaElement p in newItems) {
					JsonValue define = new JsonObject();
					JsonValue meta = new JsonObject();
					define["position"] = (double)0;
					define["meta"] = meta;
					meta["picasaGuid"] = p.Guid;
					storageService.CreateFileFromUrl(
						storage, 0, p.Item.Element("title").Value, p.Content.Attribute("type").Value,
						p.Content.Attribute("url").Value, define, true);
				}
				// delete items
				if(ts.ContainsKey("children")) {
					JsonArray children = (JsonArray)ts["children"];
					foreach(JsonValue child in children) {
						if(!child.ContainsKey("seen"))
							storageService.DeleteFile(storage, (long)child["id"]);
					}
				}
			}
			// update picasa update values
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// update the picasa table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE picasa SET utime=datetime('now'),failcount=0 WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					transaction.Commit();
				}
			}
		}

		int IncrementUpdateFail(long id)
		{
			int failcount = -1;
			try {
				// update picasa update values
				lock(dbcon) {
					using(IDbTransaction transaction = dbcon.BeginTransaction()) {
						// get the picasa album failcount
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT failcount FROM picasa WHERE id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("id", id));
							object res = dbcmd.ExecuteScalar();
							if(res != null)
								failcount = Convert.ToInt32(res);
						}
						if(failcount >= 0) {
							failcount++;
							// update the picasa table fail counter
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "UPDATE picasa SET failcount=@failcount WHERE id=@id";
								dbcmd.Parameters.Add(new SqliteParameter("failcount", failcount));
								dbcmd.Parameters.Add(new SqliteParameter("id", id));
								dbcmd.ExecuteNonQuery();
							}
						}
						transaction.Commit();
					}
				}
			}
			catch(Exception) {
				failcount = -1;
			}
			return failcount;
		}

		public void QueueUpdatePicasa(long id)
		{
			Task task = null;
			lock(instanceLock) {
				if(!runningTasks.ContainsKey(id.ToString())) {
					task = new Task(delegate {
						try {
							UpdatePicasa(id);
						}
						catch(Exception e) {
							// mark the fail in the db
							IncrementUpdateFail(id);
							logger.Log(LogLevel.Error, "Error while processing Picasa update for album "+id+": "+e.ToString());
						} finally {
							// remove the task
							lock(instanceLock) {
								if(runningTasks.ContainsKey(id.ToString()))
									runningTasks.Remove(id.ToString());
							}
						}
					});
					runningTasks[id.ToString()] = task;
				}
			}
			if(task != null)
				task.Start(longRunningTaskFactory.Scheduler);
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);
			long id = 0;

			// GET /[id] get picasa info
			if((context.Request.Method == "GET") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetPicasa(id));
			}
			// GET /[id]/update update a picasa album
			else if((context.Request.Method == "GET") && (parts.Length == 2) && long.TryParse(parts[0], out id) && (parts[1] == "update")) {
				QueueUpdatePicasa(id);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST / create a picasa album
			else if((context.Request.Method == "POST") && (parts.Length == 0)) {
				JsonValue json = await context.Request.ReadAsJsonAsync();

				id = CreatePicasa((string)json["url"]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetPicasa(id));
			}
			// DELETE /[id] delete a picasa album
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				DeletePicasa(id);
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
