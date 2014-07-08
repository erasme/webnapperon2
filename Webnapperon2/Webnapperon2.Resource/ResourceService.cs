// ResourceService.cs
// 
//  Get info about Webnapperon2's resources
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
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;
using Webnapperon2.User;

namespace Webnapperon2.Resource
{
	public class ResourceService: IHttpHandler
	{
		UserService userService;

		public ResourceService(UserService userService)
		{
			this.userService = userService;
		}

		void EnsureCanReadResource(HttpContext context, string resourceId)
		{
			// need a logged user
			userService.EnsureIsAuthenticated(context);

			JsonValue rights = userService.GetUserResourceRights(context.User, resourceId);
			// read rights
			if((bool)rights["read"])
				return;
			throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		void EnsureCanUpdateResource(HttpContext context, string resourceId)
		{
			// need a logged user
			userService.EnsureIsAuthenticated(context);

			JsonValue rights = userService.GetUserResourceRights(context.User, resourceId);
			// write rights
			if((bool)rights["write"])
				return;
			throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		void EnsureCanAdminResource(HttpContext context, string resourceId)
		{
			// need a logged user
			userService.EnsureIsAuthenticated(context);
			JsonValue rights = userService.GetUserResourceRights(context.User, resourceId);
			// admin rights
			if((bool)rights["admin"])
				return;
			throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		void EnsureCanDeleteResource(HttpContext context, string resourceId)
		{
			// need a logged user
			userService.EnsureIsAuthenticated(context);

			JsonValue rights = userService.GetUserResourceRights(context.User, resourceId);
			// delete rights
			if((bool)rights["delete"])
				return;
			throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		void EnsureCanChangeResourceRights(HttpContext context, string resourceId, JsonValue userRights)
		{
			// need a logged user
			userService.EnsureIsAuthenticated(context);

			JsonValue rights = userService.GetUserResourceRights(context.User, resourceId);
			// admin can do what they want
			if(rights["admin"])
				return;
			// user has share right and set rights less than himself
			if(rights["share"] && (!userRights.ContainsKey("write") || !userRights["write"] || rights["write"]))
				return;
			throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split (new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// GET /[resource] get a resource
			if((context.Request.Method == "GET") && (parts.Length == 1) && userService.IsValidId(parts[0])) {
				string resource = parts[0];
				string seenBy = null;
				if(context.Request.QueryString.ContainsKey("seenBy"))
					seenBy = context.Request.QueryString["seenBy"];

				EnsureCanReadResource(context, resource);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.GetResource(resource, seenBy));
			}
			// PUT /[resource] change a resource
			else if((context.Request.Method == "PUT") && (parts.Length == 1) && userService.IsValidId(parts[0])) {
				string resource = parts[0];
				JsonValue json = await context.Request.ReadAsJsonAsync();
				string seenBy = null;
				if(context.Request.QueryString.ContainsKey("seenBy"))
					seenBy = context.Request.QueryString["seenBy"];

				// seenByMeRev need update right on the seenBy user
				if((json.Count == 1) && json.ContainsKey("seenByMeRev") && (seenBy != null))
					userService.EnsureCanUpdateUser(context, seenBy);
				// else, update right on the resource is needed
				else
					EnsureCanUpdateResource(context, resource);

				userService.ChangeResource(resource, json, seenBy);
									
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.GetResource(resource, seenBy));
			}
			// DELETE /[resource] delete a resource
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && userService.IsValidId(parts[0])) {
				string resource = parts[0];

				EnsureCanDeleteResource(context, resource);

				userService.DeleteResource(resource);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /[resource]/rights add rights
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "rights") && userService.IsValidId(parts[0])) {
				string resource = parts[0];
				JsonValue json = await context.Request.ReadAsJsonAsync();

				EnsureCanChangeResourceRights(context, resource, json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.AddUserResourceRights(resource, json));
			}
			// PUT /[resource]/rights/[user] change user rights
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "rights") && userService.IsValidId(parts[0]) && userService.IsValidId(parts[2])) {
				string resource = parts[0];
				string user = parts[2];

				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["user_id"] = user;

				EnsureCanChangeResourceRights(context, resource, json);
				
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.AddUserResourceRights(resource, json));
			}
			// DELETE /[resource]/rights/[user] delete user rights
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[1] == "rights") && userService.IsValidId(parts[0]) && userService.IsValidId(parts[2])) {
				string resource = parts[0];
				string user = parts[2];

				JsonValue json = new JsonObject();
				json["user_id"] = user;
				json["read"] = false;
				json["write"] = false;
				json["share"] = false;

				EnsureCanChangeResourceRights(context, resource, json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.AddUserResourceRights(resource, json));
			}
			// GET /[resource]/rights/[user] get all write of a given user on the resource
			if((context.Request.Method == "GET") && (parts.Length == 3) && (parts[1] == "rights") && userService.IsValidId(parts[0]) && userService.IsValidId(parts[2])) {
				string resource = parts[0];
				string user = parts[2];

				EnsureCanAdminResource(context, resource);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(userService.GetUserResourceRights(user, resource));
			}
		}
	}
}
