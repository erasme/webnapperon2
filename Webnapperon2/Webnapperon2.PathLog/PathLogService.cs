// PathLogService.cs
// 
//  Service to log path change in a database for statistics
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
using System.Text;
using System.Data;
using System.Threading.Tasks;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;

namespace Webnapperon2.PathLog
{
	public class PathLogService: IHttpHandler, IDisposable
	{
		object instanceLock = new object();
		IDbConnection dbcon;

		public PathLogService(string basepath)
		{
			if(!Directory.Exists(basepath))
				Directory.CreateDirectory(basepath);

			bool createNeeded = !File.Exists(basepath+"/pathlog.db");

			dbcon = (IDbConnection)new SqliteConnection("URI=file:"+basepath+"/pathlog.db");
			dbcon.Open();
				
			if(createNeeded) {
				// create the message table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE log (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id VARCHAR, path VARCHAR, create_date INTEGER)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
			}
			// disable disk sync. logs are not critical
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
			Rights = new DummyPathLogRights();
		}

		public IPathLogRights Rights { get; set; }

		public JsonArray GetLogs(int limit)
		{
			JsonArray logs = null;
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					logs = GetLogs(dbcon, transaction, limit);
					transaction.Commit();
				}
			}
			return logs;
		}
		
		JsonArray GetLogs(IDbConnection dbcon, IDbTransaction transaction, int limit)
		{
			JsonArray logs = new JsonArray();

			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT id,owner_id,path,strftime('%s',create_date) FROM log ORDER BY id DESC LIMIT @limit";
				dbcmd.Parameters.Add(new SqliteParameter("limit", limit));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue log = new JsonObject();
						log["id"] = reader.GetInt64(0);
						log["owner"] = reader.GetString(1);
						log["path"] = reader.GetString(2);
						log["create"] = Convert.ToInt64(reader.GetString(3));
						logs.Add(log);
					}
				}
			}
			return logs;
		}

		public JsonArray GetUserLogs(string user, int limit)
		{
			JsonArray logs = null;
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					logs = GetUserLogs(dbcon, transaction, user, limit);
					transaction.Commit();
				}
			}
			return logs;
		}
		
		JsonArray GetUserLogs(IDbConnection dbcon, IDbTransaction transaction, string user, int limit)
		{
			JsonArray logs = new JsonArray();

			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT id,owner_id,path,strftime('%s',create_date) FROM log WHERE owner_id=@user ORDER BY id DESC LIMIT @limit";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				dbcmd.Parameters.Add(new SqliteParameter("limit", limit));

				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue log = new JsonObject();
						log["id"] = reader.GetInt64(0);
						log["owner"] = reader.GetString(1);
						log["path"] = reader.GetString(2);
						log["create"] = Convert.ToInt64(reader.GetString(3));
						logs.Add(log);
					}
				}
			}
			return logs;
		}

		public JsonValue GetLog(long id)
		{
			JsonValue log = null;
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					log = GetLog(dbcon, transaction, id);
					transaction.Commit();
				}
			}
			return log;
		}

		JsonValue GetLog(IDbConnection dbcon, IDbTransaction transaction, long id)
		{
			JsonValue log = null;
			
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT id,owner_id,path,strftime('%s',create_date) FROM log WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						log = new JsonObject();
						log["id"] = reader.GetInt64(0);
						log["owner"] = reader.GetString(1);
						log["path"] = reader.GetString(2);
						log["create"] = Convert.ToInt64(reader.GetString(3));
					}
				}
			}
			return log;
		}

		public void CreateLog(JsonValue log)
		{
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					CreateLog(dbcon, transaction, log);
					transaction.Commit();
				}
			}
		}
		
		void CreateLog(IDbConnection dbcon, IDbTransaction transaction, JsonValue log)
		{
			string owner = (string)log["owner"];
			string path = (string)log["path"];
			// insert into comment table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = 
					"INSERT INTO log (path,owner_id,create_date) VALUES "+
					"(@path,@owner,datetime('now'))";
				dbcmd.Parameters.Add(new SqliteParameter("path", path));
				dbcmd.Parameters.Add(new SqliteParameter("owner", owner));

				int count = dbcmd.ExecuteNonQuery();
				if(count != 1)
					throw new Exception("Create pathlog fails");
			}
		}

		public void DeleteLog(long id)
		{
			lock(instanceLock) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					DeleteLog(dbcon, transaction, id);
					transaction.Commit();
				}
			}
		}
		
		public void DeleteLog(IDbConnection dbcon, IDbTransaction transaction, long id)
		{
			// insert into comment table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM log WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}
		
		public async Task ProcessRequestAsync(HttpContext context)
		{
			long id = 0;
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// GET /[id] get a log
			if((context.Request.Method == "GET") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				JsonValue log = GetLog(id);

				Rights.EnsureCanReadLog(context, log["owner"]);

				if(log == null)
					context.Response.StatusCode = 404;
				else {
					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
					context.Response.Content = new JsonContent(log);
				}
			}
			// GET /[?limit=100][&user=12] get all logs
			else if((context.Request.Method == "GET") && (parts.Length == 0)) {
				int limit = 20000;
				if(context.Request.QueryString.ContainsKey("limit"))
					limit = Math.Min(20000, Math.Max(0, Convert.ToInt32(context.Request.QueryString["limit"])));

				JsonArray res = new JsonArray();

				if(context.Request.QueryString.ContainsKey("user")) {
					Rights.EnsureCanReadLog(context, context.Request.QueryString["user"]);
					res = GetUserLogs(context.Request.QueryString["user"], limit);
				}
				else {
					Rights.EnsureCanReadAllLogs(context);
					res = GetLogs(limit);
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(res);
			}
			// POST / create a log
			else if((context.Request.Method == "POST") && (parts.Length == 0)) {
				JsonValue json = await context.Request.ReadAsJsonAsync();

				Rights.EnsureCanCreateLog(context, json["owner"]);

				CreateLog(json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[log] delete a log
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && long.TryParse(parts[0], out id)) {
				JsonValue log = GetLog(id);

				Rights.EnsureCanDeleteLog(context, log["owner"]);

				DeleteLog(id);
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
