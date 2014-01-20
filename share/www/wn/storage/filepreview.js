
Ui.CanvasElement.extend('Storage.CurrentArrow', {}, {
	updateCanvas: function(ctx) {
		ctx.fillStyle = '#444444';
		ctx.beginPath();
		ctx.moveTo(0, this.getLayoutHeight());
		ctx.lineTo(this.getLayoutWidth(), this.getLayoutHeight());
		ctx.lineTo(this.getLayoutWidth()/2, 0);
		ctx.closePath();
		ctx.fill();
	}
});

Ui.Draggable.extend('Storage.FilePreview', {
	storage: undefined,
	file: undefined,
	uploader: undefined,
	content: undefined,
	label: undefined,
	shadow: undefined,
	progressbar: undefined,
	needUpdate: false,
	isCurrent: false,


	constructor: function(config) {
		this.addEvents('activate');

		this.storage = config.storage;
		delete(config.storage);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
		}

		this.shadow = new Ui.Rectangle({ fill: 'black', opacity: 0.05, radius: 7, margin: 7 });
		this.shadow.hide();
		this.append(this.shadow);

		var vbox = new Ui.VBox({ margin: 2 });
		this.append(vbox);

		this.content = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ width: 128, maxLine: 3, textAlign: 'center', horizontalAlign: 'center' });
		vbox.append(this.label);

		if(this.uploader != undefined) {
			var lbox = new Ui.LBox();
			this.content.setContent(lbox);
			lbox.append(new Ui.Icon({ icon: 'uploadfile', width: 48, height: 48, verticalAlign: 'bottom', horizontalAlign: 'center' }));
			this.progressbar = new Wn.ProgressBar({ verticalAlign: 'bottom', horizontalAlign: 'center', margin: 5, width: 50 });
			lbox.append(this.progressbar);
			this.connect(this.uploader, 'progress', this.onUploaderProgress);
			this.connect(this.uploader, 'complete', this.onUploaderComplete);

			if(this.uploader.getFile().getFileName() != undefined)
				this.label.setText(this.uploader.getFile().getFileName());
		}
		else {
			if('file' in config) {
				this.update(config.file);
				delete(config.file);
			}
		}
		
		this.arrow = new Storage.CurrentArrow({ width: 20, height: 10, verticalAlign: 'bottom', horizontalAlign: 'center' });
		this.arrow.hide();
		this.append(this.arrow);
	},
	
	current: function() {
		this.isCurrent = true;
		this.arrow.show();
	},
	
	uncurrent: function() {
		this.isCurrent = false;
		this.arrow.hide();
	},

	update: function(file) {
		if((this.file == undefined) || this.needUpdate || (JSON.stringify(this.file) !== JSON.stringify(file))) {
			this.file = file;
			var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
			this.content.setContent(lbox);
			lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }) }));
			lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1 }));
			var image = new Ui.Image({ src: '/cloud/preview/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev, margin: 3 });
			this.setDownloadUrl('/cloud/storage/'+this.storage+'/'+this.file.id+'/content', this.file.mimetype, this.file.name);
			this.setMimetype('application/x-wn2-file');
			this.setData(this.storage+':'+this.file.id);
			this.connect(image, 'error', this.onPreviewError);
			lbox.append(image);
			this.label.setText(this.file.name);
		}
	},

	getStorage: function() {
		return this.storage;
	},

	getFile: function() {
		return this.file;
	},

	getUploader: function() {
		return this.uploader;
	},

	onPreviewError: function(image) {
		this.disconnect(image, 'error', this.onPreviewError);
		var icon = 'file';
		if(this.file.mimetype === 'application/x-directory')
			icon = 'folder';
		this.content.setContent(new Ui.Icon({
			icon: icon, verticalAlign: 'bottom', horizontalAlign: 'center',
			width: 48, height: 48 }));
	},

	deleteFile: function() {
		if(this.uploader != undefined) {
			this.uploader.abort();
			this.uploader = undefined;
		}
		if(this.file != undefined) {
			var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id });
			request.send();
		}
	},

	onUploaderProgress: function(uploader, loaded, total) {
		if(this.progressbar != undefined)
			this.progressbar.setValue(loaded/total);
	},

	onUploaderComplete: function() {
		var file = this.uploader.getResponseJSON();
		this.update(file);
		this.needUpdate = true;
	}
});

