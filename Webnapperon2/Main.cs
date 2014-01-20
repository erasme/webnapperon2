using System;
using System.IO;
using System.Reflection;
using System.Xml.Serialization;
using Mono.Unix;
using Mono.Unix.Native;

namespace Webnapperon2
{
	class MainClass
	{
		public static void Main(string[] args)
		{
			// get the config file from args
			string configFile = null;
			for(int i = 0; i < args.Length; i++) {
				if((args[i] == "-c") || (args[i] == "--configFile"))
					configFile = args[++i];
			}

			Setup setup;
			Server server;

			// load the config file
			if(configFile != null) {
				using(FileStream stream = File.OpenRead(configFile)) {
					XmlSerializer serializer = new XmlSerializer(typeof(Setup));
					setup = (Setup)serializer.Deserialize(stream);
				}
				Console.WriteLine("Setup loaded from '"+configFile+"'");
			}
			else {
				setup = new Setup();
				Console.WriteLine("Default setup loaded");
			}

			// clean/create temporary dir
			if(Directory.Exists(setup.TemporaryDirectory))
				Directory.Delete(setup.TemporaryDirectory, true);
			Directory.CreateDirectory(setup.TemporaryDirectory);

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
