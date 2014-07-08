
Ui.LBox.extend('Wn.DetailsBox', {
	bg: undefined,
	scroll: undefined,

	constructor: function() {
		this.bg = new Ui.Rectangle();
		this.append(this.bg);

		this.scroll = new Ui.ScrollingArea();
		this.append(this.scroll);
	},

	getScroll: function() {
		return this.scroll;
	}

}, {	
	setContent: function(content) {
		this.scroll.setContent(content);
	},

	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
	}
}, {
	style: {
		background: 'rgba(241,241,241,0.5)'
	}
});

Ui.LBox.extend('Wn.NavigationBox', {
	bg: undefined,
	scroll: undefined,

	constructor: function() {
		this.bg = new Ui.Rectangle();
		this.append(this.bg);

		this.scroll = new Ui.ScrollingArea({ scrollHorizontal: true, scrollVertical: false });
		this.append(this.scroll);
	},

	getScroll: function() {
		return this.scroll;
	}

}, {	
	setContent: function(content) {
		this.scroll.setContent(content);
	},

	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
	}
}, {
	style: {
		background: 'rgba(241,241,241,0.5)'
	}
});
	
Ui.ScrollingArea.extend('Storage.FileViewer', {

	uploader: undefined,
	file: undefined,
	storage: undefined,
	updateNeeded: false,
	viewer: undefined,
	tools: undefined,
	contentViewerBox: undefined,
	commentViewer: undefined,
	detailsBox: undefined,
	isDetailsBoxVisible: true,
	playing: false,
	contentViewer: undefined,
	box: undefined,
	timer: undefined,
	fileToolsBox: undefined,
	filePropertiesButton: undefined,
	fileDownloadButton: undefined,
	fileDeleteButton: undefined,

	constructor: function(config) {
		this.addEvents('toolschange', 'end');
	
		this.storage = config.storage;
		delete(config.storage);
		this.viewer = config.viewer;
		delete(config.viewer);

		this.tools = [];

		this.box = new Ui.Box({ orientation: 'horizontal' });
		this.setContent(this.box);

		this.contentViewerBox = new Ui.LBox();
		this.box.append(this.contentViewerBox, true);

		if('uploader' in config) {
			this.uploader = config.uploader;
			delete(config.uploader);
//			this.contentBox.setContent(new Storage.UploaderViewer({ storage: this.storage, uploader: this.uploader, fileViewer: this }));
//			this.connect(this.uploader, 'complete', this.onUploaderComplete);
		}
		else if('file' in config) {
			this.update(config.file);
			delete(config.file);
		}

		this.connect(this, 'visible', this.onFileViewerVisible);
		this.connect(this, 'hidden', this.onFileViewerHidden);

		this.connect(Ui.App.current, 'resize', this.onAppResize);
	},

	setShowDetails: function(isVisible) {
		this.isDetailsBoxVisible = (isVisible === true);
		if(this.detailsBox !== undefined) {
			if(this.isDetailsBoxVisible)
				this.detailsBox.show();
			else
				this.detailsBox.hide(true);
		}
	},

	showProperties: function() {
		var dialog = new Storage.FilePropertiesDialog({ resource: this.viewer.getResource(), storage: this.storage, file: this.file });
		dialog.open();
	},
	
	getDownloadUrl: function() {
		if(this.uploader !== undefined)
			return undefined;
		else
			return '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?attachment=true&rev='+this.file.rev;
	},
	
	update: function(file) {
		//console.log(this+'.update('+file.id+')');
		if((this.file === undefined) || this.updateNeeded || (JSON.stringify(this.file) !== JSON.stringify(file))) {
			this.file = file;
			this.updateNeeded = false;
			if(this.getIsLoaded())
				this.buildContent();
			if(this.commentViewer)
				this.commentViewer.updateFile(this.file);
		}
	},

	removeContent: function() {
		this.contentViewerBox.setContent();
	},

	buildContent: function() {	
		if(this.uploader !== undefined)
			this.contentViewerBox.setContent(new Storage.UploaderViewer({ storage: this.storage, uploader: this.uploader, fileViewer: this }));
		else {
			//console.log('buildContent file: '+thisdetailsB.file.id+', mime: '+this.file.mimetype);
		
			this.tools = [];

			if(this.file.mimetype == 'image/gif')
				this.contentViewer = new Storage.GifImageFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if(this.file.mimetype.indexOf('image/') == 0)
				this.contentViewer = new Storage.ImageFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if(this.file.mimetype == 'text/uri-list')
				this.contentViewer = new Storage.SiteFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if(this.file.mimetype == 'application/x-webnapperon2-rss-item')
				this.contentViewer = new Storage.RssItemFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.mimetype.indexOf('video/') == 0))
				this.contentViewer = new Storage.VideoFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if((!navigator.isIE7 && !navigator.isIE8) && (this.file.mimetype.indexOf('audio/') == 0))
				this.contentViewer = new Storage.AudioFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if((this.file.mimetype.indexOf('text/plain') == 0) && (this.file.size < 50000))
				this.contentViewer = new Storage.TextFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else if((this.file.mimetype.indexOf('application/pdf') == 0) ||
					(this.file.mimetype.indexOf('application/vnd.oasis.opendocument.text') == 0) ||
			        (this.file.mimetype.indexOf('application/vnd.oasis.opendocument.presentation') == 0) ||
					(this.file.mimetype.indexOf('application/vnd.oasis.opendocument.graphics') == 0) ||
					(this.file.mimetype.indexOf('application/vnd.sun.xml.writer') == 0) ||
					// Microsoft PowerPoint
					(this.file.mimetype.indexOf('application/vnd.ms-powerpoint') == 0) ||
					// Microsoft Word
					(this.file.mimetype.indexOf('application/msword') == 0) ||
					// Microsoft Word 2007
			        (this.file.mimetype.indexOf('application/vnd.openxmlformats-officedocument.wordprocessingml.document') == 0) ||
			        // RichText
			        (this.file.mimetype.indexOf('text/richtext') == 0))
				this.contentViewer = new Storage.PdfFileViewer({ storage: this.storage, file: this.file, fileViewer: this });
			else
				this.contentViewer = new Storage.GenericFileViewer({ storage: this.storage, file: this.file, fileViewer: this });

			this.contentViewerBox.setContent(this.contentViewer);
			if(this.playing)
				this.play();
			
			if(this.detailsBox === undefined) {
				this.detailsBox = new Wn.DetailsBox({ width: 250 });
				this.box.append(this.detailsBox);

				var vbox = new Ui.VBox({ spacing: 5, marginRight: 5 });
				this.detailsBox.setContent(vbox);

				this.fileToolsBox = new Wn.OptionSection({ isFolded: true });
				vbox.append(this.fileToolsBox);

				this.filePropertiesButton = new Ui.Button({ icon: 'filetools', text: 'Propriétés' });
				this.connect(this.filePropertiesButton, 'press', this.showProperties);
				this.appendTool(this.filePropertiesButton);

				this.fileDownloadButton = new Ui.DownloadButton({
					icon: 'savedisk', text: 'Télécharger', src: this.getDownloadUrl()
				});
				this.appendTool(this.fileDownloadButton);

				if(this.viewer.getResource().canWrite()) {
					this.fileDeleteButton = new Ui.Button({
						icon: 'trash', text: 'Supprimer'
					});
					this.connect(this.fileDeleteButton, 'press', this.deleteFile);
					this.appendTool(this.fileDeleteButton);
				}

				this.commentViewer = new Wn.CommentViewer({
					user: Ui.App.current.getUser(),
					resource: this.viewer.getResource(),
					storage: this.storage, file: this.file
				});
				vbox.append(this.commentViewer);

				if(!this.isDetailsBoxVisible)
					this.detailsBox.hide(true);
			}
			else {
				this.appendTool(this.filePropertiesButton);
				this.appendTool(this.fileDownloadButton);
				if(this.viewer.getResource().canWrite())
					this.appendTool(this.fileDeleteButton);
			}
			this.onAppResize(Ui.App.current, Ui.App.current.getLayoutWidth(), Ui.App.current.getLayoutHeight());
		}
	},

	getFile: function() {
		return this.file;
	},

	getUploader: function() {
		return this.uploader;
	},

	getViewer: function() {
		return this.viewer;
	},

	getCommentsCount: function() {
		if(this.file !== undefined)
			return this.file.comments.length;
		else
			return 0;
	},

	getTools: function() {
		return this.tools;
	},
	
	appendTool: function(tool) {
		this.tools.push(tool);
		this.fireEvent('toolschange', this, this.tools);

		if(this.fileToolsBox !== undefined) {
			this.fileToolsBox.setTitle(this.file.name);

			var vbox = new Ui.VBox({ spacing: 5 });
			vbox.append(new Ui.Separator({ marginBottom: 10 }));

			for(var i = 0; i < this.tools.length; i++)
				vbox.append(this.tools[i]);
			this.fileToolsBox.setContent(vbox);
		}
	},
	
	play: function() {
		if(this.playing)
			return;

		this.playing = true;

		if((this.contentViewer !== undefined) && ('play' in this.contentViewer)) {
			this.connect(this.contentViewer, 'end', this.onPlayEnd);
			this.contentViewer.play();
		}
		else
			this.timer = new Core.DelayedTask({ scope: this, delay: 5, callback: this.onPlayEnd });
	},
	
	current: function() {
//		console.log('FileViewer current storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentViewerBox.getChildren().length > 0) && ('current' in this.contentViewerBox.getChildren()[0]))
			this.contentViewerBox.getChildren()[0].current();
	},
	
	uncurrent: function() {
//		console.log('FileViewer uncurrent storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentViewerBox.getChildren().length > 0) && ('uncurrent' in this.contentViewerBox.getChildren()[0]))
			this.contentViewerBox.getChildren()[0].uncurrent();
	},

	onPlayEnd: function() {
		this.timer = undefined;
		this.playing = false;
		this.fireEvent('end', this);
	},

	deleteFile: function() {
		var dialog = new Ui.Dialog({
			cancelButton: new Ui.DialogCloseButton(),
			content: new Ui.Text({ width: 300, text: 'Voulez vous vraiment supprimer ce fichier. Il sera définitivement perdu.' })
		});
		var removeButton = new Ui.DefaultButton({ text: 'Supprimer' });
		this.connect(removeButton, 'press', function() {
			if(this.file !== undefined) {
				var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id });
				request.send();
			}
			else if(this.uploader !== undefined)
				this.uploader.abort();
			dialog.close();
		});
		dialog.setActionButtons([ removeButton ]);
		dialog.open();
	},

