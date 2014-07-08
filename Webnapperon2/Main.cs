using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Reflection;
using System.Xml.Serialization;
using Mono.Unix;
using Mono.Unix.Native;
using Erasme.Json;

namespace Webnapperon2
{
	class MainClass
	{
		public static JsonValue ReadCommentedJson(Stream stream)
		{
			StringBuilder sb = new StringBuilder();
			using(StreamReader reader = new StreamReader(stream)) {
				while(!reader.EndOfStream) {
					string line = reader.ReadLine();
					if(!(line.TrimStart(' ', '\t')).StartsWith("//"))
						sb.Append(line);
				}
			}
			return JsonValue.Parse(sb.ToString());
		}

		public static void Main(string[] args)
		{
			// the default ThreadPool of Mono seems to be empty
			ThreadPool.SetMinThreads(Environment.ProcessorCount, Environment.ProcessorCount*2);

			// load the default setup from an embended resource
			dynamic setup;
			using(Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("Webnapperon2.webnapperon2.setup")) {
				setup = ReadCommentedJson(stream);
			}

			// get the config file from args
			string configFile = null;
			for(int i = 0; i < args.Length; i++) {
				if((args[i] == "-c") || (args[i] == "--configFile"))
					configFile = args[++i];
			}

			// load the current setup
			if(configFile != null) {
				JsonValue currentSetup;
				using(FileStream stream = File.OpenRead(configFile)) {
					currentSetup = ReadCommentedJson(stream);
				}
				setup.Merge(currentSetup);
				Console.WriteLine("Setup loaded from '" + configFile + "'");
			}
			else {
				Console.WriteLine("Default setup loaded");
			}

			Server server;

			// clean/create temporary dir
			if(Directory.Exists(setup.server.temporaryDirectory))
				Directory.Delete(setup.server.temporaryDirectory, true);
			Directory.CreateDirectory(setup.server.temporaryDirectory);

			server = new Server(setup);
			server.Start();

			// catch signals for service stop
			UnixSignal[] signals = new UnixSignal [] {
				new UnixSignal(Mono.Unix.Native.Signum.SIGINT),
				new UnixSignal(Mono.Unix.Native.Signum.SIGTERM),
				new UnixSignal(Mono.Unix.Native.Signum.SIGUSR2),
			};
				
			Signum signal;
			bool run = true;
				
			do {
				int index = UnixSignal.WaitAny(signals, -1);
				signal = signals[index].Signum;

				if(signal == Signum.SIGINT)
					run = false;
				else if(signal == Signum.SIGTERM)
					run = false;
				else if(signal == Signum.SIGUSR2)
					run = false;
			} while(run);

			server.Stop(true);

			Console.WriteLine("Server stop");
		}
	}
}
