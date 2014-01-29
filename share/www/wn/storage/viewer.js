
Ui.HBox.extend('Storage.FileViewer', {
	uploader: undefined,
	file: undefined,
	storage: undefined,
	updateNeeded: false,
	viewer: undefined,
	tools: undefined,
	contentBox: undefined,
	commentViewer: undefined,
//	preloadDone: false,
	fullscreen: false,
	playing: false,
	contentViewer: undefined,
	supportProperties: false,

	constructor: function(config) {
		this.addEvents('toolschange', 'end');
	
		this.storage = config.storage;
		delete(config.storage);
		this.viewer = config.viewer;
		delete(config.viewer);

		this.tools = [];

		this.contentBox = new Ui.LBox();
		this.append(this.contentBox, true);

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
		this.connect(this.viewer, 'fullscreen', this.onFullscreen);
		this.connect(this.viewer, 'unfullscreen', this.onUnFullscreen);
		
		this.connect(this, 'load', this.onFileViewerLoad);
		this.connect(this, 'unload', this.onFileViewerUnload);
	},
	
	getSupportProperties: function() {
		return this.supportProperties;
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
//		console.log(this+'.update('+file.id+')');
		if((this.file === undefined) || this.updateNeeded || (JSON.stringify(this.file) !== JSON.stringify(file))) {
			this.file = file;
			this.updateNeeded = false;
			if(this.getIsLoaded())
				this.buildContent();
		}
	},

	removeContent: function() {
		if(this.commentViewer !== undefined) {
			if(this.commentViewer.getParent() !== undefined)
				this.commentViewer.getParent().remove(this.commentViewer);
			this.commentViewer = undefined;
		}
		this.contentBox.setContent();
	},

	buildContent: function() {	
		if(this.uploader !== undefined)
			this.contentBox.setContent(new Storage.UploaderViewer({ storage: this.storage, uploader: this.uploader, fileViewer: this }));
		else {
			//console.log('buildContent file: '+this.file.id+', mime: '+this.file.mimetype);
		
			this.tools = [];
			this.supportProperties = true;

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

			this.contentBox.setContent(this.contentViewer);
			if(this.playing)
				this.play();

//			if(!this.fullscreen) {
				if(this.commentViewer === undefined) {
					this.commentViewer = new Wn.CommentViewer({
						marginRight: 5, user: Ui.App.current.getUser(),
						resource: this.viewer.getResource(),
						storage: this.storage, file: this.file,
						verticalAlign: 'top', horizontalAlign: 'right'
					});
				}
				else {
					this.commentViewer.updateFile(this.file);
					if(this.commentViewer.getParent() !== undefined)
						this.commentViewer.getParent().remove(this.commentViewer);
				}
				if(this.fullscreen)
					this.commentViewer.hide(true);
					
				if(this.file.comments.length > 0) {
					this.commentViewer.setVerticalAlign('stretch');
					this.append(this.commentViewer);
				}
				else
					this.contentBox.append(this.commentViewer);
//			}
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

	getTools: function() {
		return this.tools;
	},
	
	appendTool: function(tool) {
		this.tools.push(tool);
		this.fireEvent('toolschange', this, this.tools);
	},
	
	play: function() {
		if(this.contentViewer === undefined) {
			this.playing = true;
		}
		else {
			if('play' in this.contentViewer) {
				this.connect(this.contentViewer, 'end', this.onPlayEnd);
				this.contentViewer.play();
			}
			else
				new Core.DelayedTask({ scope: this, delay: 5, callback: this.onPlayEnd });
		}
	},

//	load: function() {
//		if(!this.preloadDone) {
//			if('load' in this.getChildren()[0])
//				this.getChildren()[0].load();
//		}
//	},

	current: function() {
//		console.log('FileViewer current storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentBox.getChildren().length > 0) && ('current' in this.contentBox.getChildren()[0]))
			this.contentBox.getChildren()[0].current();
	},
	
	uncurrent: function() {
//		console.log('FileViewer uncurrent storage: '+this.storage+', file: '+this.file.id);	
		if((this.contentBox.getChildren().length > 0) && ('uncurrent' in this.contentBox.getChildren()[0]))
			this.contentBox.getChildren()[0].uncurrent();
	},

	onPlayEnd: function() {
		this.playing = false;
		this.fireEvent('end', this);
	},

	onCommentViewerUpdate: function() {
		if(this.commentViewer === undefined)
			return;
		if(this.commentViewer.getComments().length > 0) {
			if(this.commentViewer.getParent() === this.contentBox) {
				this.contentBox.remove(this.commentViewer);
				this.append(this.commentViewer);
				this.commentViewer.setVerticalAlign('stretch');
			}
		}
	},

	onFullscreen: function() {
		this.fullscreen = true;
		if(this.commentViewer !== undefined) {
			this.commentViewer.hide(true);
//			if(this.commentViewer.getComments().length == 0)
//				this.contentBox.remove(this.commentViewer);
//			else
//				this.remove(this.commentViewer);
		}
	},

	onUnFullscreen: function() {
		this.fullscreen = false;
		if(this.commentViewer !== undefined) {
			this.commentViewer.show();
		}
		
//		if(this.commentViewer === undefined) {
//			this.commentViewer = new Wn.CommentViewer({
//				marginRight: 5, user: Ui.App.current.getUser(),
//				resource: 'storage:'+this.storage+'/'+this.file.id,
//				verticalAlign: 'top', horizontalAlign: 'right'
//			});
//			this.connect(this.commentViewer, 'update', this.onCommentViewerUpdate);
//		}
//		if(this.commentViewer.getComments().length == 0)
//			this.contentBox.append(this.commentViewer);
//		else
//			this.append(this.commentViewer);
	},

//	onDeletePress: function() {
//		this.deleteFile();
//	},

	deleteFile: function() {
//		var dialog = new Ui.Dialog({
//			cancelButton: new Ui.Button({ text: 'Annuler' }),
//			content: new Ui.Text({ width: 300, text: 'Voulez vous vraiment supprimer ce fichier. Il sera définitivement perdu.' })
//		});
//		var removeButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
//		this.connect(removeButton, 'press', function() {
			if(this.file != undefined) {
				var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id });
				request.send();
			}
			else if(this.uploader != undefined)
				this.uploader.abort();
//			dialog.close();
//		});
//		dialog.setActionButtons([ removeButton ]);
//		dialog.open();
	},

//	onUploaderComplete: function() {
//		this.file = this.uploader.getResponseJSON();
//		console.log('onUploaderComplete file: '+this.file.id);
//		this.uploader = undefined;
//		this.updateNeeded = true;
//	},
	
	onFileViewerLoad: function() {
		this.buildContent();
	},
	
	onFileViewerUnload: function() {
		this.removeContent();
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

		this.progressbar = new Wn.ProgressBar({ width: 120, height: 10 });
		vbox.append(this.progressbar);

		if(this.uploader.getFile().getFileName() != undefined)
			vbox.append(new Ui.CompactLabel({ width: 256, maxLine: 3, textAlign: 'center', text: this.uploader.getFile().getFileName() }));

		this.connect(this.uploader, 'progress', this.onUploaderProgress);
	},

	onUploaderProgress: function(uploader, loaded, total) {
		this.progressbar.setValue(loaded/total);
	}
});

