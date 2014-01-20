using System;
using System.IO;
using System.Data;
using System.Text;
using System.Collections.Generic;
using Mono.Data.Sqlite;

namespace Migration
{
	struct RssSync
	{
		public long ResourceId;
		public long StorageId;
		public long SyncId;
	}

	struct CommentInfo
	{
		public long Id;
		public long Storage;
		public long File;
		public string Comment;
	}

	class MainClass
	{
		public static long CreateStorage(IDbConnection dbcon, long quota)
		{
			long storageId;
			using(IDbTransaction transaction = dbcon.BeginTransaction()) {				
				// insert into storage table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO storage (quota,used,ctime,mtime) VALUES ("+quota+",0,datetime('now'),datetime('now'))";
					int count = dbcmd.ExecuteNonQuery();
					if(count != 1)
						throw new Exception("Create Storage fails");
				}

				// get the insert id
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT last_insert_rowid()";
					storageId = Convert.ToInt64(dbcmd.ExecuteScalar());
				}

				// create the corresponding directory
				// to store files
				Directory.CreateDirectory("storage/"+storageId.ToString());
				
				// commit the transaction
				transaction.Commit();
			}
			return storageId;
		}

		public static long CreateFile(IDbConnection dbcon, long storage, string name, string content)
		{
			long id = 0;

			byte[] data = Encoding.UTF8.GetBytes(content);
			using(IDbTransaction transaction = dbcon.BeginTransaction()) {
				// insert into file table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO file "+
						"(storage_id,parent_id,name,mimetype,ctime,mtime,size) VALUES "+
						"("+storage+",0,'"+name.Replace("'","''")+"','text/uri-list',datetime('now'),datetime('now'),"+data.Length+")";
					int count = dbcmd.ExecuteNonQuery();
					if(count != 1)
						throw new Exception("Create Storage fails");
				}
				// get the insert id
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT last_insert_rowid()";
					id = Convert.ToInt64(dbcmd.ExecuteScalar());
				}

				// create the corresponding file
				File.WriteAllBytes("storage/"+storage+"/"+id, data);

				// commit the transaction
				transaction.Commit();
			}
			return id;
		}

		public static long CreateRssSync(IDbConnection dbcon, string table, string url, long storage)
		{
			long id;
			using(IDbTransaction transaction = dbcon.BeginTransaction()) {				
				// insert into table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO "+table+" (url,storage) VALUES ('"+url.Replace("'","''")+"',"+storage+")";
					int count = dbcmd.ExecuteNonQuery();
					if(count != 1)
						throw new Exception("Create RSS sync fails");
				}
				// get the insert id
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT last_insert_rowid()";
					id = Convert.ToInt64(dbcmd.ExecuteScalar());
				}
				// commit the transaction
				transaction.Commit();
			}
			return id;
		}

		public static void Main(string[] args)
		{
			// copy files
			Console.WriteLine("Copy files");
			File.Copy("users.db.org", "users.db", true);
			File.Copy("news.db.org", "news.db", true);
			File.Copy("picasa.db.org", "picasa.db", true);
			File.Copy("podcast.db.org", "podcast.db", true);
			File.Copy("storages.db.org", "storages.db", true);
			File.Copy("comment.db.org", "comment.db", true);
			File.Copy("messages.db.org", "messages.db", true);
			Directory.Delete("storage", true);
			Directory.CreateDirectory("storage");

			IDbConnection usersDbcon = (IDbConnection)new SqliteConnection("URI=file:users.db");
			usersDbcon.Open();
			// disable disk sync. logs are not critical
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}

			IDbConnection storageDbcon = (IDbConnection)new SqliteConnection("URI=file:storages.db");
			storageDbcon.Open();
			// disable disk sync. logs are not critical
			using(IDbCommand dbcmd = storageDbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}

			// integrate storage_id
			Console.WriteLine("Integrate storage_id");
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "UPDATE resource SET storage_id=data WHERE type='storage'";
				dbcmd.ExecuteNonQuery();
			}

			List<RssSync> changed;
			// transform website to files
			Console.WriteLine("Transform website to files");
			changed = new List<RssSync>();
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,data,name FROM resource WHERE type='site'";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long id = reader.GetInt64(0);
						string data = reader.GetString(1);
						string name = reader.GetString(2);

						long storage = CreateStorage(storageDbcon, -1);
						CreateFile(storageDbcon, storage, name, data);

						RssSync item = new RssSync();
						item.ResourceId = id;
						item.StorageId = storage;
						changed.Add(item);
					}
				}
			}
			foreach(RssSync item in changed) {
				using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
					dbcmd.CommandText = "UPDATE resource SET data='"+item.StorageId+"', "+
						"storage_id="+item.StorageId+", type='storage' "+
						"WHERE id="+item.ResourceId;
					dbcmd.ExecuteNonQuery();
				}
			}

			// transform podcast
			Console.WriteLine("Transform podcast");
			IDbConnection podcastDbcon = (IDbConnection)new SqliteConnection("URI=file:podcast.db");
			podcastDbcon.Open();
			changed = new List<RssSync>();
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,data FROM resource WHERE type='podcast'";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long id = reader.GetInt64(0);
						string data = reader.GetString(1);

						long storage = CreateStorage(storageDbcon, -1);
						long rssId = CreateRssSync(podcastDbcon, "podcast", data, storage);

						RssSync item = new RssSync();
						item.ResourceId = id;
						item.StorageId = storage;
						item.SyncId = rssId;
						changed.Add(item);
					}
				}
			}
			podcastDbcon.Close();
			foreach(RssSync item in changed) {
				using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
					dbcmd.CommandText = "UPDATE resource SET data='"+item.SyncId+"',"+
						"storage_id="+item.StorageId+" WHERE id="+item.ResourceId;
					dbcmd.ExecuteNonQuery();
				}
			}

			// transform picasa
			Console.WriteLine("Transform picasa");
			IDbConnection picasaDbcon = (IDbConnection)new SqliteConnection("URI=file:picasa.db");
			picasaDbcon.Open();
			changed = new List<RssSync>();
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,data FROM resource WHERE type='picasa'";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long id = reader.GetInt64(0);
						string data = reader.GetString(1);

						if(!data.Contains("&imgmax=1600"))
							data += "&imgmax=1600";

						long storage = CreateStorage(storageDbcon, -1);
						long rssId = CreateRssSync(picasaDbcon, "picasa", data, storage);

						RssSync item = new RssSync();
						item.ResourceId = id;
						item.StorageId = storage;
						item.SyncId = rssId;
						changed.Add(item);
					}
				}
			}
			picasaDbcon.Close();
			foreach(RssSync item in changed) {
				using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
					dbcmd.CommandText = "UPDATE resource SET data='"+item.SyncId+"',"+
						"storage_id="+item.StorageId+" WHERE id="+item.ResourceId;
					dbcmd.ExecuteNonQuery();
				}
			}

			// transform news
			Console.WriteLine("Transform news");
			IDbConnection newsDbcon = (IDbConnection)new SqliteConnection("URI=file:news.db");
			newsDbcon.Open();
			changed = new List<RssSync>();
			using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,data FROM resource WHERE type='news'";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long id = reader.GetInt64(0);
						string data = reader.GetString(1);

						long storage = CreateStorage(storageDbcon, -1);
						long rssId = CreateRssSync(newsDbcon, "news", data, storage);

						RssSync item = new RssSync();
						item.ResourceId = id;
						item.StorageId = storage;
						item.SyncId = rssId;
						changed.Add(item);
					}
				}
			}
			newsDbcon.Close();
			foreach(RssSync item in changed) {
				using(IDbCommand dbcmd = usersDbcon.CreateCommand()) {
					dbcmd.CommandText = "UPDATE resource SET data='"+item.SyncId+"',"+
						"storage_id="+item.StorageId+" WHERE id="+item.ResourceId;
					dbcmd.ExecuteNonQuery();
				}
			}

			// transform comments
			Console.WriteLine("Transform comments");
			IDbConnection commentDbcon = (IDbConnection)new SqliteConnection("URI=file:comment.db");
			commentDbcon.Open();
			Dictionary<long,CommentInfo> commentsMapping = new Dictionary<long,CommentInfo>();
			using(IDbCommand dbcmd = commentDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT owner_id,resource,content,strftime('%s',create_date),id FROM comment";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long owner = reader.GetInt64(0);
						string resource = reader.GetString(1);
						string content = reader.GetString(2);
						long ctime = Convert.ToInt64(reader.GetString(3));
						long id = reader.GetInt64(4);

						string[] tab = resource.Split(':');
						string[] tab2 = tab[1].Split('/');
						long storage = Convert.ToInt64(tab2[0]);
						long file = Convert.ToInt64(tab2[1]);

						using(IDbCommand dbcmd2 = storageDbcon.CreateCommand()) {
							dbcmd2.CommandText = "INSERT INTO comment (file_id,user_id,content,ctime) "+
								"VALUES ("+file+","+owner+",'"+content.Replace("'","''")+"',datetime("+ctime+",'unixepoch'))";
							dbcmd2.ExecuteNonQuery();
						}
						long commentId;
						// get the insert id
						using(IDbCommand dbcmd2 = storageDbcon.CreateCommand()) {
							dbcmd2.CommandText = "SELECT last_insert_rowid()";
							commentId = Convert.ToInt64(dbcmd2.ExecuteScalar());
						}

						CommentInfo info = new CommentInfo();
						info.Storage = storage;
						info.File = file;
						info.Comment = content;
						info.Id = commentId;
						commentsMapping[id] = info;
					}
				}
			}

			// transform comment messages
			Console.WriteLine("Transform comment messages");
			IDbConnection messageDbcon = (IDbConnection)new SqliteConnection("URI=file:messages.db");
			messageDbcon.Open();
			// disable disk sync. logs are not critical
			using(IDbCommand dbcmd = messageDbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
			Dictionary<long,string> messagesChanged = new Dictionary<long,string>();
			List<long> messagesRemoved = new List<long>();
			using(IDbCommand dbcmd = messageDbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,content FROM message WHERE type='comment'";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						long id = reader.GetInt64(0);
						long commentId = Convert.ToInt64(reader.GetString(1));
						if(commentsMapping.ContainsKey(commentId)) {
							CommentInfo info = commentsMapping[commentId];
							// find the corresponding resource
							using(IDbCommand dbcmd2 = usersDbcon.CreateCommand()) {
								dbcmd2.CommandText = "SELECT id FROM resource WHERE storage_id="+info.Storage;
								object res = dbcmd2.ExecuteScalar();
								if(res != null) {
									long resourceId = Convert.ToInt64(res);
									string data = "resource:"+resourceId+":"+info.File+";comment:"+info.Id+";text:"+info.Comment;
									messagesChanged[id] = data;
								}
							}
						}
						else
							messagesRemoved.Add(id);
					}
				}
			}
			foreach(long messageId in messagesChanged.Keys) {
				using(IDbCommand dbcmd = messageDbcon.CreateCommand()) {
					dbcmd.CommandText = "UPDATE message SET "+
						"content='"+messagesChanged[messageId].Replace("'","''")+"' "+
						"WHERE id="+messageId;
					dbcmd.ExecuteNonQuery();
				}
			}
			foreach(long messageId in messagesRemoved) {
				using(IDbCommand dbcmd = messageDbcon.CreateCommand()) {
					dbcmd.CommandText = "DELETE FROM message "+
						"WHERE id="+messageId;
					dbcmd.ExecuteNonQuery();
				}
			}
			messageDbcon.Close();

			commentDbcon.Close();
			storageDbcon.Close();
			usersDbcon.Close();
			Console.WriteLine("End");
		}
	}
}
