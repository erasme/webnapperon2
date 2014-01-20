
Ui.Popup.extend('Nautilus.NewDirectory', {
	field: undefined,

	constructor: function(config) {
		this.addEvents('done');

		var vbox = new Ui.VBox({ spacing: 5});
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nouveau dossier', horizontalAlign: 'center', fontWeight: 'bold', color: 'white' }));
	
		this.field = new Ui.TextField();
		vbox.append(this.field);

		var hbox = new Ui.HBox({ horizontalAlign: 'right', uniform: true });
		vbox.append(hbox);

		var button = new Ui.Button({ text: 'Annuler' });
		hbox.append(button);
		this.connect(button, 'press', this.hide);

		button = new Ui.Button({ text: 'Créer' });
		hbox.append(button);
		this.connect(button, 'press', this.onCreatePress);
	},

	onCreatePress: function() {
		this.hide();
		this.fireEvent('done', this, this.field.getValue());
	}
});

Ui.VBox.extend('Nautilus.FileViewer', {
	storage: undefined,
	locator: undefined,
	directory: undefined,
	watcher: undefined,
	flow: undefined,
	dropbox: undefined,
	stack: undefined,

	constructor: function(config) {
		this.stack = [];

		var hbox = new Ui.HBox();
		this.append(hbox);

		this.locator = new Ui.Locator({ path: '/', margin: 5, horizontalAlign: 'left' });
		this.connect(this.locator, 'change', this.onLocatorChange);
		hbox.append(this.locator, true);

		var segmentbar = new Ui.SegmentBar({ verticalAlign: 'center', margin: 10,
			field: 'text', data: [
				{ text: 'Vignette' }, { text: 'Diaporama' }
			]
		});
		segmentbar.setCurrentPosition(0);
		this.connect(segmentbar, 'change', this.onModeChanged);
		hbox.append(segmentbar);

		var uploadbutton = new Ui.UploadButton({ icon: 'upload' });
		this.connect(uploadbutton, 'file', this.onUploadFile);
		hbox.append(uploadbutton);

		var button = new Ui.Button({ icon: new Ui.Icon({ path: 'M 5.96875 5.28125 L 5.96875 9.1875 L 2.03125 9.1875 L 2.03125 13.09375 L 5.96875 13.09375 L 5.96875 17.03125 L 9.875 17.03125 L 9.875 13.09375 L 13.78125 13.09375 L 13.78125 9.1875 L 9.875 9.1875 L 9.875 5.28125 L 5.96875 5.28125 z M 16.34375 9.125 L 16.34375 13.03125 L 22.71875 13.03125 C 22.71875 13.03125 23.045921 13.034582 23.34375 13.1875 C 23.641579 13.336502 23.8125 13.248024 23.8125 14.125 L 23.8125 14.28125 L 23.8125 14.4375 L 23.8125 14.5 C 23.812317 14.50979 23.812683 14.52146 23.8125 14.53125 C 23.796543 15.387373 23.752506 16.378551 24.53125 17.46875 C 25.426301 18.721852 27.021771 19.15625 28.8125 19.15625 L 36.5625 19.15625 C 36.5625 19.15625 37.656088 19.1564 38.71875 19.6875 C 39.781412 20.218796 40.71875 20.905859 40.71875 23.3125 L 40.71875 33.90625 C 40.71875 33.90625 40.687585 34.999811 40.15625 36.0625 C 39.624919 37.125091 38.969174 38.0625 36.5625 38.0625 L 14.15625 38.0625 C 14.15625 38.0625 13.035047 37.992544 11.9375 37.375 C 10.839953 36.758337 9.875 35.906641 9.875 33.5 L 9.875 19.375 L 5.96875 19.375 L 5.96875 33.5 C 5.96875 37.211923 8.0694663 39.646487 10.03125 40.75 C 11.993034 41.853513 13.90625 41.9375 13.90625 41.9375 L 13.96875 41.96875 L 14.03125 41.96875 L 36.5625 41.96875 C 40.274489 41.96875 42.657915 39.809142 43.65625 37.8125 C 44.654585 35.815858 44.625 33.90625 44.625 33.90625 L 44.625 23.3125 C 44.625 19.600479 42.496669 17.185772 40.5 16.1875 C 38.503331 15.189326 36.5625 15.21875 36.5625 15.21875 L 28.8125 15.21875 C 28.206795 15.21875 27.916354 15.187107 27.78125 15.15625 C 27.783697 15.036418 27.741257 14.750817 27.71875 14.53125 L 27.71875 14.5 L 27.71875 14.4375 L 27.71875 14.28125 L 27.71875 14.125 L 27.71875 13.96875 L 27.71875 13.9375 L 27.65625 13.9375 C 27.570089 11.862539 26.316344 10.283115 25.125 9.6875 C 23.893163 9.0703472 22.71875 9.125 22.71875 9.125 L 16.34375 9.125 z' }) });
		this.connect(button, 'press', this.onNewDirectoryPress);
		hbox.append(button);

		button = new Ui.Button({ icon: 'trash' });
		hbox.append(button);

		this.dropbox = new Ui.DropBox();
		this.dropbox.setAllowedMode('copy');
		this.dropbox.addMimetype('Files');
		this.append(this.dropbox, true);
		this.connect(this.dropbox, 'dropfile', this.onUploadFile);

		var scroll = new Ui.ScrollingArea();
		this.dropbox.setContent(scroll);

		this.flow = new Ui.Flow({ uniform: true });
		scroll.setContent(this.flow);
	},

	setStorage: function(storage) {
		this.storage = storage;
		console.log('FileViewer storage: '+storage);
		console.log(storage);
		var cmd = this.storage.callMethod('get_Root');
		this.connect(cmd, 'done', this.onDirectoryGet);
	},

	onModeChanged: function(segmentbar, data) {
		console.log('mode: '+data.text);
	},

	onDirectoryGet: function(cmd) {
		this.directory = cmd.getResult();
		this.stack.push(this.directory);
		console.log('current dir: '+this.directory);

		this.watcher = this.directory.watch('Changed');
		this.connect(this.watcher, 'message', this.onDirectoryChange);
	},

	onDirectoryChange: function(watcher, msg) {
		console.log('onDirectoryChange:');
		console.log(msg);

		for(var i = 0; i < this.flow.getChildren().length; i++)
			this.flow.getChildren()[i]['Nautilus.FileViewer.status'] = false;

		var addDirs = [];
		var addFiles = [];
		for(var i = 0; i < msg.directories.length; i++) {
			var dir = msg.directories[i];
			var found = false;
			for(var i2 = 0; i2 < this.flow.getChildren().length; i2++) {
				var child = this.flow.getChildren()[i2];
				if(Nautilus.Directory.hasInstance(child) && (child.getDirectory().getId() == dir.getId())) {
					child['Nautilus.FileViewer.status'] = true;
					found = true;
					break;
				}
			}
			if(!found) {
				addDirs.push(dir);
			}
		}
		for(var i = 0; i < msg.files.length; i++) {
			var file = msg.files[i];
			var found = false;
			for(var i2 = 0; i2 < this.flow.getChildren().length; i2++) {
				var child = this.flow.getChildren()[i2];
				if(Nautilus.File.hasInstance(child) && (child.getFile().getId() == file.getId())) {
					child['Nautilus.FileViewer.status'] = true;
					found = true;
					break;
				}
			}
			if(!found) {
				addFiles.push(file);
			}
		}

		for(var i = 0; i < addDirs.length; i++) {
			var dir = new Nautilus.Directory({ directory: addDirs[i] });
			this.connect(dir, 'activate', this.onDirectoryActivate);
			this.flow.append(dir);
		}
		for(var i = 0; i < addFiles.length; i++) {
			var file = new Nautilus.File({ directory: this.directory, file: addFiles[i] });
			this.flow.append(file);
		}

		// remove removed files
		var remove = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var child = this.flow.getChildren()[i];
			if(child['Nautilus.FileViewer.status'] === false)
				remove.push(child);
		}
		for(var i = 0; i < remove.length; i++)
			this.flow.remove(remove[i]);
	},

	onDirectoryActivate: function(directory) {
		console.log('onDirectoryActivate');

		this.watcher.unref();

		while(this.flow.getFirstChild() != undefined) {
			var item = this.flow.getFirstChild();
			console.log('old: '+item);
			this.flow.remove(item);
		}

		this.directory = directory.getDirectory();
		this.watcher = this.directory.watch('Changed');
		this.connect(this.watcher, 'message', this.onDirectoryChange);

		this.stack.push(this.directory);
		this.locator.setPath(this.locator.getPath()+'/'+directory.getName());
	},

	onUploadFile: function(element, file) {
		console.log('onUploadFile');
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/uploadblob/?session='+this.directory.getSession().getSessionId() });
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();		
	},

	onUploadComplete: function(uploader) {
		console.log('onUploadComplete');
		var json = uploader.getResponseJSON();
		console.log(json);
		var res = this.directory.getSession().surogate(json);
		console.log(res);
		this.directory.callMethod('CreateFile', { name: uploader.getFile().getFileName(), mimetype: uploader.getFile().getMimetype(), blob: res });
	},

	onLocatorChange: function(locator, path) {
		var pos = 0;
		if(path != '/') {
			pos++;
			for(var i = 1; i < path.length; i++) {
				if(path.charAt(i) == '/')
					pos++;
			}
		}
		console.log('path: '+path+', # '+pos);

		this.watcher.unref();
		while(this.flow.getFirstChild() != undefined) {
			var item = this.flow.getFirstChild();
			this.flow.remove(item);
		}

		this.directory = this.stack[pos];
		this.watcher = this.directory.watch('Changed');
		this.connect(this.watcher, 'message', this.onDirectoryChange);

		var oldstack = this.stack;
		this.stack = [];
		for(var i = 0; i <= pos; i++)
			this.stack.push(oldstack[i]);
		this.locator.setPath(path);
	},

	onNewDirectoryPress: function() {
		var popup = new Nautilus.NewDirectory();
		this.connect(popup, 'done', this.onNewDirectory);
		popup.show();
	},

	onNewDirectory: function(popup, name) {
		this.directory.callMethod('CreateDirectory', { name: name });
	}
});

