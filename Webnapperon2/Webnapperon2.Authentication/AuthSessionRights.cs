//
// AuthSessionRights.cs
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
using Erasme.Cloud.Authentication;
using Webnapperon2.User;

namespace Webnapperon2.Authentication
{
	public class AuthSessionRights: IAuthSessionRights
	{
		UserService userService;

		public AuthSessionRights(UserService userService)
		{
			this.userService = userService;
		}

		public void EnsureCanCreateSession(HttpContext context, string user)
		{
			userService.EnsureIsAdmin(context);
		}

		public void EnsureCanReadSession(HttpContext context, string session, string user)
		{
		}

		public void EnsureCanDeleteSession(HttpContext context, string session, string user)
		{
			userService.EnsureIsAuthenticated(context);
			if(context.User != user)
				userService.EnsureCanAdminUser(context, user);
		}

		public void EnsureCanSearchSessions(HttpContext context)
		{
			userService.EnsureIsAdmin(context);
		}
	}
}