//	onUploaderComplete: function() {
//		this.file = this.uploader.getResponseJSON();
//		console.log('onUploaderComplete file: '+this.file.id);
//		this.uploader = undefined;
//		this.updateNeeded = true;
//	},
	
	onFileViewerVisible: function() {
		this.buildContent();
	},
	
	onFileViewerHidden: function() {
		this.removeContent();
	},

	onAppResize: function(app, w, h) {
//		console.log(this+'.onAppResize('+w+','+h+')');
		if(this.detailsBox === undefined)
			return;

		if(w < 700) {
			this.box.setOrientation('vertical');
			this.detailsBox.getScroll().setScrollVertical(false);
			Ui.Box.setResizable(this.detailsBox, true);
			this.contentViewerBox.setHeight(400);
		}
		else {
			this.box.setOrientation('horizontal');
			this.detailsBox.getScroll().setScrollVertical(true);
			Ui.Box.setResizable(this.detailsBox, false);
			this.contentViewerBox.setHeight(undefined);
		}
	},

	showDetails: function() {
		this.setShowDetails(true);
	},

	hideDetails: function() {
		this.setShowDetails(false);
	}
}, {
	onUnload: function() {
		Storage.FileViewer.base.onUnload.apply(this, arguments);
		if(this.timer !== undefined) {
			this.timer.abort();
			this.timer = undefined;
		}
	}
});

Ui.LBox.extend('Storage.UploaderViewer', {
	storage: undefined,
	uploader: undefined,
	progressbar: undefined,
	label: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.uploader = config.uploader;
		delete(config.uploader);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.setContent(vbox);

		vbox.append(new Ui.Icon({ icon: 'uploadfile', fill: '#3f3f3f', width: 256, height: 256, horizontalAlign: 'center' }));
//		vbox.append(new Ui.Image({ src: '/img/uploading.png', width: 256, height: 256, horizontalAlign: 'center' }));

		this.progressbar = new Ui.ProgressBar({ width: 120, height: 10 });
		vbox.append(this.progressbar);

		if(this.uploader.getFile().getFileName() != undefined)
			vbox.append(new Ui.CompactLabel({ width: 256, maxLine: 3, textAlign: 'center', text: this.uploader.getFile().getFileName() }));

		this.connect(this.uploader, 'progress', this.onUploaderProgress);
	},

	onUploaderProgress: function(uploader, loaded, total) {
		this.progressbar.setValue(loaded/total);
	}
});

Storage.Transformable.extend('Storage.ImageFileViewer', {
	storage: undefined,
	file: undefined,
	image: undefined,
	values: undefined,
	quality: false,
	fileViewer: undefined,
	lbox: undefined,
	loading: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.setFocusable(false);

		this.lbox = new Ui.LBox();
		this.setContent(this.lbox);

//		this.setBackground('#dddddd');
		this.image = new Wn.ScaledImage2();
//		this.image.setSrc('/cloud/imageconvert?storage='+this.storage+'&file='+this.file.id+'&resize=1024x768');
		this.image.setSrc('/cloud/previewhigh/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev);
		this.lbox.append(this.image);

		// handle a loading animation
		if(!this.image.getIsReady()) {
			this.loading = new Ui.Loading({ width: 50, height: 50, verticalAlign: 'center', horizontalAlign: 'center' });
			this.lbox.append(this.loading);

			this.connect(this.image, 'ready', function() {
				this.lbox.remove(this.loading);
			});
		}
	},

	current: function() {
//		if(!this.quality) {
//			this.quality = true;
//			this.image.setSrc('/cloud/imageconvert?storage='+this.storage+'&file='+this.file.id+'&resize=1024x768');
//		}
	}
}, {
	onHidden: function() {
//		if(this.quality) {
//			this.quality = false;
//			this.image.setSrc('/cloud/previewhigh?storage='+this.storage+'&file='+this.file.id);
//		}
	}
});

Ui.LBox.extend('Storage.GifImageFileViewer', {
	storage: undefined,
	file: undefined,
	image: undefined,
	values: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);
		this.image = new Wn.ScaledImage2();
		this.image.setSrc('/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev);
		this.setContent(this.image);
	}
});


