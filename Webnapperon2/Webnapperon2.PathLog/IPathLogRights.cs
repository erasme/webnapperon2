//
// IPathLogRights.cs
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

namespace Webnapperon2.PathLog
{
	public interface IPathLogRights
	{	
		void EnsureCanCreateLog(HttpContext context, string owner);

		void EnsureCanReadLog(HttpContext context, string owner);

		void EnsureCanDeleteLog(HttpContext context, string owner);

		void EnsureCanReadAllLogs(HttpContext context);
	}

	public class DummyPathLogRights: IPathLogRights
	{
		public void EnsureCanCreateLog(HttpContext context, string owner)
		{
		}

		public void EnsureCanReadLog(HttpContext context, string owner)
		{
		}

		public void EnsureCanDeleteLog(HttpContext context, string owner)
		{
		}

		public void EnsureCanReadAllLogs(HttpContext context)
		{
		}
	}
}

