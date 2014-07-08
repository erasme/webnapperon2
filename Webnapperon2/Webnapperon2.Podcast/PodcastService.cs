// PodcastService.cs
// 
//  Service to synchronize a RSS podcast feed with a local storage
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
using System.Xml;
using System.Xml.Linq;
using System.Data;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;
using Erasme.Cloud.Utils;
using Webnapperon2.User;

namespace Webnapperon2.Podcast
{
	public class PodcastService
	{
		StorageService storageService;
		ILogger logger;
		PriorityTaskScheduler longRunningTaskScheduler;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public PodcastService(string basePath, StorageService storageService,
			PriorityTaskScheduler longRunningTaskScheduler, ILogger logger)
		{
			this.storageService = storageService;
			this.longRunningTaskScheduler = longRunningTaskScheduler;
			this.logger = logger;
		}

		public UserService UserService { get; set; }

		public bool IsUrlValid(string rss)
		{
			// TODO
			return true;
		}

		public void CreatePodcast(JsonValue data)
		{
			if(!data.ContainsKey("url"))
				throw new WebException(400, 1, "RSS URL is NEEDED to create Podcast album");
			string url = (string)data["url"];
			if(!IsUrlValid(url))
				throw new WebException(400, 1, "RSS URL is not a valid Podcast album");

			// create a corresponding storage
			string storageId = storageService.CreateStorage(-1);
			JsonValue json = new JsonObject();
			json["url"] = url;
			json["utime"] = 0;
			json["failcount"] = 0;

			data["storage_id"] = storageId;
			data["data"] = json.ToString();
		}

		public void GetPodcast(string id, JsonValue data)
		{
			JsonValue json = JsonValue.Parse(data["data"]);
			data["url"] = json["url"];
			data["utime"] = json["utime"];
			data["failcount"] = json["failcount"];
			long utime = (long)data["utime"];
			if(utime != 0)
				data["delta"] = (DateTime.UtcNow - (new DateTime(utime * 10000))).TotalSeconds;
			else
				data["delta"] = 0;
			((JsonObject)data).Remove("data");
		}

		public void ChangePodcast(string id, JsonValue data, JsonValue diff)
		{
			if(diff.ContainsKey("url") || diff.ContainsKey("utime") || diff.ContainsKey("failcount")) {
				JsonValue json = new JsonObject();

				if(diff.ContainsKey("url"))
					json["url"] = diff["url"];
				else
					json["url"] = data["url"];
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

		struct PodcastElement
		{
			public string Guid;
			public XElement Content;
			public XElement Item;
		}

		void UpdatePodcast(string id)
		{
			JsonValue data = UserService.GetResource(id);
			if(data == null)
				return;

			string storage = data["storage_id"];
			string url = data["url"];

			List<PodcastElement> newItems = new List<PodcastElement>();
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
						if(meta.ContainsKey("podcastGuid"))
							storageItems[(string)meta["podcastGuid"]] = child;
					}
				}
			}

			// get the RSS
			using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
				HttpClientResponse response = request.GetResponse();

				XElement root = XElement.Load(response.InputStream);

				int position = 0;
				foreach(XElement item in root.Element("channel").Elements("item")) {
					// limit to only 4 podcasts
					if(position++ >= 4)
						break;

					// get unique id of the item
					string guid = item.Element("guid").Value;

					XElement content = item.Element("enclosure");
					if(content != null) {
						if(storageItems.ContainsKey(guid))
							storageItems[guid]["seen"] = true;
						else {
							PodcastElement p = new PodcastElement();
							p.Guid = guid;
							p.Item = item;
							p.Content = content;
							newItems.Add(p);
							}
						//Console.WriteLine("item guid: "+guid+", url: "+content.Attribute("url").Value);
					}
				}
			}
			newItems.Reverse();
			// create new items
			//Console.WriteLine("NEW ITEMS: "+newItems.Count);
			foreach(PodcastElement p in newItems) {
				JsonValue define = new JsonObject();
				JsonValue meta = new JsonObject();
				define["position"] = (double)0;
				define["meta"] = meta;
				meta["podcastGuid"] = p.Guid;
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
			// update podcast update values
			JsonValue diff = new JsonObject();
			diff["failcount"] = 0;
			diff["utime"] = (long)(DateTime.UtcNow.Ticks / 10000);
			UserService.ChangeResourceUpdateStorage(data, diff);
		}

		public void QueueUpdatePodcast(JsonValue data)
		{
			LongTask task = null;
			string id = data["id"];
			long failcount = data["failcount"];
			lock(instanceLock) {
				if(!runningTasks.ContainsKey(id)) {
					task = new LongTask(delegate {
						try {
							UpdatePodcast(id);
						}
						catch(Exception e) {
							logger.Log(LogLevel.Error, "Error while processing Podcast update for album "+id+": "+e.ToString());
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
					}, null, "Update podcast "+id, LongTaskPriority.Low);
					runningTasks[id] = task;
				}
			}
			if(task != null)
				longRunningTaskScheduler.Start(task);
		}
	}
}