Ui.LBox.extend('Storage.SiteFileViewer', {
	storage: undefined,
	file: undefined,
	text: undefined,
	fileViewer: undefined,
	linkButton: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onContentLoaded);
		request.send();

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		var lbox = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'center' });
		vbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: new Ui.Color({ r: 0.7, b: 0.7, g: 0.7 }), radius: 2 }));
		lbox.append(new Ui.Rectangle({ fill: 'white', margin: 1, radius: 2 }));
		var image = new Ui.Image({ src: '/cloud/previewhigh/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev, width: 128, margin: 3 });
		lbox.append(image);
		this.connect(image, 'error', function() {
			lbox.setContent(new Ui.Icon({ icon: 'earth', verticalAlign: 'bottom', horizontalAlign: 'center', width: 128, height: 128 }));
		});

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.name, fontSize: 20 });
		vbox.append(this.text);

		this.linkButton = new Ui.LinkButton({ text: 'Ouvrir le site', horizontalAlign: 'center' });
		this.linkButton.disable();
		vbox.append(this.linkButton);
	},
	
	onContentLoaded: function(request) {
		//console.log('iframe: '+this.file.meta.iframe);
		
		// embed in a iframe
		if((this.file.meta !== undefined) && (this.file.meta.iframe === 'true')) {
			var iframe = new Ui.IFrame({ src: request.getResponseText() });
			this.setContent(iframe);
		}
		else {
			this.linkButton.setSrc(request.getResponseText());
			this.linkButton.enable();
		}
	}
});

Ui.LBox.extend('Storage.AudioFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	request: undefined,
	checkTask: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
	
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);
	},
	
	checkReady: function() {
		if(this.checkTask !== undefined)
			this.checkTask = undefined;
		if((this.player !== undefined) || (this.request !== undefined))
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/audio/'+this.storage+'/'+this.file.id+'/info' });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status[json.support] == 'ready') {
			this.player = new Wn.AudioPlayer({ src: '/cloud/audio/'+this.storage+'/'+this.file.id, text: this.file.name });
			this.setContent(this.player);
			this.connect(this.player, 'end', this.onMediaEnd);
			if(this.playing)
				this.play();
		}
		else if(json.status[json.support] == 'building') {
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		}
		else {
			this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son' }));
		}
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible d\'écouter ce fichier son', verticalAlign: 'center' }));
		this.request = undefined;
	},
	
	uncurrent: function() {
		if(this.player !== undefined)
			this.player.pause();
	},
	
	play: function() {
		this.playing = true;
		var support = !navigator.iOs && !navigator.Android;		
		if((this.player !== undefined) && (support))
			this.player.play();			
	},
	
	onMediaEnd: function() {
		this.fireEvent('end', this);
	}
	
}, {
	onVisible: function() {
		if(this.player === undefined) {
			var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
			vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
			vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			this.setContent(vbox);

			this.checkReady();
		}
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
		if(this.player !== undefined)
			this.player.pause();
	},

	onUnload: function() {
		Storage.AudioFileViewer.base.onUnload.apply(this, arguments);
		this.onHidden();
	}
});

Ui.Pressable.extend('Storage.VideoFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	player: undefined,
	request: undefined,
	checkTask: undefined,
	playing: false,

	constructor: function(config) {
		this.addEvents('end');
	
		this.setFocusable(false);

		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.setLock(true);
		this.connect(this, 'press', this.onVideoPress);
	},

	checkReady: function() {
		//console.log(this+'.checkReady '+this.file.id);
		if(this.checkTask !== undefined)
			this.checkTask = undefined;
		if((this.player !== undefined) || (this.request !== undefined))
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/video/'+this.storage+'/'+this.file.id+'/info' });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status[json.support] == 'ready') {
//			this.setBackground('#dddddd');

			this.player = new Wn.VideoPlayer({ src: '/cloud/video/'+this.storage+'/'+this.file.id, poster: '/cloud/previewhigh/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev });
			this.connect(this.player, 'statechange', this.onVideoStateChange);
			this.connect(this.player, 'end', this.onVideoEnd);
			this.setContent(this.player);
			if(this.playing)
				this.play();
		}
		else if(json.status[json.support] == 'building')
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		else
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center', textAlign: 'center' }));
		this.request = undefined;
	},

	onVideoEnd: function(player) {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onVideoStateChange: function(player) {
		this.setLock(this.player.getIsControlsVisible());
	},

	onVideoPress: function() {
		//console.log(this+'.onVideoPress');
		if((this.player !== undefined) && (this.player.getState() == 'playing'))
			this.player.pause();
	},
	
	uncurrent: function() {
		if(this.player !== undefined)
			this.player.pause();
	},
	
	play: function() {
		this.playing = true;
		var support = !navigator.iOs && !navigator.Android;		
		if((this.player !== undefined) && (support))
			this.player.play();
	}
}, {
	onVisible: function() {
		if(this.player === undefined) {
			var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
			vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
			vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));		
			this.setContent(vbox);

			this.checkReady();
		}
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
		if(this.request !== undefined) {
			this.request.abort();
			this.request = undefined;
		}
		if(this.player !== undefined)
			this.player.pause();
	},

	onUnload: function() {
		Storage.VideoFileViewer.base.onUnload.apply(this, arguments);
		this.onHidden();
	}
});

Storage.Transformable.extend('Storage.TextFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	text: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

//		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: true });
//		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic());
//		scroll.setContent(lbox);
		this.setContent(lbox);

		this.text = new Wn.ImprovedText({ margin: 30, style: { "Wn.ImprovedText": { fontSize: 20 } } });

		lbox.append(this.text);

		//console.log('src: '+'/app/texteditor/?storage='+this.storage+'&file='+this.file.id);
		//var editButton = new Ui.LinkButton({ icon: 'fileedit', text: 'Éditer', src: '/app/texteditor/?storage='+this.storage+'&file='+this.file.id });
		//this.fileViewer.appendTool(editButton);

		var editButton = new Ui.Button({ icon: 'fileedit', text: 'Éditer' });
		this.connect(editButton, 'press', function() {
			var dialog = new Storage.TextEditor({
				storage: this.storage, file: this.file.id
			});
			dialog.open();
		});
		this.fileViewer.appendTool(editButton);


		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
});

Ui.Rectangle.extend('Storage.PageBackgroundGraphic', {}, {
	onStyleChange: function() {
		//console.log(this+'.onStyleChange ');
		//console.log(this.getStyleProperty('background'));
		this.setFill(this.getStyleProperty('background'));
	}
}, {
	style: {
		background: '#ffffff'
	}
});

/*
Ui.CanvasElement.extend('Storage.PageBackgroundGraphic', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('background')).getCssRgba();
		ctx.fillRect(7, 7, width-14, height-14);
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}
}, {
	style: {
		background: '#ffffff'
	}
});*/


Storage.Transformable.extend('Storage.RssItemFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	title: undefined,
	content: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);
		this.setSelectable(false);