Ui.LBox.extend('Storage.ImageFileViewer', {
	storage: undefined,
	file: undefined,
	image: undefined,
	values: undefined,
	quality: false,
	fileViewer: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
				
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		this.image = new Wn.ScaledImage();
//		this.image.setSrc('/cloud/imageconvert?storage='+this.storage+'&file='+this.file.id+'&resize=1024x768');
		this.image.setSrc('/cloud/previewhigh/'+this.storage+'/'+this.file.id+'?rev='+this.file.rev);
		this.setContent(this.image);
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

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		
		this.setContent(vbox);
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
		if(this.player === undefined)
			this.checkReady();
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
		if(this.player !== undefined)
			this.player.pause();
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
	
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
		this.fileViewer = config.fileViewer;
		delete(config.fileViewer);

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		
		this.setContent(vbox);

		this.setLock(true);
		this.connect(this, 'press', this.onVideoPress);
	},

	checkReady: function() {
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
		if(this.player === undefined)
			this.checkReady();
	},

	onHidden: function() {
		if(this.checkTask !== undefined) {
			this.checkTask.abort();
			this.checkTask = undefined;
		}
		if(this.player !== undefined)
			this.player.pause();
	}
});

Ui.LBox.extend('Storage.TextFileViewer', {
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

		var scroll = new Ui.ScrollingArea({ directionRelease: true, scrollHorizontal: false, scrollVertical: true });
		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic({ margin: 7 }));
		scroll.setContent(lbox);

		this.text = new Wn.ImproveText({ margin: 30, style: { "Wn.ImproveText": { fontSize: 20 } } });

		lbox.append(this.text);

		//console.log('src: '+'/app/texteditor/?storage='+this.storage+'&file='+this.file.id);
		var editButton = new Ui.LinkButton({ icon: 'edit', src: '/app/texteditor/?storage='+this.storage+'&file='+this.file.id });
		this.fileViewer.appendTool(editButton);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/content?rev='+this.file.rev });
		this.connect(request, 'done', this.onTextLoaded);
		request.send();
	},

	onTextLoaded: function(req) {
		this.text.setText(req.getResponseText());
	}
});

