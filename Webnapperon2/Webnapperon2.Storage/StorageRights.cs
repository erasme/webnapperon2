//
// StorageRights.cs
//
// Author:
//       Daniel Lacroix <dlacroix@erasme.org>
//
// Copyright (c) 2014 Departement du Rhone
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

using System;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Storage;
using Webnapperon2.User;

namespace Webnapperon2.Storage
{	
	public class StorageRights: IStorageRights
	{
		UserService userService;

		public StorageRights(UserService userService)
		{
			this.userService = userService;
		}

		void EnsureCanWrite(HttpContext context, string storage)
		{
			userService.EnsureIsAuthenticated(context);

			JsonValue resource = userService.GetResourceFromStorage(storage);

			if((context.User != resource["owner_id"]) && !((bool)resource["public_write"])) {
				JsonArray rights = (JsonArray)resource["rights"];
				bool write = false;
				for(int i = 0; i < rights.Count; i++) {
					if(rights[i]["user_id"] == context.User)
						write = (bool)rights[i]["write"];
				}
				if(!write)
					userService.EnsureIsAdmin(context);
			}
		}

		void EnsureCanRead(HttpContext context, string storage)
		{
			userService.EnsureIsAuthenticated(context);

			JsonValue resource = userService.GetResourceFromStorage(storage);

			if((context.User != resource["owner_id"]) && !((bool)resource["public_read"])) {
				JsonArray rights = (JsonArray)resource["rights"];
				bool read = false;
				for(int i = 0; i < rights.Count; i++) {
					if(rights[i]["user_id"] == context.User)
						read = (bool)rights[i]["read"];
				}
				if(!read)
					userService.EnsureIsAdmin(context);
			}
		}

		public void EnsureCanCreateStorage(HttpContext context)
		{
			userService.EnsureIsAuthenticated(context);
			// only admin can directly create storages, normal user create resources
			userService.EnsureIsAdmin(context);
		}

		public void EnsureCanUpdateStorage(HttpContext context, string storage)
		{
			EnsureCanWrite(context, storage);
		}

		public void EnsureCanReadStorage(HttpContext context, string storage)
		{
			EnsureCanRead(context, storage);
		}

		public void EnsureCanDeleteStorage(HttpContext context, string storage)
		{
			userService.EnsureIsAuthenticated(context);
			// only admin can directly delete storages, normal user delete resources
			userService.EnsureIsAdmin(context);
		}

		public void EnsureCanReadFile(HttpContext context, string storage)
		{
			EnsureCanRead(context, storage);
		}

		public void EnsureCanCreateFile(HttpContext context, string storage)
		{
			EnsureCanWrite(context, storage);
		}

		public void EnsureCanUpdateFile(HttpContext context, string storage)
		{
			EnsureCanWrite(context, storage);
		}

		public void EnsureCanDeleteFile(HttpContext context, string storage)
		{
			EnsureCanWrite(context, storage);
		}

		public void EnsureCanCreateComment(HttpContext context, string storage, long file, string user)
		{
			EnsureCanRead(context, storage);
			// only allowed to write comment for them self except admins
			if(context.User != user)
				userService.EnsureIsAdmin(context);
		}

		public void EnsureCanUpdateComment(HttpContext context, string storage, long file, long comment)
		{
			EnsureCanRead(context, storage);
		}

		public void EnsureCanDeleteComment(HttpContext context, string storage, long file, long comment, string owner)
		{
			EnsureCanRead(context, storage);
			// only allowed to delete comments for them self except admins
			if(context.User != owner)
				userService.EnsureIsAdmin(context);
		}
	}
}