//		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: true });
//		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic());
//		scroll.setContent(lbox);
		this.setContent(lbox);

		var vbox = new Ui.VBox({ margin: 20, spacing: 10 });
		lbox.append(vbox);
		
		this.title = new Ui.Text({ text: this.file.name, fontWeight: 'bold', fontSize: 24, marginTop: 20 });
		vbox.append(this.title);
								
		this.content = new Ui.Html();
		this.connect(this.content, 'link', this.onContentLink);
		vbox.append(this.content);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();		
	},

	onTextLoaded: function(req) {
		var html = '<div style="word-wrap: break-word; font-family: '+this.getStyleProperty('fontFamily')+';font-size: '+this.getStyleProperty('fontSize')+'px;font-weight: '+this.getStyleProperty('fontWeight')+';">';
		html += (new Date(this.file.meta.pubDate)).toLocaleString()+'&nbsp;&nbsp;';
		if(this.file.meta.link != undefined)
			html += '<a href="'+this.file.meta.link+'" style="cursor: pointer; text-decoration: underline">article complet</a><br>';
		html += '<br>';
		html += req.getResponseText();
		html += '</div>';
		this.content.setHtml(html);

		// ensure images will not get too large
		var images = this.content.getElements('IMG');
		for(var i = 0; i < images.length; i++) {
			images[i].style.maxWidth = '90%';
			images[i].style.height = 'auto';
			Ui.Element.setSelectable(images[i], false);
			images[i].setAttribute('draggable', false);
		}
		this.onStyleChange();
	},
	
	onContentLink: function(html, url) {
		window.open(url, '_blank');
	}
}, {
	onStyleChange: function() {
		var linkColor = Ui.Color.create(this.getStyleProperty('linkColor')).getCssHtml();
		var links = this.content.getElements('A');
		for(var i = 0; i < links.length; i++) {
			var link = links[i];
			link.style.color = linkColor;
			link.style.textDecoration = 'none';
		}
	}
}, {
	style: {
		linkColor: '#4d4d4d'
	}
});

Ui.Image.extend('Storage.PdfPageGraphic', {
	constructor: function(config) {
		this.ratio = config.ratio;
		delete(config.ratio);
	}
});

/*
Ui.CanvasElement.extend('Storage.PdfPageGraphic', {
	src: undefined,
	image: undefined,
	ratio: 1,
	
	constructor: function(config) {
		this.src = config.src;
		delete(config.src);
		this.ratio = config.ratio;
		delete(config.ratio);
		
		this.image = new Ui.Image({ src: this.src });
		this.connect(this.image, 'ready', this.onImageReady);
		this.appendChild(this.image);
	},
	
	onImageReady: function() {
		this.invalidateDraw();
	}
}, {
	measureCore: function(width, height) {
		return { width: width, height: ((width-14)/this.ratio)+14 };
	},

	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(7, 7, width-14, height-14);
		// image
		if(this.image.getIsReady())
			ctx.drawImage(this.image.getDrawing(), 0, 0, this.image.getNaturalWidth(), this.image.getNaturalHeight(), 7, 7, width-14, height-14);
	}
});*/

Ui.LBox.extend('Storage.PdfPage', {
	storage: undefined,
	file: undefined,
	page: undefined,
	ratio: undefined,
	graphic: undefined,

	constructor: function(config) {		
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.page = config.page;
		delete(config.page);
		this.ratio = config.ratio;
		delete(config.ratio);

		this.append(new Storage.PdfPageGraphic({ ratio: this.ratio, src: '/cloud/pdf/'+this.storage+'/'+this.file.id+'/pages/'+this.page+'/image?rev='+this.file.rev }));
	}
}, {
	measureCore: function(width, height) {
		return { width: width, height: ((width-20)/this.ratio)+20 };
	},

	onChildInvalidateMeasure: function(child, remove) {
		child.measure(this.getLayoutWidth(), this.getLayoutHeight());
		child.arrange(0, 0, this.getLayoutWidth(), this.getLayoutHeight());
	}
});

Storage.Transformable.extend('Storage.PdfFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	pages: undefined,
	data: undefined,
	isCurrent: false,
//	scroll: undefined,
	checkTask: undefined,
	request: undefined,
	relativeOffset: 0,

	constructor: function(config) {	
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		//console.log(this+' new');

		this.setContent(new Ui.Element());
	},
	
	checkReady: function() {
		if(this.checkTask !== undefined)
			this.checkTask = undefined;
		if(this.request !== undefined)
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/pdf/'+this.storage+'/'+this.file.id });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		//console.log(this+'.onCheckDone '+json.status);

		if(json.status == 'ready') {
			this.data = json;
			//this.scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: true });
			//this.setContent(this.scroll);

			this.pages = new Ui.VBox({ spacing: 10 });
			//this.scroll.setContent(this.pages);
			this.setContent(this.pages);
			this.onDataDone();
		}
		else if(json.status == 'building') {
			this.checkTask = new Core.DelayedTask({ delay: 2, scope: this, callback: this.checkReady });
		}
		else {
			this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier PDF', verticalAlign: 'center' }));
		}
		this.request = undefined;
	},
	
	onCheckError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible de lire ce fichier vidéo', verticalAlign: 'center' }));
		this.request = undefined;
	},
	
	onDataDone: function(req) {
		for(var i = 0; i < this.data.pages.length; i++) {
			var page =  new Storage.PdfPage({
				storage: this.storage, file: this.file, page: i,
				ratio: this.data.pages[i].width/this.data.pages[i].height
			});
			this.pages.append(page);
		}
	},

	current: function() {
		this.isCurrent = true;
	},
	
	uncurrent: function() {
		this.isCurrent = false;
	}
}, {
/*	arrangeCore: function(w, h) {
		var ry = 0;
		if(this.scroll !== undefined)
			ry = this.scroll.getRelativeOffsetY(); 
	
		Storage.PdfFileViewer.base.arrangeCore.call(this, w, h);
		if(this.pages !== undefined) {
			// scroll to stay at the same relative offset
			this.scroll.setOffset(undefined, ry);
		}
	},*/

	onVisible: function() {
		if(this.pages === undefined) {
			var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
			vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
			vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
			this.setContent(vbox);		

			this.checkReady();
		}
	},

	onHidden: function() {
		if(this.request != undefined) {
			this.request.abort();
			this.request = undefined;
		}
		if(this.checkTask != undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
	}
});
	
Ui.LBox.extend('Storage.GenericFileViewer', {
	storage: undefined,
	file: undefined,
	text: undefined,
	fileViewer: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', horizontalAlign: 'center', spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Icon({ icon: 'file', width: 128, height: 128, horizontalAlign: 'center' }));

		this.text = new Ui.Text({ textAlign: 'center', text: this.file.name, fontSize: 20 });
		vbox.append(this.text);

		var downloadButton = new Ui.DownloadButton({ text: 'Télécharger', horizontalAlign: 'center' });
		downloadButton.setSrc('/cloud/storage/'+this.storage+'/'+this.file.id+'/content?attachment=true&rev='+this.file.rev);
		vbox.append(downloadButton);
	}
});

