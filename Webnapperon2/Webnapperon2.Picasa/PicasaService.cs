// PicasaService.cs
// 
//  Service to synchronize a Picasa album from a RSS feed with a local storage
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
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Storage;
using Webnapperon2.User;

namespace Webnapperon2.Picasa
{
	public class PicasaService
	{
		StorageService storageService;
		ILogger logger;
		TaskFactory longRunningTaskFactory;
		object instanceLock = new object();
		Dictionary<string,Task> runningTasks = new Dictionary<string, Task>();

		public PicasaService(string basePath, StorageService storageService, TaskFactory longRunningTaskFactory, ILogger logger)
		{
			this.storageService = storageService;
			this.longRunningTaskFactory = longRunningTaskFactory;
			this.logger = logger;
		}

		public UserService UserService { get; set; }

		public bool IsUrlValid(string rss)
		{
			// TODO
			return true;
		}

		public void CreatePicasa(JsonValue data)
		{
			if(!data.ContainsKey("url"))
				throw new WebException(400, 1, "RSS URL is NEEDED to create Picasa album");
			string url = (string)data["url"];
			if(!IsUrlValid(url))
				throw new WebException(400, 1, "RSS URL is not a valid Picasa album");

			// create a corresponding storage
			string storageId = storageService.CreateStorage(-1);
			JsonValue json = new JsonObject();
			json["url"] = url;
			json["utime"] = 0;
			json["failcount"] = 0;

			data["storage_id"] = storageId;
			data["data"] = json.ToString();
		}

		public void GetPicasa(string id, JsonValue data)
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

		public void ChangePicasa(string id, JsonValue data, JsonValue diff)
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

		struct PicasaElement
		{
			public string Guid;
			public XElement Content;
			public XElement Item;
		}

		void UpdatePicasa(string id)
		{
			JsonValue data = UserService.GetResource(id);
			if(data == null)
				return;

			string storage = data["storage_id"];
			string url = data["url"];

			List<PicasaElement> newItems = new List<PicasaElement>();
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
			// update picasa update values
			JsonValue diff = new JsonObject();
			diff["failcount"] = 0;
			diff["utime"] = (long)(DateTime.UtcNow.Ticks / 10000);
			UserService.ChangeResource(id, diff, null);
		}

		public void QueueUpdatePicasa(JsonValue data)
		{
			Task task = null;
			string id = data["id"];
			long failcount = data["failcount"];
			lock(instanceLock) {
				if(!runningTasks.ContainsKey(id.ToString())) {
					task = new Task(delegate {
						try {
							UpdatePicasa(id);
						}
						catch(Exception e) {
							logger.Log(LogLevel.Error, "Error while processing Picasa update for album "+id+": "+e.ToString());
							// mark the fail in the db
							JsonValue diff = new JsonObject();
							diff["failcount"] = failcount + 1;
							UserService.ChangeResource(id, diff, null);

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
	}
}
