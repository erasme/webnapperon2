// RfidService.cs
// 
//  Signal RFID enter on a reader or get the path associated with
//  a RFID
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
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Queue;
using Erasme.Cloud.Message;
using Webnapperon2.User;

namespace Webnapperon2.Rfid
{
	public class RfidService: IHttpHandler
	{
		UserService UserService;
		MessageService MessageService;
		QueueService QueueService;
		ILogger logger;

		public RfidService(UserService userService, MessageService messageService, QueueService queueService, ILogger logger)
		{
			UserService = userService;
			MessageService = messageService;
			QueueService = queueService;
			this.logger = logger;
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// POST /[reader]/enter create a RFID enter
			if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "enter")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				string readerId = parts[0];
				string rfid = (string)json["id"];

				logger.Log(LogLevel.Info, "RFID enter on reader: "+readerId+", tag: "+rfid);

				JsonValue reader = UserService.GetReader(readerId);
				if(reader == null)
					throw new WebException(404, 1, "Reader '"+readerId+"' not found");

				JsonValue message = new JsonObject();
				message["type"] = "rfid";
				message["origin"] = reader["user"];
				message["content"] = rfid;
				message["persist"] = false;

				string deviceId = (string)reader["device"];
				// if not device attached to the reader, send to the user
				if(deviceId == null) {
					message["destination"] = reader["user"];
					MessageService.SendMessage(message);
				}
				// else send to the device queue channel
				else {
					QueueService.SendMessage(deviceId, message);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// GET /[reader]/enter[?rfid=rfid] create a RFID enter from GET
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[1] == "enter") && (context.Request.QueryString.ContainsKey("rfid"))) {
				string readerId = parts[0];
				string rfid = context.Request.QueryString["rfid"];

				logger.Log(LogLevel.Info, "RFID enter on reader: "+readerId+", tag: "+rfid);

				JsonValue reader = UserService.GetReader(readerId);
				if(reader == null)
					throw new WebException(404, 1, "Reader '"+readerId+"' not found");

				JsonValue message = new JsonObject();
				message["type"] = "rfid";
				message["origin"] = reader["user"];
				message["content"] = rfid;
				message["persist"] = false;

				string deviceId = (string)reader["device"];
				// if not device attached to the reader, send to the user
				if(deviceId == null) {
					message["destination"] = reader["user"];
					MessageService.SendMessage(message);
				}
				// else send to the device queue channel
				else {
					QueueService.SendMessage(deviceId, message);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// GET /[rfid] get 
			else if((context.Request.Method == "GET") && (parts.Length == 1)) {
				JsonValue json = UserService.GetRfid(parts[0]);
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				if(json == null) {
					context.Response.StatusCode = 404;
				}
				else {
					context.Response.StatusCode = 200;
					context.Response.Content = new JsonContent(json);
				}
			}
		}
	}
}