Ui.Container.extend('Storage.ScaledImage', {
	image: undefined,
	src: undefined,
	ratio: 1,

	constructor: function(config) {
		this.setClipToBounds(true);
		if('src' in config) {
			this.src = config.src;
			delete(config.src);
			this.image = new Ui.Image({ src: this.src });
		}
		else
			this.image = new Ui.Image();
		this.appendChild(this.image);
		if('ratio' in config) {
			this.ratio = config.ratio;
			delete(config.ratio);
		}

		this.connect(this.image, 'ready', this.onReady);
		this.addEvents('ready');
	},

	setSrc: function(src) {
		this.removeChild(this.image);
		this.src = src;
		if(this.src == undefined)
			this.image = new Ui.Image();
		else
			this.image = new Ui.Image({ src: this.src });
		this.appendChild(this.image);
	},

	getIsReady: function() {
		return this.image.getIsReady();
	},

	onReady: function() {
		this.invalidateMeasure();
		this.fireEvent('ready', this);
	}
}, {
	measureCore: function(width, height) {
		if(this.getIsReady()) {
			var nWidth = this.image.getNaturalWidth();
			var nHeight = this.image.getNaturalHeight();
			return { width: width, height: (nHeight * width / nWidth) };
		}
		else
			return { width: width, height: width/this.ratio };
	},

	arrangeCore: function(width, height) {
		this.image.arrange(0, 0, width, height);
	}
});

Ui.Dialog.extend('Storage.NewDialog', {
	viewer: undefined,

	constructor: function(config) {
		this.viewer = config.viewer;
		delete(config.viewer);
		
		this.setFullScrolling(true);
		this.setPreferredWidth(300);
		this.setPreferredHeight(350);
				
		var vbox = new Ui.VBox({ uniform: true, spacing: 8 });
		this.setContent(vbox);
		
		var uploadButton;
		if(navigator.iOs) 
			uploadButton = new Ui.UploadButton({ icon: 'camera', text: 'Photo ou vidéo', orientation: 'horizontal' });
		else
			uploadButton = new Ui.UploadButton({ icon: 'uploadfile', text: 'Fichier local', orientation: 'horizontal' });
		this.connect(uploadButton, 'file', function(element, file) {
			this.viewer.onUploadFile(element, file, 0);
			this.close();
		});
		vbox.append(uploadButton);

		var newButton = new Ui.Button({ icon: 'text', text: 'Fichier texte', orientation: 'horizontal' });
		this.connect(newButton, 'press', function() { 
			this.close();
			this.viewer.onNewTextPress();
		});
		vbox.append(newButton);
		
		var newUriButton = new Ui.Button({ icon: 'earth', text: 'Lien vers un site Web', orientation: 'horizontal' });
		this.connect(newUriButton, 'press', function() { 
			this.close();
			this.viewer.onNewUriPress();
		});
		vbox.append(newUriButton);
		
		this.setTitle('Nouveau fichier');
		this.setCancelButton(new Ui.DialogCloseButton());
	}
});

Ui.Button.extend('Storage.UploadView', {
	progressBar: undefined,
	resource: undefined,
	uploadIcon: undefined,
	uploadText: undefined,

	constructor: function(config) {
		this.addEvents('end');

		this.resource = config.resource;
		delete(config.resource);

		var vbox = new Ui.VBox({ spacing: 5 });
		this.setIcon(vbox);

		this.uploadIcon = new Ui.Icon({ icon: 'uploadfiles', horizontalAlign: 'center', verticalAlign: 'center' });
		vbox.append(this.uploadIcon);
	
		this.progressBar = new Ui.ProgressBar();
		this.progressBar.hide();
		vbox.append(this.progressBar);

		this.setText('Cliquez pour créer un nouveau fichier ou glissez et déposez vos fichiers ici');

		this.connect(this.resource, 'uploadstart', function() {
			this.progressBar.setValue(0);
			this.progressBar.show();
		});
		this.connect(this.resource, 'uploadprogress', function(resource, progress) {
			this.progressBar.setValue(progress);
		});
		this.connect(this.resource, 'uploadcomplete', function() {
			this.progressBar.hide();
		});
	},

	current: function() {
	},

	uncurrent: function() {
	},

	getFile: function() {
	}
}, {
	onStyleChange: function() {
		Storage.UploadView.base.onStyleChange.apply(this, arguments);
		var iconSize = this.getStyleProperty('iconSize');
		this.uploadIcon.setWidth(iconSize);
		this.uploadIcon.setHeight(iconSize);
	},

	updateColors: function() {
		var fg = this.getForeground();
		Storage.UploadView.base.updateColors.apply(this, arguments);
		this.uploadIcon.setFill(fg);
		this.progressBar.setStyleProperty('color', fg);
	}
});

