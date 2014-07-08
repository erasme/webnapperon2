using System;
using System.IO;
using System.Data;
using System.Text;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;

namespace Migration
{
	class MainClass
	{
		/////////////////////////////////////////////////
		// convert authsession
		/////////////////////////////////////////////////

		public static void ConvertSessions()
		{
			Console.WriteLine("Convert sessions.db");

			using(IDbConnection sessionsOldDbcon = (IDbConnection)new SqliteConnection("URI=file:sessions.db.org")) {
				sessionsOldDbcon.Open();

				File.Delete("sessions.db");

				using(IDbConnection sessionsNewDbcon = (IDbConnection)new SqliteConnection("URI=file:sessions.db")) {
					sessionsNewDbcon.Open();
					// create the session table
					using(IDbCommand dbcmd = sessionsNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE session (id VARCHAR PRIMARY KEY, user VARCHAR, start INTEGER, last INTEGER, permanent INTEGER(1) DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}

					using(IDbCommand dbcmd = sessionsOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,user,start,last,permanent FROM session";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								string id = reader.GetString(0);
								long user = reader.GetInt64(1);
								string start = reader.GetString(2);
								string last = reader.GetString(3);
								long permanent = reader.GetInt64(4);


								using(IDbCommand dbcmd2 = sessionsNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = "INSERT INTO session (id,user,start,last,permanent) VALUES (@id,@user,@start,@last,@permanent)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("user", user.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("start", start));
									dbcmd2.Parameters.Add(new SqliteParameter("last", last));
									dbcmd2.Parameters.Add(new SqliteParameter("permanent", permanent));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}
					sessionsNewDbcon.Close();
				}
				sessionsOldDbcon.Close();
			}
		}

		/////////////////////////////////////////////////
		// convert messages
		/////////////////////////////////////////////////

		public static void ConvertMessages()
		{
			Console.WriteLine("Convert messages.db");

			using(IDbConnection usersOldDbcon = (IDbConnection)new SqliteConnection("URI=file:users.db.org")) {
				usersOldDbcon.Open();

				using(IDbConnection messagesOldDbcon = (IDbConnection)new SqliteConnection("URI=file:messages.db.org")) {
					messagesOldDbcon.Open();

					File.Delete("messages.db");

					using(IDbConnection messagesNewDbcon = (IDbConnection)new SqliteConnection("URI=file:messages.db")) {
						messagesNewDbcon.Open();
						// disable disk sync.
						using(IDbCommand dbcmd = messagesNewDbcon.CreateCommand()) {
							dbcmd.CommandText = "PRAGMA synchronous=0";
							dbcmd.ExecuteNonQuery();
						}
						// create the tables
						using(IDbCommand dbcmd = messagesNewDbcon.CreateCommand()) {
							dbcmd.CommandText = "CREATE TABLE message (id INTEGER PRIMARY KEY AUTOINCREMENT, origin_id VARCHAR, destination_id VARCHAR, content VARCHAR DEFAULT NULL, create_date INTEGER, seen_date INTEGER, type VARCHAR DEFAULT NULL)";
							dbcmd.ExecuteNonQuery();
						}
						// create connection log table
						using(IDbCommand dbcmd = messagesNewDbcon.CreateCommand()) {
							dbcmd.CommandText = "CREATE TABLE log (id INTEGER PRIMARY KEY AUTOINCREMENT, user VARCHAR, address INTEGER, port INTEGER, open INTEGER(1) DEFAULT 1, date INTEGER)";
							dbcmd.ExecuteNonQuery();
						}

						using(IDbCommand dbcmd = messagesOldDbcon.CreateCommand()) {
							dbcmd.CommandText = "SELECT id,origin_id,destination_id,content,create_date,seen_date,type FROM message";
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {
									long id = reader.GetInt64(0);
									long origin_id = reader.GetInt64(1);
									long destination_id = reader.GetInt64(2);
									string content = null;
									if(!reader.IsDBNull(3))
										content = reader.GetString(3);
									string create_date = null;
									if(!reader.IsDBNull(4))
										create_date = reader.GetString(4);
									string seen_date = null;
									if(!reader.IsDBNull(5))
										seen_date = reader.GetString(5);
									string type = reader.GetString(6);

									// handle the content depending on the type
									JsonValue json = null;
									if(type == "message") {
										json = content;
									}
									else if(type == "contact") {
										json = content;
									}
									else if(type == "resource") {
										json = new JsonObject();
										json["id"] = content;
										using(IDbCommand dbcmd2 = usersOldDbcon.CreateCommand()) {
											dbcmd2.CommandText = "SELECT name FROM resource WHERE id=@id";
											dbcmd2.Parameters.Add(new SqliteParameter("id", Convert.ToInt64(content)));
											object res = dbcmd2.ExecuteScalar();
											if(res != null)
												json["name"] = (string)res;
											else
												json["name"] = "";
										}
									}
									else if(type == "comment") {
										int pos = content.IndexOf(';');
										string[] parts = content.Substring(0, pos).Split(':');
										content = content.Substring(pos + 1);

										json = new JsonObject();
										JsonValue resource = new JsonObject();
										json["resource"] = resource;
										resource["id"] = parts[1];

										using(IDbCommand dbcmd2 = usersOldDbcon.CreateCommand()) {
											dbcmd2.CommandText = "SELECT name FROM resource WHERE id=@id";
											dbcmd2.Parameters.Add(new SqliteParameter("id", Convert.ToInt64((string)resource["id"])));
											object res = dbcmd2.ExecuteScalar();
											if(res != null)
												resource["name"] = (string)res;
											else
												resource["name"] = "";
										}

										json["file"] = Convert.ToInt64(parts[2]);

										pos = content.IndexOf(';');
										parts = content.Substring(0, pos).Split(':');
										content = content.Substring(pos + 1);

										json["comment"] = Convert.ToInt64(parts[1]);

										pos = content.IndexOf(':');
										json["text"] = content.Substring(pos + 1);
									}

									using(IDbCommand dbcmd2 = messagesNewDbcon.CreateCommand()) {
										dbcmd2.CommandText = 
										"INSERT INTO message (id,origin_id,destination_id,content,create_date,seen_date,type) " +
										"VALUES (@id,@origin_id,@destination_id,@content,@create_date,@seen_date,@type)";
										dbcmd2.Parameters.Add(new SqliteParameter("id", id));
										dbcmd2.Parameters.Add(new SqliteParameter("origin_id", origin_id.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("destination_id", destination_id.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("content", json.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("create_date", create_date));
										dbcmd2.Parameters.Add(new SqliteParameter("seen_date", seen_date));
										dbcmd2.Parameters.Add(new SqliteParameter("type", type));
										dbcmd2.ExecuteNonQuery();
									}
								}
							}
						}
						using(IDbCommand dbcmd = messagesOldDbcon.CreateCommand()) {
							dbcmd.CommandText = "SELECT id,user,address,port,open,date FROM log";
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {
									long id = reader.GetInt64(0);
									long user = reader.GetInt64(1);
									long address = reader.GetInt64(2);
									long port = reader.GetInt64(3);
									long open = reader.GetInt64(4);
									string date = reader.GetString(5);
									using(IDbCommand dbcmd2 = messagesNewDbcon.CreateCommand()) {
										dbcmd2.CommandText = 
										"INSERT INTO log (id,user,address,port,open,date) " +
										"VALUES (@id,@user,@address,@port,@open,@date)";
										dbcmd2.Parameters.Add(new SqliteParameter("id", id));
										dbcmd2.Parameters.Add(new SqliteParameter("user", user.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("address", address));
										dbcmd2.Parameters.Add(new SqliteParameter("port", port));
										dbcmd2.Parameters.Add(new SqliteParameter("open", open));
										dbcmd2.Parameters.Add(new SqliteParameter("date", date));
										dbcmd2.ExecuteNonQuery();
									}
								}
							}
						}
						messagesNewDbcon.Close();
					}
					messagesOldDbcon.Close();
				}
				usersOldDbcon.Close();
			}
		}

		/////////////////////////////////////////////////
		// convert pathlog
		/////////////////////////////////////////////////

		public static void ConvertPathLog()
		{
			Console.WriteLine("Convert pathlog.db");

			using(IDbConnection pathlogOldDbcon = (IDbConnection)new SqliteConnection("URI=file:pathlog.db.org")) {
				pathlogOldDbcon.Open();

				File.Delete("pathlog.db");

				using(IDbConnection pathlogNewDbcon = (IDbConnection)new SqliteConnection("URI=file:pathlog.db")) {
					pathlogNewDbcon.Open();
					// disable disk sync.
					using(IDbCommand dbcmd = pathlogNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "PRAGMA synchronous=0";
						dbcmd.ExecuteNonQuery();
					}
					// create the session table
					using(IDbCommand dbcmd = pathlogNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE log (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id VARCHAR, path VARCHAR, create_date INTEGER)";
						dbcmd.ExecuteNonQuery();
					}
					using(IDbCommand dbcmd = pathlogOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,owner_id,path,create_date FROM log";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long owner_id = reader.GetInt64(1);
								string path = reader.GetString(2);
								string create_date = reader.GetString(3);

								using(IDbCommand dbcmd2 = pathlogNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = "INSERT INTO log (id,owner_id,path,create_date) VALUES (@id,@owner_id,@path,@create_date)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("owner_id", owner_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("path", path));
									dbcmd2.Parameters.Add(new SqliteParameter("create_date", create_date));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}
					pathlogNewDbcon.Close();
				}
				pathlogOldDbcon.Close();
			}
		}

		/////////////////////////////////////////////////
		// convert storage
		/////////////////////////////////////////////////

		public static void ConvertStorages()
		{
			Console.WriteLine("Convert storages.db");

			using(IDbConnection storagesOldDbcon = (IDbConnection)new SqliteConnection("URI=file:storages.db.org")) {
				storagesOldDbcon.Open();

				File.Delete("storages.db");

				using(IDbConnection storagesNewDbcon = (IDbConnection)new SqliteConnection("URI=file:storages.db")) {
					storagesNewDbcon.Open();
					// disable disk sync.
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "PRAGMA synchronous=0";
						dbcmd.ExecuteNonQuery();
					}
					// create the storage table
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE storage (id VARCHAR PRIMARY KEY, quota INTEGER DEFAULT 0, used INTEGER DEFAULT 0, ctime INTEGER, mtime INTEGER, rev INTEGER DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}
					// create the file table
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE file (id INTEGER PRIMARY KEY AUTOINCREMENT, storage_id VARCHAR, parent_id INTEGER DEFAULT 0, name VARCHAR, mimetype VARCHAR, ctime INTEGER, mtime INTEGER, rev INTEGER DEFAULT 0, size INTEGER DEFAULT 0, position INTEGER DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}
					// create the meta table (description fields attached to files)
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE meta (owner_id INTEGER, key VARCHAR, value VARCHAR)";
						dbcmd.ExecuteNonQuery();
					}
					// create the cache table (description fields attached to files)
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE cache (owner_id INTEGER, key VARCHAR, value VARCHAR)";
						dbcmd.ExecuteNonQuery();
					}
					// create the comment table (user comments attached to files)
					using(IDbCommand dbcmd = storagesNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE comment "+
						                "(id INTEGER PRIMARY KEY AUTOINCREMENT, file_id INTEGER, "+
						                "user_id VARCHAR, content VARCHAR, ctime INTEGER, mtime INTEGER)";
						dbcmd.ExecuteNonQuery();
					}
					using(IDbCommand dbcmd = storagesOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,quota,used,ctime,mtime,rev FROM storage";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long quota = reader.GetInt64(1);
								long used = reader.GetInt64(2);
								string ctime = reader.GetString(3);
								string mtime = reader.GetString(4);
								long rev = reader.GetInt64(5);

								using(IDbCommand dbcmd2 = storagesNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = "INSERT INTO storage (id,quota,used,ctime,mtime,rev) VALUES (@id,@quota,@used,@ctime,@mtime,@rev)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("quota", quota));
									dbcmd2.Parameters.Add(new SqliteParameter("used", used));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("mtime", mtime));
									dbcmd2.Parameters.Add(new SqliteParameter("rev", rev));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}
					using(IDbCommand dbcmd = storagesOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,storage_id,parent_id,name,mimetype,ctime,mtime,rev,size,position FROM file";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long storage_id = reader.GetInt64(1);
								long parent_id = reader.GetInt64(2);
								string name = reader.GetString(3);
								string mimetype = reader.GetString(4);
								string ctime = reader.GetString(5);
								string mtime = reader.GetString(6);
								long rev = reader.GetInt64(7);
								long size = reader.GetInt64(8);
								long position = reader.GetInt64(9);

								using(IDbCommand dbcmd2 = storagesNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO file (id,storage_id,parent_id,name,mimetype,ctime,mtime,rev,size,position) "+
										"VALUES (@id,@storage_id,@parent_id,@name,@mimetype,@ctime,@mtime,@rev,@size,@position)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("storage_id", storage_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("parent_id", parent_id));
									dbcmd2.Parameters.Add(new SqliteParameter("name", name));
									dbcmd2.Parameters.Add(new SqliteParameter("mimetype", mimetype));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("mtime", mtime));
									dbcmd2.Parameters.Add(new SqliteParameter("rev", rev));
									dbcmd2.Parameters.Add(new SqliteParameter("size", size));
									dbcmd2.Parameters.Add(new SqliteParameter("position", position));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}
					using(IDbCommand dbcmd = storagesOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT owner_id,key,value FROM meta";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long owner_id = reader.GetInt64(0);
								string key = reader.GetString(1);
								string value = reader.GetString(2);

								using(IDbCommand dbcmd2 = storagesNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO meta (owner_id,key,value) "+
										"VALUES (@owner_id,@key,@value)";
									dbcmd2.Parameters.Add(new SqliteParameter("owner_id", owner_id));
									dbcmd2.Parameters.Add(new SqliteParameter("key", key));
									dbcmd2.Parameters.Add(new SqliteParameter("value", value));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}
					using(IDbCommand dbcmd = storagesOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,file_id,user_id,content,ctime,mtime FROM comment";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long file_id = reader.GetInt64(1);
								long user_id = reader.GetInt64(2);
								string content = reader.GetString(3);
								string ctime = reader.GetString(4);
								string mtime = null;
								if(!reader.IsDBNull(5))
									mtime = reader.GetString(5);

								using(IDbCommand dbcmd2 = storagesNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO comment (id,file_id,user_id,content,ctime,mtime) "+
										"VALUES (@id,@file_id,@user_id,@content,@ctime,@mtime)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("file_id", file_id));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("content", content));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("mtime", mtime));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					storagesNewDbcon.Close();
				}
				storagesOldDbcon.Close();
			}
		}

		/////////////////////////////////////////////////
		// convert user / picasa / podcast / news
		/////////////////////////////////////////////////

		public static void ConvertUsers()
		{
			Console.WriteLine("Convert users.db");

			using(IDbConnection usersOldDbcon = (IDbConnection)new SqliteConnection("URI=file:users.db.org")) {
				usersOldDbcon.Open();

				File.Delete("users.db");

				using(IDbConnection usersNewDbcon = (IDbConnection)new SqliteConnection("URI=file:users.db")) {
					usersNewDbcon.Open();
					// disable disk sync.
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "PRAGMA synchronous=0";
						dbcmd.ExecuteNonQuery();
					}
					// create the user table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE user (id VARCHAR PRIMARY KEY, firstname VARCHAR, "+
						                "lastname VARCHAR, description VARCHAR, email VARCHAR, login VARCHAR, password VARCHAR, "+
						                "admin INTEGER(1) DEFAULT 0 NOT NULL, googleid VARCHAR DEFAULT NULL, "+
						                "facebookid VARCHAR DEFAULT NULL, face_rev INTEGER DEFAULT 0,"+
						                "email_notify_message_received INTEGER(1) DEFAULT 0, "+
						                "email_notify_contact_added INTEGER(1) DEFAULT 0, "+
						                "email_notify_resource_shared INTEGER(1) DEFAULT 0, "+
						                "email_notify_comment_added INTEGER(1) DEFAULT 0, "+
						                "create_date INTEGER, default_friend INTEGER(1) DEFAULT 0 NOT NULL,"+
						                "default_share_right INTEGER(1) DEFAULT 0, default_write_right INTEGER(1) DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}
					// create the contact table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = 
							"CREATE TABLE contact (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id VARCHAR, "+
							"contact_id VARCHAR, position INTEGER DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}
					// create the resource table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = 
							"CREATE TABLE resource "+
							"(id VARCHAR PRIMARY KEY, owner_id VARCHAR, "+
							"type VARCHAR, name VARCHAR, data VARCHAR, public_read INTEGER(1) DEFAULT 0, "+
							"public_write INTEGER(1) DEFAULT 0, public_share INTEGER(1) DEFAULT 0, "+
							"ctime INTEGER, rev INTEGER DEFAULT 0, storage_id VARCHAR DEFAULT NULL)";
						dbcmd.ExecuteNonQuery();
					}
					// create the resource seen table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE resource_seen (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id VARCHAR, user_id VARCHAR, seen_rev INTEGER)";
						dbcmd.ExecuteNonQuery();
					}
					// create the right table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE right (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_id VARCHAR, user_id VARCHAR, read INTEGER(1), write INTEGER(1), share INTEGER(1))";
						dbcmd.ExecuteNonQuery();
					}
					// create the bookmark table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id VARCHAR, resource_id VARCHAR, position INTEGER DEFAULT 0)";
						dbcmd.ExecuteNonQuery();
					}
					// create the rfid table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE rfid (id VARCHAR, user_id VARCHAR, path VARCHAR)";
						dbcmd.ExecuteNonQuery();
					}
					// create the device table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE device (id VARCHAR PRIMARY KEY, user_id VARCHAR, ctime INTEGER, name VARCHAR)";
						dbcmd.ExecuteNonQuery();
					}
					// create the reader table
					using(IDbCommand dbcmd = usersNewDbcon.CreateCommand()) {
						dbcmd.CommandText = "CREATE TABLE reader (id VARCHAR PRIMARY KEY, user_id VARCHAR, ctime INTEGER, device_id VARCHAR, name VARCHAR)";
						dbcmd.ExecuteNonQuery();
					}

					// fill the user table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = 
							"SELECT id,firstname,lastname,description,email,login,password," +
							"admin,googleid,facebookid,face_rev,email_notify_message_received," +
							"email_notify_contact_added,email_notify_resource_shared," +
							"email_notify_comment_added,create_date,default_friend," +
							"default_share_right,default_write_right FROM user";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								string firstname = null;
								if(!reader.IsDBNull(1))
									firstname = reader.GetString(1);
								string lastname = null;
								if(!reader.IsDBNull(2))
									lastname = reader.GetString(2);
								string description = null;
								if(!reader.IsDBNull(3))
									description = reader.GetString(3);
								string email = null;
								if(!reader.IsDBNull(4))
									email = reader.GetString(4);
								string login = null;
								if(!reader.IsDBNull(5))
									login = reader.GetString(5);
								string password = null;
								if(!reader.IsDBNull(6))
									password = reader.GetString(6);
								long admin = reader.GetInt64(7);
								string googleid = null;
								if(!reader.IsDBNull(8))
									googleid = reader.GetString(8);
								string facebookid = null;
								if(!reader.IsDBNull(9))
									facebookid = reader.GetString(9);
								long face_rev = reader.GetInt64(10);
								long email_notify_message_received = reader.GetInt64(11);
								long email_notify_contact_added = reader.GetInt64(12);
								long email_notify_resource_shared = reader.GetInt64(13);
								long email_notify_comment_added = reader.GetInt64(14);
								string create_date = reader.GetString(15);
								long default_friend = reader.GetInt64(16);
								long default_share_right = reader.GetInt64(17);
								long default_write_right = reader.GetInt64(18);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO user " +
										"(id,firstname,lastname,description,email,login,password," +
										"admin,googleid,facebookid,face_rev,email_notify_message_received," +
										"email_notify_contact_added,email_notify_resource_shared," +
										"email_notify_comment_added,create_date,default_friend," +
										"default_share_right,default_write_right) VALUES " +
										"(@id,@firstname,@lastname,@description,@email,@login,@password," +
										"@admin,@googleid,@facebookid,@face_rev,@email_notify_message_received," +
										"@email_notify_contact_added,@email_notify_resource_shared," +
										"@email_notify_comment_added,@create_date,@default_friend," +
										"@default_share_right,@default_write_right)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("firstname", firstname));
									dbcmd2.Parameters.Add(new SqliteParameter("lastname", lastname));
									dbcmd2.Parameters.Add(new SqliteParameter("description", description));
									dbcmd2.Parameters.Add(new SqliteParameter("email", email));
									dbcmd2.Parameters.Add(new SqliteParameter("login", login));
									dbcmd2.Parameters.Add(new SqliteParameter("password", password));
									dbcmd2.Parameters.Add(new SqliteParameter("admin", admin));
									dbcmd2.Parameters.Add(new SqliteParameter("googleid", googleid));
									dbcmd2.Parameters.Add(new SqliteParameter("facebookid", facebookid));
									dbcmd2.Parameters.Add(new SqliteParameter("face_rev", face_rev));
									dbcmd2.Parameters.Add(new SqliteParameter("email_notify_message_received", email_notify_message_received));
									dbcmd2.Parameters.Add(new SqliteParameter("email_notify_contact_added", email_notify_contact_added));
									dbcmd2.Parameters.Add(new SqliteParameter("email_notify_resource_shared", email_notify_resource_shared));
									dbcmd2.Parameters.Add(new SqliteParameter("email_notify_comment_added", email_notify_comment_added));
									dbcmd2.Parameters.Add(new SqliteParameter("create_date", create_date));
									dbcmd2.Parameters.Add(new SqliteParameter("default_friend", default_friend));
									dbcmd2.Parameters.Add(new SqliteParameter("default_share_right", default_share_right));
									dbcmd2.Parameters.Add(new SqliteParameter("default_write_right", default_write_right));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the contact table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,user_id,contact_id,position FROM contact";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long user_id = reader.GetInt64(1);
								long contact_id = reader.GetInt64(2);
								long position = reader.GetInt64(3);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO contact (id,user_id,contact_id,position) "+
										"VALUES (@id,@user_id,@contact_id,@position)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("contact_id", contact_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("position", position));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the resource table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,owner_id,type,name,data,public_read,public_write,public_share,ctime,rev,storage_id FROM resource";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long owner_id = reader.GetInt64(1);
								string type = reader.GetString(2);
								string name = reader.GetString(3);
								string data = reader.GetString(4);
								long public_read = reader.GetInt64(5);
								long public_write = reader.GetInt64(6);
								long public_share = reader.GetInt64(7);
								string ctime = reader.GetString(8);
								long rev = reader.GetInt64(9);
								string storage_id = null;
								if(!reader.IsDBNull(10))
									storage_id = reader.GetInt64(10).ToString();

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO resource (id,owner_id,type,name,data,public_read,public_write,public_share,ctime,rev,storage_id) "+
										"VALUES (@id,@owner_id,@type,@name,@data,@public_read,@public_write,@public_share,@ctime,@rev,@storage_id)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("owner_id", owner_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("type", type));
									dbcmd2.Parameters.Add(new SqliteParameter("name", name));
									dbcmd2.Parameters.Add(new SqliteParameter("data", data));
									dbcmd2.Parameters.Add(new SqliteParameter("public_read", public_read));
									dbcmd2.Parameters.Add(new SqliteParameter("public_write", public_write));
									dbcmd2.Parameters.Add(new SqliteParameter("public_share", public_share));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("rev", rev));
									dbcmd2.Parameters.Add(new SqliteParameter("storage_id", storage_id));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the resource seen table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,resource_id,user_id,seen_rev FROM resource_seen";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long resource_id = reader.GetInt64(1);
								long user_id = reader.GetInt64(2);
								long seen_rev = reader.GetInt64(3);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO resource_seen (id,resource_id,user_id,seen_rev) "+
										"VALUES (@id,@resource_id,@user_id,@seen_rev)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("resource_id", resource_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("seen_rev", seen_rev));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the right table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,resource_id,user_id,read,write,share FROM right";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long resource_id = reader.GetInt64(1);
								long user_id = reader.GetInt64(2);
								long read = reader.GetInt64(3);
								long write = reader.GetInt64(4);
								long share = reader.GetInt64(5);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO right (id,resource_id,user_id,read,write,share) "+
										"VALUES (@id,@resource_id,@user_id,@read,@write,@share)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("resource_id", resource_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("read", read));
									dbcmd2.Parameters.Add(new SqliteParameter("write", write));
									dbcmd2.Parameters.Add(new SqliteParameter("share", share));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the bookmark table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,owner_id,resource_id,position FROM bookmark";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								long id = reader.GetInt64(0);
								long owner_id = reader.GetInt64(1);
								long resource_id = reader.GetInt64(2);
								long position = reader.GetInt64(3);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO bookmark (id,owner_id,resource_id,position) "+
										"VALUES (@id,@owner_id,@resource_id,@position)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("owner_id", owner_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("resource_id", resource_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("position", position));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the rfid table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,user_id,path FROM rfid";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								string id = reader.GetString(0);
								long user_id = reader.GetInt64(1);
								string path = reader.GetString(2);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO rfid (id,user_id,path) "+
										"VALUES (@id,@user_id,@path)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("path", path));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the device table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,user_id,ctime,name FROM device";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								string id = reader.GetString(0);
								long user_id = reader.GetInt64(1);
								string ctime = reader.GetString(2);
								string name = reader.GetString(3);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO device (id,user_id,ctime,name) "+
										"VALUES (@id,@user_id,@ctime,@name)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("name", name));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// fill the reader table
					using(IDbCommand dbcmd = usersOldDbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,user_id,ctime,device_id,name FROM reader";
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {

								string id = reader.GetString(0);
								long user_id = reader.GetInt64(1);
								string ctime = reader.GetString(2);
								string device_id = null;
								if(!reader.IsDBNull(3))
									device_id = reader.GetString(3);
								string name = reader.GetString(4);

								using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
									dbcmd2.CommandText = 
										"INSERT INTO reader (id,user_id,ctime,device_id,name) "+
										"VALUES (@id,@user_id,@ctime,@device_id,@name)";
									dbcmd2.Parameters.Add(new SqliteParameter("id", id));
									dbcmd2.Parameters.Add(new SqliteParameter("user_id", user_id.ToString()));
									dbcmd2.Parameters.Add(new SqliteParameter("ctime", ctime));
									dbcmd2.Parameters.Add(new SqliteParameter("device_id", device_id));
									dbcmd2.Parameters.Add(new SqliteParameter("name", name));
									dbcmd2.ExecuteNonQuery();
								}
							}
						}
					}

					// update user data for picasa resource
					using(IDbConnection picasaOldDbcon = (IDbConnection)new SqliteConnection("URI=file:picasa.db.org")) {
						picasaOldDbcon.Open();

						using(IDbCommand dbcmd = picasaOldDbcon.CreateCommand()) {
							dbcmd.CommandText = "SELECT id,url,strftime('%s',utime),failcount FROM picasa";
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {

									long id = reader.GetInt64(0);
									string url = reader.GetString(1);
									long utime = 0;
									if(!reader.IsDBNull(2))
										utime = Convert.ToInt64(reader.GetString(2));
									long failcount = reader.GetInt64(3);

									JsonValue json = new JsonObject();
									json["url"] = url;
									json["utime"] = utime;
									json["failcount"] = failcount;

									using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
										dbcmd2.CommandText = 
											"UPDATE resource SET data=@data WHERE type='picasa' AND data=@id";
										dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("data", json.ToString()));
										dbcmd2.ExecuteNonQuery();
									}
								}
							}
						}
						picasaOldDbcon.Close();
					}

					// update user data for podcast resource
					using(IDbConnection podcastOldDbcon = (IDbConnection)new SqliteConnection("URI=file:podcast.db.org")) {
						podcastOldDbcon.Open();

						using(IDbCommand dbcmd = podcastOldDbcon.CreateCommand()) {
							dbcmd.CommandText = "SELECT id,url,strftime('%s',utime),failcount FROM podcast";
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {

									long id = reader.GetInt64(0);
									string url = reader.GetString(1);
									long utime = 0;
									if(!reader.IsDBNull(2))
										utime = Convert.ToInt64(reader.GetString(2));
									long failcount = reader.GetInt64(3);

									JsonValue json = new JsonObject();
									json["url"] = url;
									json["utime"] = utime;
									json["failcount"] = failcount;

									using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
										dbcmd2.CommandText = 
											"UPDATE resource SET data=@data WHERE type='podcast' AND data=@id";
										dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("data", json.ToString()));
										dbcmd2.ExecuteNonQuery();
									}
								}
							}
						}
						podcastOldDbcon.Close();
					}

					// update user data for news resource
					using(IDbConnection newsOldDbcon = (IDbConnection)new SqliteConnection("URI=file:news.db.org")) {
						newsOldDbcon.Open();

						using(IDbCommand dbcmd = newsOldDbcon.CreateCommand()) {
							dbcmd.CommandText = "SELECT id,url,strftime('%s',utime),failcount,fullcontent FROM news";
							using(IDataReader reader = dbcmd.ExecuteReader()) {
								while(reader.Read()) {

									long id = reader.GetInt64(0);
									string url = reader.GetString(1);
									long utime = 0;
									if(!reader.IsDBNull(2))
										utime = Convert.ToInt64(reader.GetString(2));
									long failcount = reader.GetInt64(3);
									long fullcontent = reader.GetInt64(4);

									JsonValue json = new JsonObject();
									json["url"] = url;
									json["utime"] = utime;
									json["failcount"] = failcount;
									json["fullcontent"] = (fullcontent != 0);

									using(IDbCommand dbcmd2 = usersNewDbcon.CreateCommand()) {
										dbcmd2.CommandText = 
											"UPDATE resource SET data=@data WHERE type='news' AND data=@id";
										dbcmd2.Parameters.Add(new SqliteParameter("id", id.ToString()));
										dbcmd2.Parameters.Add(new SqliteParameter("data", json.ToString()));
										dbcmd2.ExecuteNonQuery();
									}
								}
							}
						}
						newsOldDbcon.Close();
					}

					usersNewDbcon.Close();
				}
				usersOldDbcon.Close();
			}
		}


		public static void Main(string[] args)
		{
			ConvertSessions();
			ConvertMessages();
			ConvertPathLog();
			ConvertStorages();
			ConvertUsers();
		}
	}
}
