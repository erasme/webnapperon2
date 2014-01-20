// NewsService.cs
// 
//  Service to synchronize a RSS or ATOM feed with a local storage
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
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using System.Data;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;
using NReadability;

namespace Webnapperon2.News
{
	public class NewsService: IHttpHandler, IDisposable
	{
		StorageService storageService;
		ILogger logger;
		string temporaryDirectory;
		TaskFactory longRunningTaskFactory;
		object instanceLock = new object();
		Dictionary<string,Task> runningTasks = new Dictionary<string, Task>();

		IDbConnection dbcon;

		public NewsService(string basePath, StorageService storageService, string temporaryDirectory, TaskFactory longRunningTaskFactory, ILogger logger)
		{
			this.storageService = storageService;
			this.temporaryDirectory = temporaryDirectory;
			this.longRunningTaskFactory = longRunningTaskFactory;
			this.logger = logger;

			if(!Directory.Exists(basePath))
				Directory.CreateDirectory(basePath);

			bool createNeeded = !File.Exists(basePath + "/news.db");

			dbcon = (IDbConnection) new SqliteConnection("URI=file:"+basePath+"/news.db");
			dbcon.Open();

			if(createNeeded) {
				// create the message table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE news (id INTEGER PRIMARY KEY AUTOINCREMENT, url VARCHAR, storage VARCHAR, utime INTEGER, failcount INTEGER DEFAULT 0, fullcontent INTEGER(1) DEFAULT 0)";
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

		public long CreateNews(string url, bool fullcontent)
		{
			if(!IsUrlValid(url))
				throw new WebException(400, 1, "RSS URL is not a valid news");

			long newsId = -1;
			// create a corresponding storage
			string storageId = storageService.CreateStorage(-1);

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// insert into news table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "INSERT INTO news (storage,url,utime,fullcontent) VALUES (@storage,@url,NULL,@fullcontent)";
						dbcmd.Parameters.Add(new SqliteParameter("storage", storageId));
						dbcmd.Parameters.Add(new SqliteParameter("url", url));
						dbcmd.Parameters.Add(new SqliteParameter("fullcontent", fullcontent?1:0));

						int count = dbcmd.ExecuteNonQuery();
						if(count != 1)
							throw new Exception("Create News fails");
					}
					// get the insert id
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT last_insert_rowid()";
						newsId = Convert.ToInt64(dbcmd.ExecuteScalar());
					}
					transaction.Commit();
				}
			}
			return newsId;
		}

		public void DeleteNews(long id)
		{
			string storageId = null;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// select storage in the news table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT storage FROM news WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						object res = dbcmd.ExecuteScalar();
						if(res == null)
							throw new WebException(404, 1, "Delete News fails, stream not found");
						storageId = Convert.ToString(res);
					}
					// delete the news stream
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "DELETE FROM news WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", id));
						dbcmd.ExecuteNonQuery();
					}
					transaction.Commit();
				}
			}
			// delete the corresponding storage
			storageService.DeleteStorage(storageId);
		}

		public bool GetNewsInfo(long id, out string storage, out string url, out long utime, out int failcount, out double delta, out bool fullcontent)
		{
			storage = null;
			url = null;
			utime = 0;
			failcount = 0;
			delta = 0;
			fullcontent = false;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// select storage in the news table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT storage,url,strftime('%s',utime),failcount,(julianday(datetime('now'))-julianday(utime))*24*3600,fullcontent FROM news WHERE id=@id";
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
							fullcontent = reader.GetInt64(5) != 0;
						}
					}
					transaction.Commit();
				}
			}
			return true;
		}

		public JsonValue GetNews(long id)
		{
			JsonValue res = new JsonObject();
			res["id"] = id;
			string storage = null;
			string url = null;
			long utime = 0;
			int failcount = 0;
			double delta = 0;
			bool fullcontent = false;
			if(!GetNewsInfo(id, out storage, out url, out utime, out failcount, out delta, out fullcontent))
				throw new WebException(404, 0, "News stream not found");
			else {
				res["storage"] = storage;
				res["url"] = url;
				res["utime"] = utime;
				res["failcount"] = failcount;
				res["delta"] = delta;
				res["fullcontent"] = fullcontent;
			}
			return res;
		}

		struct NewsElement
		{
			public string Guid;
			public string Title;
			public string Link;
			public string Content;
			public string Date;
//			public XElement Item;
		}

		public static int GetLevenshteinDistance(string s, string t)
		{
			int n = s.Length;
			int m = t.Length;
			int[,] d = new int[n + 1, m + 1];

			if(n == 0)
				return m;
			if(m == 0)
				return n;

			for(int i = 0; i <= n; d[i, 0] = i++) {}
			for(int j = 0; j <= m; d[0, j] = j++) {}

			for(int i = 1; i <= n; i++) {
				for(int j = 1; j <= m; j++) {
					int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
					d[i, j] = Math.Min(
						Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
						d[i - 1, j - 1] + cost);
				}
			}
			return d[n, m];
		}

		public static Encoding EncodingFromContentType(string contentType)
		{
			string[] contents = contentType.Split(new char[]{';'}, StringSplitOptions.RemoveEmptyEntries);
			foreach(string c in contents) {
				if(c.IndexOf("charset", StringComparison.CurrentCultureIgnoreCase) != -1) {
					string[]cs = c.Split(new char[]{'='}, StringSplitOptions.RemoveEmptyEntries);
					if(cs.Length == 2)
						return Encoding.GetEncoding(cs[1].Trim());
				}
			}
			return null;
		}

		public string GetFullContent(string url, string title, string content)
		{
			string articleHtml = null;
			try {
				articleHtml = GetFullContent(url);
			}
			catch(Exception e) {
				logger.Log(LogLevel.Info, "News fails to get full content for '"+url+"': "+e.ToString());
				articleHtml = null;
			}
			return articleHtml;
		}

		public static string GetFullContent(string url)
		{
			string articleHtml = null;

			// get the HTML page
			byte[] bytes;
			string contentType = null;
			using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
				HttpClientResponse response = request.GetResponse();
				if(response.Headers.ContainsKey("content-type"))
					contentType = response.Headers["content-type"];
				bytes = response.ReadAsBytes();
			}

			XDocument doc = null;
			string htmlContent = null;

			Encoding encoding = null;
			htmlContent = Encoding.ASCII.GetString(bytes);
			// parse with ASCII encoding to find content-type meta
			doc = SgmlDomBuilder.BuildDocument(htmlContent);
			var metas = from m in doc.Root.Descendants("meta")
				where (string)m.Attribute("http-equiv") == "Content-Type" && m.Attribute("content") != null select m;
			foreach(XElement meta in metas) {
				encoding = EncodingFromContentType(meta.Attribute("content").Value);
			}
			if((encoding == null) && (contentType != null))
				encoding = EncodingFromContentType(contentType);
			if(encoding != null) {
				// found encoding, re-read with the correct encoding
				htmlContent = encoding.GetString(bytes);
			}
			// parse the HTML document with the correct encoding
			doc = SgmlDomBuilder.BuildDocument(htmlContent);


			NReadabilityTranscoder transcoder = new NReadabilityTranscoder();
			transcoder.PrepareDocument(doc);
			NReadabilityTranscoder.ResolveElementsUrls(doc, "a", "href", url);
			NReadabilityTranscoder.ResolveElementsUrls(doc, "img", "src", url);
			XElement articleContentElement = transcoder.ExtractArticleContent(doc);
			articleHtml = articleContentElement.ToString();
			return articleHtml;
		}

		void UpdateNews(long id)
		{
			string storage = null;
			string url = null;
			long utime = 0;
			int failcount = 0;
			double delta = 0;
			bool fullcontent = false;

			if(GetNewsInfo(id, out storage, out url, out utime, out failcount, out delta, out fullcontent)) {
				List<NewsElement> newItems = new List<NewsElement>();
				Dictionary<string, JsonValue> storageItems = new Dictionary<string, JsonValue>();

				// get storage infos
				JsonValue ts = storageService.GetFileInfo(storage, 0, 1);
				if(ts.ContainsKey("children")) {
					JsonArray children = (JsonArray)ts["children"];
					foreach(JsonValue child in children) {
						if(child.ContainsKey("meta")) {
							JsonValue meta = child["meta"];
							if(meta.ContainsKey("newsGuid"))
								storageItems[(string)meta["newsGuid"]] = child;
						}
					}
				}

				// get the RSS
				using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
					HttpClientResponse response = request.GetResponse();
					if(response.StatusCode != 200)
						throw new Exception("RSS download fails HTTP (status: "+response.StatusCode+")");

					XDocument doc = XDocument.Load(response.InputStream);
					//XElement root = XElement.Load(stream);
					XElement root = doc.Root;
					XNamespace ns = doc.Root.Name.Namespace;
					if(root.Name.LocalName == "rss") {
						foreach(XElement item in root.Element("channel").Elements("item")) {
							// get unique id of the item
							string guid;
							if(item.Element("guid") != null)
								guid = item.Element("guid").Value;
							else
								guid = item.Element("link").Value;

							XElement content = item.Element("description");
							if(content != null) {
								if(storageItems.ContainsKey(guid))
									storageItems[guid]["seen"] = true;
								else {
									NewsElement p = new NewsElement();
									p.Guid = guid;
									if(item.Element("link") != null)
										p.Link = item.Element("link").Value;
									if(item.Element("pubDate") != null)
										p.Date = item.Element("pubDate").Value;
									p.Title = item.Element("title").Value;
									p.Content = content.Value;
									newItems.Add(p);
								}
								//Console.WriteLine("item guid: "+guid+", url: "+content.Attribute("url").Value);
							}
						}
					}
					else if(root.Name.LocalName == "feed") {
						foreach(XElement entry in root.Elements(ns+"entry")) {
							// get unique id of the item
							string guid = entry.Element(ns+"id").Value;
							XElement content = entry.Element(ns+"content");
							if(content != null) {
								if(storageItems.ContainsKey(guid))
									storageItems[guid]["seen"] = true;
								else {
									NewsElement p = new NewsElement();
									p.Guid = guid;
									foreach(XElement link in entry.Elements(ns+"link")) {
										if((link.Attribute("rel") != null) &&
										   (link.Attribute("type") != null) &&
										   (link.Attribute("rel").Value == "alternate") &&
										   (link.Attribute("type").Value == "text/html"))
											p.Link = link.Attribute("href").Value;
									}
									if(entry.Element(ns+"published") != null)
										p.Date = entry.Element(ns+"published").Value;
									if(entry.Element(ns+"updated") != null)
										p.Date = entry.Element(ns+"updated").Value;
									p.Title = entry.Element(ns+"title").Value;
									p.Content = content.Value;
									newItems.Add(p);
								}
							}
						}

					}
				}

				newItems.Reverse();
				// create new items
				//Console.WriteLine("NEW ITEMS: "+newItems.Count);
				foreach(NewsElement p in newItems) {
					JsonValue define = new JsonObject();
					JsonValue meta = new JsonObject();
					define["position"] = (double)0;
					define["meta"] = meta;
					meta["newsGuid"] = p.Guid;
					if(p.Link != null)
						meta["link"] = p.Link;
					if(p.Date != null)
						meta["pubDate"] = p.Date;
					string htmlContent = p.Content;
					// if wanted, try to get the full content
					if((fullcontent) && (p.Link != null) && (p.Title != null)) {
						string full = GetFullContent(p.Link, p.Title, p.Content);
						if(full != null)
							htmlContent = full;
					}
					string tmpFile = temporaryDirectory+"/"+Guid.NewGuid().ToString();
					using(StreamWriter writer = File.CreateText(tmpFile)) {
						writer.Write(htmlContent);
						writer.Close();
					}
					storageService.CreateFile(
						storage, 0, p.Title, "application/x-webnapperon2-rss-item",
						tmpFile, define, true);
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
			// update news update values
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					// update the news table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE news SET utime=datetime('now'),failcount=0 WHERE id=@id";
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
				// update news update values
				lock(dbcon) {
					using(IDbTransaction transaction = dbcon.BeginTransaction()) {
						// get the news failcount
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT failcount FROM news WHERE id=@id";
							dbcmd.Parameters.Add(new SqliteParameter("id", id));
							object res = dbcmd.ExecuteScalar();
							if(res != null)
								failcount = Convert.ToInt32(res);
						}
						if(failcount >= 0) {
							failcount++;
							// update the news table fail counter
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "UPDATE news SET failcount=@failcount WHERE id=@id";
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

		public void QueueUpdateNews(long id)
		{
			Task task = null;
			lock(instanceLock) {
				if(!runningTasks.ContainsKey(id.ToString())) {
					task = new Task(delegate {
						try {
							UpdateNews(id);
						}
						catch(Exception e) {
							// mark the fail in the db
							IncrementUpdateFail(id);
							logger.Log(LogLevel.Error, "Error while processing News update "+id+": "+e.ToString());
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

			// GET /[id] get news info
			if((context.Request.Method == "GET") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetNews(id));
			}
			// GET /[id]/update update a news
			else if((context.Request.Method == "GET") && (parts.Length == 2) && long.TryParse(parts[0], out id) && (parts[1] == "update")) {
				QueueUpdateNews(id);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST / create a news
			else if((context.Request.Method == "POST") && (parts.Length == 0)) {
				JsonValue json = await context.Request.ReadAsJsonAsync();

				bool fullcontent = false;
				if(json.ContainsKey("fullcontent"))
					fullcontent = (bool)json["fullcontent"];
				id = CreateNews((string)json["url"], fullcontent);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetNews(id));
			}
			// DELETE /[id] delete a news
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				DeleteNews(id);
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