Wn.ResourceViewer.extend('Storage.BaseViewer', {
	storage: undefined,
	navigation: undefined,
	flow: undefined,
	updateRequest: undefined,
	mainVbox: undefined,
	toolsBox: undefined,
	showNavigation: false,
	carousel: undefined,
	firstUpdate: true,
	tools: undefined,
	current: undefined,
	currentPreview: undefined,
	files: undefined,
	autoplay: false,
	resourceRev: 0,
	isDetailsVisible: true,
	uploadView: undefined,

	constructor: function(config) {
		this.mainVbox = new Ui.VBox();
	},

	setStorage: function(storage) {	
		this.storage = storage;
		if(this.canAddFile()) {
			this.setAllowedMode('copy');
			this.addMimetype('files');
		}
		this.connect(this, 'dropfile', function(dropbox, file) {
			this.onUploadFile(dropbox, file, 0);
		});

		this.setContent(this.mainVbox);

		this.carousel = new Ui.Carousel({ bufferingSize: 1 });
		this.mainVbox.prepend(this.carousel, true);
		this.connect(this.carousel, 'change', this.onCarouselChange);

//		var thumbButton = new Ui.ToggleButton({ icon: 'thumb', text: 'Vignettes' });
//		this.connect(thumbButton, 'toggle', this.onNavToggle);
//		this.connect(thumbButton, 'untoggle', this.onNavUntoggle);
//		this.actionButtons.unshift(thumbButton);
						
		this.tools = [];
//		this.setActionButtons(this.actionButtons);

//		this.navigation = new Ui.ScrollingArea({ scrollHorizontal: true, scrollVertical: false });
//		this.flow = new Wn.HDropBox();
//		this.flow.addMimetype('application/x-wn2-file');
//		this.connect(this.flow, 'dropat', this.onFileDropAt);
//		this.navigation.setContent(this.flow);

		// handle keyboard
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);
		
		// load the storage content
		this.update();
	},
	
	canAddFile: function() {
		return this.getResource().canWrite();
	},
	
	canDeleteFile: function() {
		return this.getResource().canWrite();
	},
	
	canModifyFile: function() {
		return this.getResource().canWrite();
	},

	getStorage: function() {
		return this.storage;
	},

	play: function() {
		this.setAutoPlay(true);
	},
	
	setAutoPlay: function(autoplay) {
		if(this.autoplay !== autoplay)
			this.autoplay = autoplay;
	},
			
	onFileDropAt: function(hbox, mimetype, data, pos) {	
		if(data.indexOf(':') == -1)
			return;
		var tab = data.split(':');
		if(tab.length != 2)
			return;
		var storage = tab[0];
		var file = parseInt(tab[1]);
		// check if we already display this file
		var found = undefined;
		var foundAt = -1;
		for(var i = 0; (i < this.flow.getLogicalChildren().length) && (found === undefined); i++) {
			var preview = this.flow.getLogicalChildren()[i];
			if(preview.getStorage()+':'+preview.getFile().id == data) {
				found = preview;
				foundAt = i;
			}
		}
		if(found !== undefined) {
			if((foundAt != pos) && (foundAt+1 != pos)) {
				if(foundAt < pos)
					pos--;
				this.flow.moveAt(found, pos);
				// update the carousel too
				var carouselItem = this.carousel.getLogicalChildren()[foundAt];
				this.carousel.moveAt(carouselItem, pos);
				// notify position change
				var request = new Core.HttpRequest({
					method: 'PUT', url: '/cloud/storage/'+storage+'/'+file,
					content: JSON.stringify({ position: pos }) });
				request.send();
			}
		}
		// a new file ?
		else {
		 	// TODO: move or copy if possible
		}
	},
	
/*	onStorageMessageReceived: function(socket, msg) {
		var json = JSON.parse(msg);
		if(json.action === 'deleted')
			Ui.App.current.setDefaultMain();
		else {
			if(this.storageRev !== json.rev)
				this.update();
		}
	},*/

	update: function() {
		if(this.updateRequest !== undefined)
			return;
		this.updateRequest = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/0?depth=1' });
		this.connect(this.updateRequest, 'done', this.onUpdateDone);
		this.connect(this.updateRequest, 'error', this.onUpdateError);
		this.updateRequest.send();
	},

	deleteCurrent: function() {
		if(!this.getResource().canWrite())
			return;

		// delete current file
		var current = this.carousel.getCurrent();
		if((current !== undefined) && Storage.FileViewer.hasInstance(current))
			current.deleteFile();
	},
	
	addFile: function(file) {
		var found = false;
		var carouselStart = (this.canAddFile()?1:0);
		for(var i = carouselStart; i < this.carousel.getLogicalChildren().length; i++) {
			if(Storage.FileViewer.hasInstance(this.carousel.getLogicalChildren()[i]) &&
				(this.carousel.getLogicalChildren()[i].getFile().id === file.id)) {
				this.carousel.setCurrentAt(i);
				found = true;
				break;
			}
		}
		if(!found) {
			if(this.navigation !== undefined) {
				var preview = new Storage.FilePreview({ resource: this.getResource(), storage: this.storage, file: file });
				this.connect(preview, 'press', this.onPreviewPress);
				this.flow.insertAt(preview, file.position);
			}
			var viewer = new Storage.FileViewer({
				storage: this.storage, file: file, viewer: this,
				showDetails: this.isDetailsVisible
			});
			this.carousel.insertAt(viewer, carouselStart+file.position);
			this.carousel.setCurrent(viewer);
		}
	},

	addNavigation: function() {
		if(this.navigation === undefined) {
			this.navigation = new Wn.NavigationBox();

			var hbox = new Ui.HBox({ spacing: 10 });
			this.navigation.setContent(hbox);

			this.flow = new Wn.HDropBox({ spacing: 10, margin: 2 });

			if(this.canAddFile()) {
				var addButton = new Wn.ListAddButton();
				this.connect(addButton, 'press', function() {
					var dialog = new Storage.NewDialog({ viewer: this });
					dialog.open();
				});

				hbox.append(addButton);

				this.flow.addMimetype('application/x-wn2-file');
				this.flow.setAllowedMode('copy');
				this.flow.addMimetype('files');
				this.connect(this.flow, 'dropat', this.onFileDropAt);
				this.connect(this.flow, 'dropfileat', this.onUploadFile);
			}

			hbox.append(this.flow);
			this.mainVbox.append(this.navigation);
			
			this.updatePreviews(this.files);
			this.updatePreviewCurrent();
		}
	},
	
	removeNavigation: function() {
		if(this.navigation !== undefined) {
			this.mainVbox.remove(this.navigation);
			this.navigation = undefined;
		}
	},

	showThumbs: function() {
		this.showNavigation = true;
		this.addNavigation();
	},

	hideThumbs: function() {
		this.showNavigation = false;
		this.removeNavigation();
	},

	showDetails: function() {
		this.isDetailsVisible = true;
		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++)
			if(Storage.FileViewer.hasInstance(this.carousel.getLogicalChildren()[i]))
				this.carousel.getLogicalChildren()[i].showDetails();
	},

	hideDetails: function() {
		this.isDetailsVisible = false;
		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++)
			if(Storage.FileViewer.hasInstance(this.carousel.getLogicalChildren()[i]))
				this.carousel.getLogicalChildren()[i].hideDetails();
	},

	onCarouselChange: function(carousel, pos) {

		if(carousel.getLogicalChildren().length == 0)
			return;
	
		//console.log('onCarouselChange pos: '+pos+', length: '+carousel.getLogicalChildren().length+' ,firstUpdate: '+this.firstUpdate);
		
		if((this.current !== undefined) && Storage.FileViewer.hasInstance(this.current)){
			this.current.uncurrent();
			this.disconnect(this.current, 'end', this.onCurrentEnd);
		}
		
		var current = this.carousel.getLogicalChildren()[pos];

		if((current !== undefined) && Storage.FileViewer.hasInstance(current)) {
			current.current();
			// change the tools box
			if(current.getFile() !== undefined) {
				this.path = this.carousel.getLogicalChildren()[pos].getFile().id;
				Ui.App.current.notifyMainPath('resource:'+this.getResource().getId()+':'+this.carousel.getLogicalChildren()[pos].getFile().id);

			}
			this.connect(current, 'end', this.onCurrentEnd);
			if(this.autoplay)
				current.play();
		}
		this.current = current;
		this.updatePreviewCurrent();
	},
	
	updatePreviewCurrent: function() {	
		if(this.currentPreview !== undefined) {
			this.currentPreview.uncurrent();
			this.currentPreview = undefined;
		}

		// find the corresponding thumbnail and scroll into view
		if((this.navigation !== undefined) && (this.current !== undefined) && Storage.FileViewer.hasInstance(this.current) && (this.current.getFile() !== undefined)) {
			for(var i = 0; i < this.flow.getLogicalChildren().length; i++) {
				var preview = this.flow.getLogicalChildren()[i];
				if((preview.getFile() !== undefined) && (preview.getFile().id == this.current.getFile().id)) {
					if('scrollIntoViewIfNeeded' in preview.getDrawing())
						preview.getDrawing().scrollIntoViewIfNeeded();
					else
						preview.getDrawing().scrollIntoView();
					this.currentPreview = preview;
					this.currentPreview.current();
					break;
				}
			}
		}
	},
	
	updatePreviews: function(files) {
		//console.log('updatePreviews files: '+files.length+', nav: '+this.navigation);
	
		if(this.navigation === undefined)
			return;
		// update the previews			
		var remove = [];
		for(var i = 0; i < this.flow.getLogicalChildren().length; i++) {
			var child = this.flow.getLogicalChildren()[i];
			var file = child.getFile();
			if(file == undefined)
				continue;
			var found = undefined;
			if((file !== undefined) && (files !== undefined)) {
				for(var i2 = 0; (found === undefined) && (i2 < files.length); i2++) {
					if(files[i2].id == file.id)
						found = files[i2];
				}
			}
			if(found !== undefined) {
				found.hostResourceViewerSeen = true;
				child.update(found);
			}
			else
				remove.push(child);
		}
		for(var i = 0; i < remove.length; i++)
			this.flow.remove(remove[i]);
		// add new
		if(files !== undefined) {
			for(var i = 0; i < files.length; i++) {
				if(!files[i].hostResourceViewerSeen) {
					var file = files[i];
					var preview = new Storage.FilePreview({ resource: this.getResource(), storage: this.storage, file: file });
					this.connect(preview, 'press', this.onPreviewPress);
					this.flow.insertAt(preview, file.position);
				}
				else
					delete(files[i].hostResourceViewerSeen);
			}
		}
	},

	onUpdateDone: function() {
		var res = this.updateRequest.getResponseJSON();
		this.storageRev = res.storage_rev;

		if(this.firstUpdate && this.canAddFile()) {
			this.uploadView = new Storage.UploadView({
				resource: this.getResource(), verticalAlign: 'center', horizontalAlign: 'center',
				width: 300, height: 300
			});
			this.connect(this.uploadView, 'press', function() {
				var dialog = new Storage.NewDialog({ viewer: this });
				dialog.open();
			});
			this.carousel.append(this.uploadView);
		}

		var carouselStart = (this.canAddFile()?1:0);
		
		var count = (res.children === undefined)?0:res.children.length;

		if((count === 0) && !this.canAddFile())
			this.carousel.setContent(new Ui.Text({
				fontSize: 20, text: 'Il n\'y a pas encore de fichier. Revenez plus tard.',
				textAlign: 'center', verticalAlign: 'center', margin: 20, interLine: 1.4
			}));

		// update the previews
		this.updatePreviews(res.children);

		//console.log(this+'.onUpdateDone '+carouselStart+', '+this.carousel.getLogicalChildren().length);

		// update the viewers
		var remove = [];
		for(var i = carouselStart; i < this.carousel.getLogicalChildren().length; i++) {
			var child = this.carousel.getLogicalChildren()[i];
			if(!('getFile' in child))
				continue;
			var file = child.getFile();
//			console.log(file);
			if(file === undefined)
				continue;
			var found = undefined;
			if('children' in res) {
				for(var i2 = 0; (found === undefined) && (i2 < res.children.length); i2++) {
					if(res.children[i2].id == file.id)
						found = res.children[i2];
				}
			}
			if(found !== undefined) {
//				console.log('found in children');
				child.update(found);
				found.hostResourceViewerSeen = true;
			}
			else {
//				console.log('NOT found remove');
				remove.push(child);
			}
		}
		//console.log('remove: '+remove.length);

		for(var i = 0; i < remove.length; i++)
			this.carousel.remove(remove[i]);

		// add new
		if('children' in res) {
			var empty = (this.carousel.getLogicalChildren().length === 0);
			for(var i = 0; i < res.children.length; i++) {
				if(!res.children[i].hostResourceViewerSeen) {
					var file = res.children[i];
					var viewer = new Storage.FileViewer({
						storage: this.storage, file: file, viewer: this,
						showDetails: this.isDetailsVisible
					});
					this.carousel.insertAt(viewer, carouselStart + file.position);
				}
				else
					delete(res.children[i].hostResourceViewerSeen);
			}
			if(empty)
				this.carousel.getLogicalChildren()[0].current();
		}
		this.files = res.children;
		this.updateRequest = undefined;

		if(this.firstUpdate) {
			this.firstUpdate = false;
			var path = this.getPath();
			if(path !== undefined) {
				// find the corresponding file and goto it
				for(var i = carouselStart; i < this.carousel.getLogicalChildren().length; i++) {
					if(this.carousel.getLogicalChildren()[i].getFile().id == path) {
						this.carousel.setCurrentAt(i, true);
						break;
					}
				}
			}
			else
				this.carousel.setCurrentAt(carouselStart, true);
		}
		this.onCarouselChange(this.carousel, this.carousel.getCurrentPosition());
	},

	onUpdateError: function() {
		this.updateRequest = undefined;
	},

	onPreviousPress: function() {
		this.carousel.previous();
	},

	onNextPress: function() {
		this.carousel.next();
	},

	onPreviewPress: function(preview) {
		//console.log(this+'.onPreviewPress');
		for(var i = (this.getResource().canWrite()?1:0); i < this.carousel.getLogicalChildren().length; i++) {
			if(((this.carousel.getLogicalChildren()[i].getFile() !== undefined) && (preview.getFile() !== undefined) &&
			    (this.carousel.getLogicalChildren()[i].getFile().id === preview.getFile().id)) ||
               ((this.carousel.getLogicalChildren()[i].getUploader() !== undefined) && (preview.getUploader() !== undefined) &&
                (this.carousel.getLogicalChildren()[i].getUploader() === preview.getUploader()))) {
				this.carousel.setCurrentAt(i);
				break;
			}
		}
	},

	onKeyUp: function(event) {
		// delete key
		if((event.which == 46) && this.carousel.getHasFocus()) {
			event.stopPropagation();
			event.preventDefault();
			this.onDeletePress();
		}
	},

	onUploadFile: function(element, file, position) {
		if(!this.getResource().canWrite()) {
			var dialog = new Ui.Dialog({
				title: 'Problème de droit',
				fullScrolling: true,
				preferredWidth: 300,
				preferredHeight: 300
			});
			var closeButton = new Ui.Button({ text: 'Fermer' });
			dialog.setContent(new Ui.Text({ text: 'Vous n\'avez pas le droit d\'écrire sur cette resource' }));
			dialog.setActionButtons([ closeButton ]);
			dialog.open();
			this.connect(closeButton, 'press', function() {
				dialog.close();
			});
		}
		else {
			var uploader = new Wn.FilePostUploader({ file: file, service: '/cloud/storage/'+this.storage+'/0', resource: this.getResource() });
			uploader.setField('define', JSON.stringify({ position: (position !== undefined) ? position : 0 }));
			uploader.hostStorage = this.storage;
			/*this.connect(uploader, 'error', this.onUploadError);
			this.connect(uploader, 'complete', this.onUploadError);
			if(this.navigation !== undefined) {
				var preview = new Storage.FilePreview({ resource: this.getResource(), storage: this.storage, uploader: uploader });
				this.connect(preview, 'press', this.onPreviewPress);
				if(position !== undefined)
					this.flow.insertAt(preview, position);
				else
					this.flow.append(preview);
			}
			var viewer = new Storage.FileViewer({
				storage: this.storage, uploader: uploader, viewer: this,
				showDetails: this.isDetailsVisible
			});
			if(position !== undefined)
				this.carousel.insertAt(viewer, position);
			else
				this.carousel.append(viewer);
			this.carousel.setCurrent(viewer);*/
			this.carousel.setCurrentAt(0);

			// register the uploader in the App
			Ui.App.current.addUploader(uploader);
			uploader.send();
		}
	},

	onUploadError: function(uploader) {
		// remove the file preview
		var found = undefined;
		if(this.flow !== undefined) {
			for(var i = 0; (found === undefined) && (i < this.flow.getLogicalChildren().length); i++) {
				if(this.flow.getLogicalChildren()[i].getUploader() == uploader)
					found = this.flow.getLogicalChildren()[i];
			}
			if(found != undefined)
				this.flow.remove(found);
		}
		// remove the file viewer
		found = undefined;
		for(var i = 0; (found == undefined) && (i < this.carousel.getLogicalChildren().length); i++) {
			if(Storage.FileViewer.hasInstance(this.carousel.getLogicalChildren()[i]) && 
				(this.carousel.getLogicalChildren()[i].getUploader() == uploader))
				found = this.carousel.getLogicalChildren()[i];
		}
		if(found != undefined)
			this.carousel.remove(found);
	},

	onNewTextPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Nouveau fichier texte',
			fullScrolling: true,
			preferredWidth: 300,
			preferredHeight: 300
		});
		dialog.setCancelButton(new Ui.DialogCloseButton());

		var vbox = new Ui.VBox({ spacing: 10 });
		dialog.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom du fichier', horizontalAlign: 'left' }));

		var textField = new Ui.TextField({ marginLeft: 20 });
		vbox.append(textField);

		var createButton = new Ui.DefaultButton({ text: 'Créer' });
		dialog.setActionButtons([ createButton ]);

		this.connect(createButton, 'press', function() {
			dialog.disable();
			var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/storage/'+this.storage+'/0' });
			request.setRequestHeader('Content-Type', 'application/json');
			request.setContent(JSON.stringify({ name: textField.getValue(), mimetype: 'text/plain', position: 0 }));
			this.connect(request, 'done', function() {
				this.addFile(request.getResponseJSON());
				dialog.close();
			});
			this.connect(request, 'error', function() {
				dialog.close();
			});
			request.send();
		});

		dialog.open();
	},

	onNewUriPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Nouveau lien vers un site',
			fullScrolling: true,
			preferredWidth: 400,
			preferredHeight: 300
		});
		dialog.setCancelButton(new Ui.DialogCloseButton());

		var vbox = new Ui.VBox({ spacing: 10 });
		dialog.setContent(vbox);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Nom', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		var textField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(textField, true);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Adresse', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		var uriTextField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(uriTextField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Options', textAlign: 'right', verticalAlign: 'center', width: 100 }));
		var iframeField = new Ui.CheckBox({ verticalAlign: 'center', text: 'intégration "iframe"' });
		hbox.append(iframeField, true);

		var createButton = new Ui.DefaultButton({ text: 'Créer' });
		dialog.setActionButtons([ createButton ]);

		this.connect(createButton, 'press', function() {
			dialog.disable();

			var boundary = '----';
			var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			for(var i = 0; i < 16; i++)
				boundary += characters[Math.floor(Math.random()*characters.length)];
			boundary += '----';

			var request = new Core.HttpRequest({
				method: 'POST',
				url: '/cloud/storage/'+this.storage+'/0'
			});
			request.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
			request.setContent(
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="define"\r\n'+
				'Content-Type: application/json; charset=UTF-8\r\n\r\n'+
				JSON.stringify({ name: textField.getValue(), mimetype: 'text/uri-list', position: 0, meta: { iframe: iframeField.getValue().toString() } })+'\r\n'+
				'--'+boundary+'\r\n'+
				'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
				'Content-Type: text/plain; charset=UTF-8\r\n\r\n'+
				uriTextField.getValue()+'\r\n'+
				'--'+boundary+'--\r\n'
			);
			this.connect(request, 'done', function() {
				this.addFile(request.getResponseJSON());
				dialog.close();
			});
			this.connect(request, 'error', function() {
				dialog.close();
			});
			request.send();			
		});
		dialog.open();
	},
	
	onAutoPlayToggle: function() {
		this.autoplay = true;
		if(this.current !== undefined)
			this.current.play();
	},

	onAutoPlayUntoggle: function() {
		this.autoplay = false;
	},
	
	onCurrentEnd: function(item) {
		//console.log(this+'.onCurrentEnd('+item.getFile().id+')');
		this.disconnect(item, 'end', this.onCurrentEnd);

		if(this.autoplay) {
			if(this.carousel.getCurrentPosition() >= this.carousel.getLogicalChildren().length - 1)
				this.setAutoPlay(false);
			else
				this.carousel.next();
		}
	},
	
	onPropertiesPress: function() {
		if(this.current !== undefined)
			this.current.showProperties();
	}

}, {
	fullscreen: function() {
		//console.log(this+'.fullscreen current: '+this.current);
		Storage.BaseViewer.base.fullscreen.apply(this, arguments);
//		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++)
//			this.carousel.getLogicalChildren()[i].fullscreen();
	},

	unfullscreen: function() {
		Storage.BaseViewer.base.unfullscreen.apply(this, arguments);
//		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++)
//			this.carousel.getLogicalChildren()[i].unfullscreen();
	},

	onResourceChange: function() {
		Storage.BaseViewer.base.onResourceChange.apply(this, arguments);
		if((this.storage !== undefined) && (this.resourceRev !== this.getResource().getData().rev)) {
			this.resourceRev = this.getResource().getData().rev;
			this.update();
		}
	},
	
	onDeletePress: function() {
		// if we cant delete files, call class parent implementation
		if(!this.canDeleteFile()) {
			Storage.BaseViewer.base.onDeletePress.call(this);
			return;
		}
	
		if(this.carousel.getLogicalChildren().length == 0) {
			var dialog = new Ui.Dialog({
				title: 'Suppression',
				preferredWidth: 400,
				fullScrolling: false,
				cancelButton: new Ui.DialogCloseButton({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Voulez vous définitivement supprimer cette ressource ?' })
			});
			var removeAllButton = new Ui.DefaultButton({ text: 'Supprimer' });
			this.connect(removeAllButton, 'press', function() {
				dialog.close();
				this.deleteResource();
			});
			dialog.setActionButtons([ removeAllButton ]);
			dialog.open();
		}
		else {
			var dialog = new Ui.Dialog({
				title: 'Suppression',
				preferredWidth: 400,
				fullScrolling: false,
				cancelButton: new Ui.DialogCloseButton({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Que voulez vous définitivement supprimer ? Le fichier actuel ou la ressource et l\'ensemble des fichiers ?' })
			});
			var removeButton = new Ui.DefaultButton({ text: 'Le fichier' });
			this.connect(removeButton, 'press', function() {
				this.deleteCurrent();
				dialog.close();
			});
			var removeAllButton = new Wn.AlertButton({ text: 'Tout' });
			this.connect(removeAllButton, 'press', function() {
				dialog.close();
				
				var dialog2 = new Ui.Dialog({
					title: 'Suppression',
					preferredWidth: 400,
					fullScrolling: false,
					cancelButton: new Ui.DialogCloseButton(),
					content: new Ui.Text({ text: 'Voulez vraiment vous définitivement supprimer cette ressource et TOUS les fichiers ?' })
				});
				var removeAllButton = new Ui.DefaultButton({ text: 'Supprimer' });
				this.connect(removeAllButton, 'press', function() {
					dialog2.close();
					this.deleteResource();
				});
				dialog2.setActionButtons([ removeAllButton ]);
				dialog2.open();
			});
			dialog.setActionButtons([ removeAllButton, removeButton ]);
			dialog.open();
		}
	},

	// if path change, go to the corresponding file
	onPathChange: function(oldPath, newPath) {
		console.log(this+'.onPathChange newPath: '+newPath);
		if(newPath !== undefined) {
			// find the corresponding file and go to it
			for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
				if(Storage.FileViewer.hasInstance(this.carousel.getLogicalChildren()[i]) &&
					(this.carousel.getLogicalChildren()[i].getFile().id == newPath)) {
					this.carousel.setCurrentAt(i);
					break;
				}
			}
		}
	}
});

Storage.BaseViewer.extend('Storage.Viewer', {
	constructor: function(config) {
		this.setStorage(this.getResource().getStorageId());
	}
}, {}, {
	constructor: function() {
		Wn.ResourceViewer.register('storage', this);
	}
});

