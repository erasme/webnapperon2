// NewsService.cs
// 
//  Service to synchronize a RSS or ATOM feed with a local storage
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
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using System.Data;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Collections.Generic;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;
using Erasme.Cloud.Utils;
using NReadability;
using Webnapperon2.User;

namespace Webnapperon2.News
{
	public class NewsService
	{
		StorageService storageService;
		ILogger logger;
		string temporaryDirectory;
		PriorityTaskScheduler longRunningTaskScheduler;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public NewsService(string basePath, StorageService storageService, string temporaryDirectory,
			PriorityTaskScheduler longRunningTaskScheduler, ILogger logger)
		{
			this.storageService = storageService;
			this.temporaryDirectory = temporaryDirectory;
			this.longRunningTaskScheduler = longRunningTaskScheduler;
			this.logger = logger;
		}

		public UserService UserService { get; set; }

		public bool IsUrlValid(string rss)
		{
			// TODO
			return true;
		}

		public void CreateNews(JsonValue data)
		{
			if(!data.ContainsKey("url"))
				throw new WebException(400, 1, "RSS URL is NEEDED to create News");
			string url = (string)data["url"];
			if(!IsUrlValid(url))
				throw new WebException(400, 1, "RSS URL is not a valid News");
			bool fullcontent = false;
			if(data.ContainsKey("fullcontent"))
				fullcontent = data["fullcontent"];
			bool originalarticle = false;
			if(data.ContainsKey("originalarticle"))
				originalarticle = data["originalarticle"];

			// create a corresponding storage
			string storageId = storageService.CreateStorage(-1);
			JsonValue json = new JsonObject();
			json["url"] = url;
			json["fullcontent"] = fullcontent;
			json["originalarticle"] = originalarticle;
			json["utime"] = 0;
			json["failcount"] = 0;

			data["storage_id"] = storageId;
			data["data"] = json.ToString();
		}

		public void GetNews(string id, JsonValue data)
		{
			JsonValue json = JsonValue.Parse(data["data"]);
			data["url"] = json["url"];
			data["fullcontent"] = json["fullcontent"];
			data["originalarticle"] = false;
			if(json.ContainsKey("originalarticle"))
				data["originalarticle"] = json["originalarticle"];
			data["utime"] = json["utime"];
			data["failcount"] = json["failcount"];
			long utime = (long)data["utime"];
			if(utime != 0)
				data["delta"] = (DateTime.UtcNow - (new DateTime(utime * 10000))).TotalSeconds;
			else
				data["delta"] = 0;
			((JsonObject)data).Remove("data");
		}

		public void ChangeNews(string id, JsonValue data, JsonValue diff)
		{
			if(diff.ContainsKey("url") || diff.ContainsKey("utime") || diff.ContainsKey("failcount")) {
				JsonValue json = new JsonObject();

				if(diff.ContainsKey("url"))
					json["url"] = diff["url"];
				else
					json["url"] = data["url"];
				if(diff.ContainsKey("fullcontent"))
					json["fullcontent"] = diff["fullcontent"];
				else
					json["fullcontent"] = data["fullcontent"];
				if(diff.ContainsKey("originalarticle"))
					json["originalarticle"] = diff["originalarticle"];
				else {
					json["originalarticle"] = false;
					if(data.ContainsKey("originalarticle"))
						json["originalarticle"] = data["originalarticle"];
				}
				if(diff.ContainsKey("utime"))
					json["utime"] = (long)diff["utime"];
				else
					json["utime"] = data["utime"];
				if(diff.ContainsKey("failcount"))
					json["failcount"] = diff["failcount"];
				else
					json["failcount"] = data["failcount"];
				diff["data"] = json.ToString();
			}
			else if(diff.ContainsKey("data"))
				((JsonObject)diff).Remove("data");
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

		void UpdateNews(string id)
		{
			JsonValue data = UserService.GetResource(id);
			if(data == null)
				return;

			string storage = data["storage_id"];
			string url = data["url"];
			bool fullcontent = data["fullcontent"];
			bool originalarticle = false;
			if(data.ContainsKey("originalarticle"))
				originalarticle = data["originalarticle"];

			List<NewsElement> newItems = new List<NewsElement>();
			Dictionary<string, JsonValue> storageItems = new Dictionary<string, JsonValue>();

			// get storage infos
			JsonValue ts = storageService.GetFileInfo(storage, 0, 1);
			if(ts == null)
				return;

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

					if(originalarticle) {
						if((p.Link != null) && (p.Title != null)) {
							meta["iframe"] = "true";
							string tmpFile = temporaryDirectory + "/" + Guid.NewGuid().ToString();

							using(StreamWriter writer = File.CreateText(tmpFile)) {
								writer.Write(p.Link);
								writer.Close();
							}
							storageService.CreateFile(
								storage, 0, p.Title, "text/uri-list",
								tmpFile, define, true);
						}
					}
					else {
						// if wanted, try to get the full content
						if((fullcontent) && (p.Link != null) && (p.Title != null)) {
							string full = GetFullContent(p.Link, p.Title, p.Content);
							if(full != null)
								htmlContent = full;
						}
						string tmpFile = temporaryDirectory + "/" + Guid.NewGuid().ToString();
						using(StreamWriter writer = File.CreateText(tmpFile)) {
							writer.Write(htmlContent);
							writer.Close();
						}
						storageService.CreateFile(
							storage, 0, p.Title, "application/x-webnapperon2-rss-item",
							tmpFile, define, true);
					}
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
			JsonValue diff = new JsonObject();
			diff["failcount"] = 0;
			diff["utime"] = (long)(DateTime.UtcNow.Ticks / 10000);
			UserService.ChangeResourceUpdateStorage(data, diff);
		}

		public void QueueUpdateNews(JsonValue data)
		{
			LongTask task = null;
			string id = data["id"];
			long failcount = data["failcount"];
			lock(instanceLock) {
				if(!runningTasks.ContainsKey(id)) {
					task = new LongTask(delegate {
						try {
							UpdateNews(id);
						}
						catch(Exception e) {
							logger.Log(LogLevel.Error, "Error while processing News update for "+id+": "+e.ToString());
							// mark the fail in the db
							JsonValue diff = new JsonObject();
							diff["failcount"] = failcount + 1;
							diff["utime"] = (long)(DateTime.UtcNow.Ticks / 10000);
							UserService.ChangeResource(id, diff, null);

						} finally {
							// remove the task
							lock(instanceLock) {
								if(runningTasks.ContainsKey(id))
									runningTasks.Remove(id);
							}
						}
					}, null, "Update news "+id, LongTaskPriority.Low);
					runningTasks[id] = task;
				}
			}
			if(task != null)
				longRunningTaskScheduler.Start(task);
		}
	}
}
