
Ui.CanvasElement.extend('Storage.CurrentArrow', {}, {
	updateCanvas: function(ctx) {
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('color')).getCssRgba();
		ctx.fillRect(0, 0, this.getLayoutWidth(), this.getLayoutHeight());
	}
}, {
	style: {
		color: '#e20045'
	}
});

Ui.Image.extend('Storage.FilePreviewImage', {
	squareSize: undefined,

	setSquareSize: function(size) {
		this.squareSize = size;
		this.invalidateMeasure();
	}
}, {
	measureCore: function(w, h) {
		if(this.getIsReady()) {
			var ratio = this.getNaturalWidth() / this.getNaturalHeight();
			if(ratio > 1)
				return { width: this.squareSize, height: this.squareSize/ratio };	
			else
				return { width: this.squareSize*ratio, height: this.squareSize };	
		}
		else
			return { width: this.squareSize, height: this.squareSize };
	}
});

Ui.Button.extend('Storage.FilePreview', {
	resource: undefined,
	storage: undefined,
	file: undefined,
	uploader: undefined,
	content: undefined,
	label: undefined,
	shadow: undefined,
	progressbar: undefined,
	needUpdate: false,
	isCurrent: false,
	image: undefined,
	
	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.storage = config.storage;
		delete(config.storage);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
		}

		//this.shadow = new Ui.Rectangle({ fill: 'black', opacity: 0.05, radius: 7, margin: 7 });
		//this.shadow.hide();
		//this.append(this.shadow);


/*		var vbox = new Ui.VBox({ margin: 2 });
		this.append(vbox);

		this.content = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ width: 128, maxLine: 3, textAlign: 'center', horizontalAlign: 'center' });
		vbox.append(this.label);*/

		if(this.uploader !== undefined) {
			var lbox = new Ui.LBox();
			this.setIcon(lbox);
			//this.content.setContent(lbox);
			lbox.append(new Ui.Icon({ icon: 'uploadfile', width: 48, height: 48, verticalAlign: 'bottom', horizontalAlign: 'center' }));
			this.progressbar = new Ui.ProgressBar({ verticalAlign: 'bottom', horizontalAlign: 'center', margin: 5, width: 50 });
			lbox.append(this.progressbar);
			this.connect(this.uploader, 'progress', this.onUploaderProgress);
			this.connect(this.uploader, 'complete', this.onUploaderComplete);

			if(this.uploader.getFile().getFileName() != undefined)
				this.setText(this.uploader.getFile().getFileName());
				//this.label.setText(this.uploader.getFile().getFileName());
		}
		else {
			if('file' in config) {
				this.update(config.file);
				delete(config.file);
			}
		}
		
		this.arrow = new Storage.CurrentArrow({ height: 4, verticalAlign: 'bottom' });
		this.arrow.hide();
		this.getDropBox().append(this.arrow);
		//this.append(this.arrow);
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
			this.setIcon(lbox);

			//this.content.setContent(lbox);
//			lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }) }));
//			lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1 }));
			this.image = new Storage.FilePreviewImage({
				src: '/cloud/preview/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev,
				margin: 3, squareSize: this.getStyleProperty('iconSize')-6 });
			this.setDownloadUrl('/cloud/storage/'+this.storage+'/'+this.file.id+'/content', this.file.mimetype, this.file.name);
			this.setMimetype('application/x-wn2-file');
			this.setDraggableData(this.storage+':'+this.file.id);
			this.connect(this.image, 'error', this.onPreviewError);
			lbox.append(this.image);
			//this.label.setText(this.file.name);
			this.setText(this.file.name);
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
		this.setIcon(icon);
/*		this.content.setContent(new Ui.Icon({
			icon: icon, verticalAlign: 'bottom', horizontalAlign: 'center',
			width: 48, height: 48 }));*/
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
		if(this.progressbar !== undefined)
			this.progressbar.setValue(loaded/total);
	},

	onUploaderComplete: function() {
		var file = this.uploader.getResponseJSON();
		this.update(file);
		this.needUpdate = true;
	},

	onFileDelete: function() {
		this.deleteFile();
	},

	onFileProperties: function() {
		var dialog = new Storage.FilePropertiesDialog({ resource: this.resource, storage: this.storage, file: this.file });
		dialog.open();
	}
}, {
	onStyleChange: function() {
		Storage.FilePreview.base.onStyleChange.apply(this, arguments)
		var iconSize = this.getStyleProperty('iconSize');
		if(this.image !== undefined)
			this.image.setSquareSize(iconSize-4);
	},

	getSelectionActions: function() {
		return {
			remove: { 
				text: 'Supprimer', icon: 'trash',
				scope: this, callback: this.onFileDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Propriétés', icon: 'filetools',
				scope: this, callback: this.onFileProperties, multiple: false
			}
		};
	}
});

