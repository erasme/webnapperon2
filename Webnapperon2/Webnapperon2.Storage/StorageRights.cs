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
		public StorageRights()
		{
		}

		public UserService UserService { get; set; }

		void EnsureCanWrite(HttpContext context, string storage)
		{
			if(context.User == null)
				throw new WebException(401, 0, "Authentication needed");

			JsonValue resource = UserService.GetResourceFromStorage(storage);

			if((context.User != resource["owner_id"]) && !((bool)resource["public_write"]) && !((bool)((JsonValue)context.Data["user"])["admin"])) {
				JsonArray rights = (JsonArray)resource["rights"];
				bool write = false;
				for(int i = 0; i < rights.Count; i++) {
					if(rights[i]["user_id"] == context.User)
						write = (bool)rights[i]["write"];
				}
				if(!write)
					throw new WebException(403, 0, "Logged user has no sufficient credentials");
			}
		}

		void EnsureCanRead(HttpContext context, string storage)
		{
			if(context.User == null)
				throw new WebException(401, 0, "Authentication needed");

			JsonValue resource = UserService.GetResourceFromStorage(storage);

			if((context.User != resource["owner_id"]) && !((bool)resource["public_read"]) && !((bool)((JsonValue)context.Data["user"])["admin"])) {
				JsonArray rights = (JsonArray)resource["rights"];
				bool read = false;
				for(int i = 0; i < rights.Count; i++) {
					if(rights[i]["user_id"] == context.User)
						read = (bool)rights[i]["read"];
				}
				if(!read)
					throw new WebException(403, 0, "Logged user has no sufficient credentials");
			}
		}

		public void EnsureCanCreateStorage(HttpContext context)
		{
			if(context.User == null)
				throw new WebException(401, 0, "Authentication needed");

			// only admin can directly create storages, normal user create resources
			if(!((bool)((JsonValue)context.Data["user"])["admin"]))
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
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
			if(context.User == null)
				throw new WebException(401, 0, "Authentication needed");

			// only admin can directly delete storages, normal user delete resources
			if(!((bool)((JsonValue)context.Data["user"])["admin"]))
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
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
			if((context.User != user) && !((bool)((JsonValue)context.Data["user"])["admin"]))
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		public void EnsureCanUpdateComment(HttpContext context, string storage, long file, long comment)
		{
			EnsureCanRead(context, storage);
		}

		public void EnsureCanDeleteComment(HttpContext context, string storage, long file, long comment, string owner)
		{
			EnsureCanRead(context, storage);
			// only allowed to delete comments for them self except admins
			if((context.User != owner) && !((bool)((JsonValue)context.Data["user"])["admin"]))
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}
	}
}