Ui.CanvasElement.extend('Storage.PageBackgroundGraphic', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(7, 7, width-14, height-14);
	}
});


Ui.LBox.extend('Storage.RssItemFileViewer', {
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

		var scroll = new Ui.ScrollingArea({ directionRelease: true, scrollHorizontal: false, scrollVertical: true });
		this.setContent(scroll);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic());
		scroll.setContent(lbox);
		
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
			html += '<a href="'+this.file.meta.link+'" style="cursor: pointer; text-decoration: underline; color: #4d4d4d">article complet</a><br>';
		html += '<br>';
		html += req.getResponseText();
		html += '</div>';
		this.content.setHtml(html);
	},
	
	onContentLink: function(html, url) {
		window.open(url, '_blank');
	}
});

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
});

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
	}
}, {
	measureCore: function(width, height) {
		return { width: width, height: ((width-20)/this.ratio)+20 };
	},

	onVisible: function() {
		if(this.graphic === undefined) {
			this.graphic = new Storage.PdfPageGraphic({ ratio: this.ratio, src: '/cloud/pdf/'+this.storage+'/'+this.file.id+'/pages/'+this.page+'/image?rev='+this.file.rev });
			this.append(this.graphic);
		}
	},

	onHidden: function() {
		if(this.graphic !== undefined) {			
			this.remove(this.graphic);
			this.graphic = undefined;
		}
	},
	
	onChildInvalidateMeasure: function(child, remove) {
		child.measure(this.getLayoutWidth(), this.getLayoutHeight());
		child.arrange(0, 0, this.getLayoutWidth(), this.getLayoutHeight());
	}
});

