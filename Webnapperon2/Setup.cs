// Setup.cs
// 
//  Setup of the Webnapperon2 HTTP server
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
using System.Xml.Serialization;

namespace Webnapperon2
{
	public class Setup
	{
		/// <summary>
		/// The name of the server.
		/// </summary>
		[XmlAttribute]
		public string ServerName = "localhost";

		/// <summary>
		/// The TCP port to listen on.
		/// </summary>
		[XmlAttribute]
		public int Port = 80;

		/// <summary>
		/// The public base URL of the WebNapperon2. 
		/// This can be different from the ServerName and Port
		/// if behind an HTTP reverse proxy
		/// </summary>
		[XmlAttribute]
		public string PublicUrl = "http://localhost/";

		/// <summary>
		/// Path to access
		/// </summary>
		[XmlAttribute]
		public string Path = "/cloud";
		
		/// <summary>
		/// Directory to save data
		/// </summary>
		[XmlAttribute]
		public string Storage = "/var/lib/webnapperon2";

		/// <summary>
		/// Directory to save logs
		/// </summary>
		[XmlAttribute]
		public string Log = "/var/log/webnapperon2";

		/// <summary>
		/// Directory to load shared static resources like web pages
		/// </summary>
		[XmlAttribute]
		public string Static = "/usr/share/webnapperon2/";

		/// <summary>
		/// Name of the cookie to use for authentication session
		/// </summary>
		[XmlAttribute]
		public string AuthCookie = "WEBNAPPERON_AUTH";

		/// <summary>
		/// Name of the cookie to use for authentication session
		/// </summary>
		[XmlAttribute]
		public string AuthHeader = "X-Webnapperon-Authentication";
		
		/// <summary>
		/// Number of second to keep a user authenticate session active
		/// </summary>
		[XmlAttribute]
		public int AuthSessionTimeout = 10;

		[XmlAttribute]
		public string GoogleClientId = "client_id";
		
		[XmlAttribute]
		public string GoogleClientSecret = "client_secret";
		
		[XmlAttribute]
		public string GoogleAuthRedirectUrl = "http://localhost/googleoauth2";

		[XmlAttribute]
		public string FacebookClientId = "client_id";
		
		[XmlAttribute]
		public string FacebookClientSecret = "client_secret";
		
		[XmlAttribute]
		public string FacebookAuthRedirectUrl = "http://localhost/facebookoauth2";

		/// <summary>
		/// The SMTP server to use for send emails
		/// </summary>
		[XmlAttribute]
		public string SmtpServer = "localhost";

		/// <summary>
		/// The From email address to use when sending emails
		/// </summary>
		[XmlAttribute]
		public string SmtpFrom = "webnapperon2@localhost";

		/// <summary>
		/// Heavy tasks are enqueued and run asynchronously.
		/// Set the number of thread to execute in parallel
		/// (for exemple number of processors * number of cores * 1.5)
		/// </summary>
		[XmlAttribute]
		public int MaximumConcurrency = 2;

		/// <summary>
		/// Directory to use for temporary files
		/// </summary>
		[XmlAttribute]
		public string TemporaryDirectory = "/var/lib/webnapperon2/tmp";

		/// <summary>
		/// Set the HTTP Keep-Alive timeout in second
		/// </summary>
		[XmlAttribute]
		public double HttpKeepAliveTimeout = 10;

		/// <summary>
		/// Set the maximum request to handle in an HTTP Keep-Alive connection
		/// </summary>
		[XmlAttribute]
		public int HttpKeepAliveMax = 50;

		/// <summary>
		/// Set the default value to use for caching "cachable" data in seconds
		/// </summary>
		[XmlAttribute]
		public int DefaultCacheDuration = 3600*12;

		/// <summary>
		/// The STUN server for WebRTC.
		/// </summary>
		[XmlAttribute]
		public string StunServer = "stun.services.mozilla.com";

		/// <summary>
		/// The STUN server UDP port for WebRTC.
		/// </summary>
		[XmlAttribute]
		public int StunPort = 3478;

		/// <summary>
		/// Decide wether or not the HTTP server can use
		/// GZip compression if supported by the client.
		/// For performance, it could be a good idea to
		/// disable it if behind and HTTP revers proxy
		/// </summary>
		[XmlAttribute]
		public bool AllowGZip = true;
	}
}
