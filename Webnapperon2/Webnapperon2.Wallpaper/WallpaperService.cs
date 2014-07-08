//
// WallpaperService.cs
// 
//  Provide wallpapers
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
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
//

using System;
using System.IO;
using System.Text;
using System.Data;
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;

namespace Webnapperon2.Wallpaper
{
	public class WallpaperService: IHttpHandler
	{
		string basepath;
		double cacheDuration;

		public WallpaperService(string basepath, double cacheDuration)
		{
			this.basepath = Path.GetFullPath(basepath);
			this.cacheDuration = cacheDuration;
		}

		JsonArray ListWallpapers()
		{
			JsonArray list = new JsonArray();
			return list;
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// GET /list list availables wallpapers
			if((context.Request.Method == "GET") && (parts.Length == 1) && (parts[0] == "list")) {
				JsonArray list = new JsonArray();
				foreach(string file in Directory.EnumerateFiles(basepath)) {
					list.Add(file.Substring(basepath.Length));
				}
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(list);
			}
			else if((context.Request.Method == "GET") && (parts.Length == 1)) {
				string fullPath = Path.GetFullPath(basepath+"/"+parts[0]);

				// check if full path is in the base directory
				if(!fullPath.StartsWith(basepath)) {
					context.Response.StatusCode = 403;
					context.Response.Content = new StringContent("Invalid file path\r\n");
				}
				else if(File.Exists(fullPath)) {
					context.Response.StatusCode = 200;
					if(!context.Request.QueryString.ContainsKey("nocache"))
						context.Response.Headers["cache-control"] = "max-age=" + cacheDuration;
					context.Response.SupportRanges = true;
					context.Response.Content = new FileContent(basepath + parts[0]);
				}
			}
			return Task.FromResult<object>(null);
		}
	}
}
