

Ui.Draggable.extend('Nautilus.File', {
	file: undefined,
	directory: undefined,
	watcher: undefined,
	values: undefined,
	content: undefined,
	label: undefined,
	shadow: undefined,

	constructor: function(config) {
		this.addEvents('activate');

//		this.connect(this, 'select', this.onFileSelect);
//		this.connect(this, 'unselect', this.onFileUnSelect);

		this.shadow = new Ui.Rectangle({ fill: 'black', opacity: 0.05, radius: 7, margin: 7 });
		this.shadow.hide();
		this.append(this.shadow);

		var vbox = new Ui.VBox({ margin: 10 });
		this.append(vbox);

		this.content = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ text: '', width: 128, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);

		this.content.setContent(new Ui.Loading({ width: 30, height: 30, verticalAlign: 'bottom', horizontalAlign: 'center', margin: 10 }));

		this.connect(this, 'menu', this.onFileMenu);
	},

	setDirectory: function(directory) {
		this.directory = directory;
	},

	setFile: function(file) {
		this.file = file;
		this.watcher = this.file.watch('Changed');
		this.connect(this.watcher, 'message', this.onFileChange);

		var cmd = this.file.callMethod('GetCachedService', {key: 'preview', name: 'preview'});
		this.connect(cmd, 'done', this.onGetPreviewDone);

	},

	getFile: function() {
		return this.file;
	},

	onFileMenu: function() {
		var popup = new Nautilus.FileMenu({ file: this });
		popup.show(this.content);
	},

	onFileChange: function(cmd, msg) {
		console.log('onFileChange:');
		this.values = msg;
		this.label.setText(msg.name);
		this.setDownloadUrl('/cloud/downloadblob?session='+this.file.getSession().getSessionId()+'&id='+this.values.blob.getId()+'&mimetype='+encodeURIComponent(this.values.mimetype)+"&filename="+encodeURIComponent(this.values.name), this.values.mimetype, this.values.name);
	},

	onGetPreviewDone: function(cmd) {
		var preview = cmd.getResult();
		console.log('onGetPreviewDone: '+preview);
		var cmd2 = preview.callMethod('get_Preview');
		this.connect(cmd2, 'done', this.onPreviewBlobDone);
	},

	onPreviewBlobDone: function(cmd) {
		var blob = cmd.getResult();
		console.log('onPreviewBlobDone: '+blob);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		this.content.setContent(lbox);

		lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }), radius: 2 }));
		lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1, radius: 2 }));
		lbox.append(new Ui.Image({ src: '/cloud/downloadblob?session='+this.file.getSession().getSessionId()+'&id='+blob.getId()+'&mimetype='+encodeURIComponent('image/png'), margin: 3 }));
	},

	onFileSelect: function() {
		console.log('onFileSelect');
		this.shadow.show();
	},

	onFileUnSelect: function() {
		this.shadow.hide();
	},

	deleteFile: function() {
		this.directory.callMethod('DeleteFile', { file: this.file });
	}
});