Ui.LBox.extend('Storage.PdfFileViewer', {
	storage: undefined,
	file: undefined,
	fileViewer: undefined,
	pages: undefined,
	data: undefined,
	isCurrent: false,
	scroll: undefined,
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

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Encodage en cours... Veuillez patienter', textAlign: 'center' }));
		this.setContent(vbox);		
	},
	
	checkReady: function() {
		if(this.checkTask != undefined)
			this.checkTask = undefined;
		if(this.request != undefined)
			return;
		this.request = new Core.HttpRequest({ method: 'GET', url: '/cloud/pdf/'+this.storage+'/'+this.file.id });
		this.connect(this.request, 'done', this.onCheckDone);
		this.connect(this.request, 'error', this.onCheckError);
		this.request.send();
	},
	
	onCheckDone: function() {
		var json = this.request.getResponseJSON();
		if(json.status == 'ready') {
			this.data = json;
			this.scroll = new Ui.ScrollingArea({ directionRelease: true, scrollHorizontal: false, scrollVertical: true });
			this.connect(this.scroll, 'scroll', this.onScroll);
			this.setContent(this.scroll);

			this.pages = new Ui.VBox({ spacing: 10 });
			this.scroll.setContent(this.pages);
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
	
	onScroll: function(scroll) {
		// limit visible pages
		var oy = scroll.getOffsetY();
		var oh = scroll.getLayoutHeight();
		for(var i = 0; i < this.pages.getChildren().length; i++) {
			var child = this.pages.getChildren()[i];
			var cy = child.getLayoutY();
			var ch = child.getLayoutHeight();
			var isVisible = 
				((cy >= oy) && (cy <= oy+oh)) ||
				((cy+ch >= oy) && (cy+ch <= oy+oh)) ||
				((oy >= cy) && (oy <= cy+ch)) ||
				((oy+oh >= cy) && (oy+oh <= cy+ch));
			if(isVisible)
				child.show();
			else
				child.hide();
		}
	},

	onDataDone: function(req) {
		for(var i = 0; i < this.data.pages.length; i++) {
			var page =  new Storage.PdfPage({
				storage: this.storage, file: this.file, page: i,
				ratio: this.data.pages[i].width/this.data.pages[i].height
			});
			page.hide();
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
	arrangeCore: function(w, h) {
		var ry = 0;
		if(this.scroll !== undefined)
			ry = this.scroll.getRelativeOffsetY(); 
	
		Storage.PdfFileViewer.base.arrangeCore.call(this, w, h);
		if(this.scroll !== undefined) {
			// scroll to stay at the same relative offset
			this.scroll.setOffset(undefined, ry);
			this.onScroll(this.scroll);
		}
	},

	onVisible: function() {
		if(this.scroll === undefined)
			this.checkReady();
		else
			this.onScroll(this.scroll);
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
		this.setPreferedWidth(300);
		this.setPreferedHeight(350);
				
		var vbox = new Ui.VBox({ uniform: true, spacing: 8 });
		this.setContent(vbox);
		
		var uploadButton;
		if(navigator.iOs) 
			uploadButton = new Ui.UploadButton({ icon: 'camera', text: 'Photo ou vidéo', orientation: 'horizontal' });
		else
			uploadButton = new Ui.UploadButton({ icon: 'savecloud2', text: 'Fichier local', orientation: 'horizontal' });
		this.connect(uploadButton, 'file', function(element, file) {
			this.viewer.onUploadFile(element, file);
			this.close();
		});
		vbox.append(uploadButton);

		var newButton = new Ui.Button({ icon: 'new', text: 'Fichier texte', orientation: 'horizontal' });
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
		this.setCancelButton(new Ui.Button({ text: 'Annuler' }));
	}
});

Wn.ResourceViewer.extend('Storage.BaseViewer', {
	storage: undefined,
	navigation: undefined,
	flow: undefined,
	updateRequest: undefined,
	storageSocket: undefined,
	storageRetryTask: undefined,
	mainVbox: undefined,
	toolsBox: undefined,
	dropbox: undefined,
	showNavigation: false,
	carousel: undefined,
	firstUpdate: true,
	tools: undefined,
	current: undefined,
	currentPreview: undefined,
	files: undefined,
	autoplay: false,
	autoplayButton: undefined,
	storageRev: 0,
	actionButtons: undefined,
	fileActionsSeparator: undefined,
	filePropertiesButton: undefined,

	constructor: function(config) {
		this.addEvents('toolstoggle');
		this.actionButtons = [];
		
		this.fileActionsSeparator = new Ui.Separator();
		this.filePropertiesButton = new Ui.Button({ icon: 'filetools' });
		this.connect(this.filePropertiesButton, 'press', this.onPropertiesPress);
		this.fileDownloadButton = new Ui.DownloadButton({ icon: 'savedisk' });
		this.autoplayButton = new Ui.ToggleButton({ icon: 'chronoplay' });
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

	setStorage: function(storage) {	
		this.storage = storage;
		this.dropbox = new Ui.DropBox();
		if(this.canAddFile()) {
			this.dropbox.setAllowedMode('copy');
			this.dropbox.addMimetype('files');
		}
		this.connect(this.dropbox, 'dropfile', this.onUploadFile);
		this.setContent(this.dropbox);
		
		this.mainVbox = new Ui.VBox();
		this.dropbox.setContent(this.mainVbox);

		this.carousel = new Ui.Carousel();
		this.mainVbox.append(this.carousel, true);
		this.connect(this.carousel, 'change', this.onCarouselChange);

		if(this.canAddFile()) {
			var addButton = new Ui.Button({ icon: 'plus' });
			this.actionButtons.unshift(addButton);
			this.connect(addButton, 'press', function() {
				var dialog = new Storage.NewDialog({ viewer: this });
				dialog.open();
			});
		}

		var thumbButton = new Ui.ToggleButton({ icon: 'thumb' });
		this.connect(thumbButton, 'toggle', this.onNavToggle);
		this.connect(thumbButton, 'untoggle', this.onNavUntoggle);
		this.actionButtons.unshift(thumbButton);
		
		this.connect(this.autoplayButton, 'toggle', this.onAutoPlayToggle);
		this.connect(this.autoplayButton, 'untoggle', this.onAutoPlayUntoggle);
		this.actionButtons.unshift(this.autoplayButton);
				
		this.tools = [];
		this.setActionButtons(this.actionButtons);

//		this.navigation = new Ui.ScrollingArea({ scrollHorizontal: true, scrollVertical: false });
//		this.flow = new Wn.HDropBox();
//		this.flow.addMimetype('application/x-wn2-file');
//		this.connect(this.flow, 'dropat', this.onFileDropAt);
//		this.navigation.setContent(this.flow);

		this.connect(this, 'fullscreen', this.onFullScreen);
		this.connect(this, 'unfullscreen', this.onUnFullScreen);

		// handle keyboard
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);
		
		// load the storage content
		this.update();
		
		if(this.getIsLoaded())
			this.startStorageMonitoring();
	},
	
	play: function() {
		this.setAutoPlay(true);
	},
	
	setAutoPlay: function(autoplay) {
		if(this.autoplay != autoplay) {
			this.autoplay = autoplay;
			if(this.autoplay)
				this.autoplayButton.toggle();
			else
				this.autoplayButton.untoggle();
		}
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

	stopStorageMonitoring: function() {
		if(this.storageSocket != undefined)
			this.storageSocket.close();
	},

	startStorageMonitoring: function() {	
		if(this.storageSocket === undefined) {
			this.storageSocket = new Core.Socket({ service: '/cloud/storage/'+this.storage });
			this.connect(this.storageSocket, 'message', this.onStorageMessageReceived);
			this.connect(this.storageSocket, 'error', this.onStorageSocketError);
			this.connect(this.storageSocket, 'close', this.onStorageSocketClose);
		}
	},

	onStorageSocketError: function() {
		this.storageSocket.close();
	},

	onStorageSocketClose: function() {
		this.disconnect(this.storageSocket, 'message', this.onStorageMessageReceived);
		this.disconnect(this.storageSocket, 'error', this.onStorageSocketError);
		this.disconnect(this.storageSocket, 'close', this.onStorageSocketClose);
		this.storageSocket = undefined;
		if(this.getIsLoaded())
			this.storageRetryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: this.startStorageMonitoring });
	},

	onStorageMessageReceived: function(socket, msg) {
		var json = JSON.parse(msg);
		if(json.action === 'deleted')
			Ui.App.current.setDefaultMain();
		else {
			if(this.storageRev !== json.rev)
				this.update();
		}
	},

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
		if((current != undefined) && Storage.FileViewer.hasInstance(current))
			current.deleteFile();
	},
	
	addFile: function(file) {
		var found = false;
		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
			if(this.carousel.getLogicalChildren()[i].getFile().id === file.id) {
				this.carousel.setCurrentAt(i);
				found = true;
				break;
			}
		}
		if(!found) {
			if(this.navigation !== undefined) {
				var preview = new Storage.FilePreview({ storage: this.storage, file: file });
				this.connect(preview, 'press', this.onPreviewPress);
				this.flow.insertAt(preview, file.position);
			}
			var viewer = new Storage.FileViewer({ storage: this.storage, file: file, viewer: this });
			this.carousel.insertAt(viewer, file.position);
			this.carousel.setCurrent(viewer);
		}
	},

	addNavigation: function() {
		if(this.navigation === undefined) {
			this.navigation = new Ui.ScrollingArea({ scrollHorizontal: true, scrollVertical: false });
			this.flow = new Wn.HDropBox({ spacing: 10 });
			
			if(this.canModifyFile()) {
				this.flow.addMimetype('application/x-wn2-file');
				this.flow.setAllowedMode('copy');
				this.flow.addMimetype('files');
				this.connect(this.flow, 'dropat', this.onFileDropAt);
				this.connect(this.flow, 'dropfileat', this.onUploadFile);
			}
			this.navigation.setContent(this.flow);
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

	onNavToggle: function() {
		this.showNavigation = true;
		this.addNavigation();
//		this.mainVbox.append(this.navigation);
	},

	onNavUntoggle: function() {
		this.showNavigation = false;
		this.removeNavigation();
//		this.mainVbox.remove(this.navigation);
	},

	onCarouselChange: function(carousel, pos) {

		if(carousel.getLogicalChildren().length == 0) {
			this.setTools([]);
			return;
		}
	
		//console.log('onCarouselChange pos: '+pos+', length: '+carousel.getLogicalChildren().length);
		
		if(this.current !== undefined) {
			this.current.uncurrent();
			this.disconnect(this.current, 'end', this.onCurrentEnd);
		}
		
		var current = this.carousel.getLogicalChildren()[pos];

		if(current !== undefined) {
			current.current();
			// handle file properties
			this.filePropertiesButton.setEnable(current.getSupportProperties());
			// handle download button
			if(current.getDownloadUrl() === undefined)
				this.fileDownloadButton.disable();
			else {
				this.fileDownloadButton.enable();
				this.fileDownloadButton.setSrc(current.getDownloadUrl());
			}
			// change the tools box
			this.setTools(current.getTools());
			if(current.getFile() !== undefined)
				Ui.App.current.notifyMainPath('resource:'+this.getResource().getId()+':'+this.carousel.getLogicalChildren()[pos].getFile().id);
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
		if((this.navigation !== undefined) && (this.current !== undefined) && (this.current.getFile() !== undefined)) {
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
	
	setTools: function(tools) {
		var actions = [];
		this.tools = [];
		for(var i = 0; i < tools.length; i++) {
			this.tools.push(tools[i]);
			actions.push(tools[i]);
		}
		actions.push(this.fileDownloadButton);
		actions.push(this.filePropertiesButton);
		actions.push(this.fileActionsSeparator);	
		for(var i = 0; i < this.actionButtons.length; i++)
			actions.push(this.actionButtons[i]);
		this.setActionButtons(actions);
	},

	onFullScreen: function() {
		if(this.showNavigation)
			this.removeNavigation();
//			this.mainVbox.remove(this.navigation);
	},

	onUnFullScreen: function() {
		if(this.showNavigation)
			this.addNavigation();
//			this.mainVbox.append(this.navigation);
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
					var preview = new Storage.FilePreview({ storage: this.storage, file: file });
					this.connect(preview, 'press', this.onPreviewPress);
					this.flow.insertAt(preview, file.position);
				}
				else
					delete(files[i].hostResourceViewerSeen);
			}
		}
	},

	onUpdateDone: function() {
//		console.log(this+'.onUpdateDone');

		var res = this.updateRequest.getResponseJSON();
		this.storageRev = res.storage_rev;
		
		var count = (res.children === undefined)?0:res.children.length;
		
		if(count === 0) {
			var text = 'Il n\'y a pas encore de fichier. Vous pouvez en créer ou les téléverser depuis la barre d\'outil.';
			if(navigator.supportDrag)
				text += ' Vous pouvez aussi téléverser des fichiers en faisant un glisser déposer dans cette zone.';
			if(!this.canAddFile())
				text = 'Il n\'y a pas encore de fichier. Revenez plus tard.';
			this.dropbox.setContent(new Ui.Text({ fontSize: 20, text: text, textAlign: 'center', verticalAlign: 'center', margin: 20, interLine: 1.4 }));
			this.filePropertiesButton.disable();
			this.fileDownloadButton.disable();
		}
		else if(this.mainVbox.getParent() === undefined)
			this.dropbox.setContent(this.mainVbox);

		// update the previews
		this.updatePreviews(res.children);
		
//		console.log(res.children);
		// update the viewers
		var remove = [];
		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
			var child = this.carousel.getLogicalChildren()[i];
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
		for(var i = 0; i < remove.length; i++)
			this.carousel.remove(remove[i]);

		// add new
		if('children' in res) {
			var empty = (this.carousel.getLogicalChildren().length === 0);
			for(var i = 0; i < res.children.length; i++) {
				if(!res.children[i].hostResourceViewerSeen) {
					var file = res.children[i];
					this.carousel.insertAt(new Storage.FileViewer({ storage: this.storage, file: file, viewer: this }), file.position);
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
			if(path != undefined) {
				// find the corresponding file and goto it
				for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
					if(this.carousel.getLogicalChildren()[i].getFile().id == path) {
						this.carousel.setCurrentAt(i);
						break;
					}
				}
			}
			else
				this.carousel.setCurrentAt(0);
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
		for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
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
		if(event.which == 46) {
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
				preferedWidth: 300,
				preferedHeight: 300
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
			var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/storage/'+this.storage+'/0' });
			if(position !== undefined) {
				uploader.setField('define', JSON.stringify({ position: position }));
			}
			uploader.hostStorage = this.storage;
			this.connect(uploader, 'error', this.onUploadError);
			this.connect(uploader, 'complete', this.onUploadError);
			if(this.navigation !== undefined) {
				var preview = new Storage.FilePreview({ storage: this.storage, uploader: uploader });
				this.connect(preview, 'press', this.onPreviewPress);
				if(position !== undefined)
					this.flow.insertAt(preview, position);
				else
					this.flow.append(preview);
			}
			var viewer = new Storage.FileViewer({ storage: this.storage, uploader: uploader, viewer: this });
			if(position !== undefined)
				this.carousel.insertAt(viewer, position);
			else
				this.carousel.append(viewer);
			this.carousel.setCurrent(viewer);

			// test if we already have the carousel shown
			if(this.mainVbox.getParent() === undefined)
				this.dropbox.setContent(this.mainVbox);
			
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
			if(this.carousel.getLogicalChildren()[i].getUploader() == uploader)
				found = this.carousel.getLogicalChildren()[i];
		}
		if(found != undefined)
			this.carousel.remove(found);
	},

	onNewTextPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Nouveau fichier texte',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300
		});
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));

		var vbox = new Ui.VBox({ spacing: 10 });
		dialog.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom du fichier', horizontalAlign: 'left' }));

		var textField = new Ui.TextField({ marginLeft: 20 });
		vbox.append(textField);

		var createButton = new Ui.Button({ text: 'Créer' });
		dialog.setActionButtons([ createButton ]);

		this.connect(createButton, 'press', function() {
			dialog.disable();
			var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/storage/'+this.storage+'/0' });
			request.setRequestHeader('Content-Type', 'application/json');
			request.setContent(JSON.stringify({ name: textField.getValue(), mimetype: 'text/plain' }));
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
			preferedWidth: 400,
			preferedHeight: 300
		});
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));

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

		var createButton = new Ui.Button({ text: 'Créer' });
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
				JSON.stringify({ name: textField.getValue(), mimetype: 'text/uri-list', meta: { iframe: iframeField.getValue().toString() } })+'\r\n'+
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
		// console.log(this+'.onCurrentEnd('+item.getFile().id+')');
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
	onLoad: function() {	
		Storage.BaseViewer.base.onLoad.call(this);

		if(this.storage !== undefined)
			this.startStorageMonitoring();
	},
	
	onUnload: function() {	
		Storage.BaseViewer.base.onUnload.call(this);
		if(this.storage !== undefined)
			this.stopStorageMonitoring();
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
				preferedWidth: 300,
				preferedHeight: 200,
				fullScrolling: true,
				cancelButton: new Ui.Button({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Voulez vous définitivement supprimer cette ressource ?' })
			});
			var removeAllButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
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
				preferedWidth: 300,
				preferedHeight: 200,
				fullScrolling: true,
				cancelButton: new Ui.Button({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Que voulez vous définitivement supprimer ? Le fichier actuel ou la ressource et l\'ensemble des fichiers ?' })
			});
			var removeButton = new Ui.Button({ text: 'Le fichier', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(removeButton, 'press', function() {
				this.deleteCurrent();
				dialog.close();
			});
			var removeAllButton = new Ui.Button({ text: 'Tout', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(removeAllButton, 'press', function() {
				dialog.close();
				
				var dialog2 = new Ui.Dialog({
					title: 'Suppression',
					preferedWidth: 300,
					preferedHeight: 200,
					fullScrolling: true,
					cancelButton: new Ui.Button({ text: 'Annuler' }),
					content: new Ui.Text({ text: 'Voulez vraiment vous définitivement supprimer cette ressource et TOUS les fichiers ?' })
				});
				var removeAllButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
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
		if(newPath !== undefined) {
			// find the corresponding file and goto it
			for(var i = 0; i < this.carousel.getLogicalChildren().length; i++) {
				if(this.carousel.getLogicalChildren()[i].getFile().id == newPath) {
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

