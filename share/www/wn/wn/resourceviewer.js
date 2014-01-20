
Ui.Dialog.extend('Wn.ResourceDeleteDialog', {
	resource: undefined,
	
	constructor: function(config) {
		this.addEvents('done');
	
		this.resource = config.resource;
		delete(config.resource);
		
		this.setPreferedWidth(300);
		this.setPreferedHeight(200);
		this.setFullScrolling(true);
		this.setTitle('Suppression');
		
		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.setCancelButton(new Ui.Button({ text: 'Annuler' }));
			this.setContent(new Ui.Text({ text: 'Voulez vous vraiment supprimer cette ressource pour vous et toutes les personnes avec qui vous la partagée ?' }));
		
			var removeButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(removeButton, 'press', function() {
				this.close();
				this.resource.deleteResource();
				this.fireEvent('done', this, this.resource);
			});
			this.setActionButtons([ removeButton ]);
		}
		else {
			this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
			this.setContent(new Ui.Text({ text: 'Voulez n\'avez pas les droits nécessaires pour supprimer cette ressource' }));
		}
	}
});

Ui.CompactLabel.extend('Wn.ResourceViewerTitle', {
	constructor: function(config) {
		this.setMaxLine(2);
		this.setWidth(100);
	}
});

Ui.VBox.extend('Wn.ResourceViewer', {
	resource: undefined,
	path: undefined,
	user: undefined,
	contact: undefined,
	contactface: undefined,
	contentBox: undefined,
	resourcelabel: undefined,
	isFullscreen: false,
	unfullscreenButton: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,
	propertyButton: undefined,
	fullscreenButton: undefined,
	bookmarkButton: undefined,

	constructor: function(config) {
		this.addEvents('fullscreen', 'unfullscreen');

		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);
		
		if('contact' in config) {
			this.contact = config.contact;
			delete(config.contact);
		}
		if('path' in config) {
			this.path = config.path;
			delete(config.path);
		}

		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.menuBox = new Ui.LBox();
		this.append(this.menuBox);

		this.actionBox = new Ui.MenuToolBar({ margin: 5, spacing: 5 });
		this.menuBox.append(this.actionBox);
		
		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);
		
		this.contactface = new Wn.UserFace({ user: (this.contact !== undefined)?this.contact:this.user });
		this.actionBox.append(this.contactface);
		
		this.resourcelabel = new Wn.ResourceViewerTitle({ text: '', marginLeft: 10, marginRight: 10, textAlign: 'left', verticalAlign: 'center' });
		this.resourcelabel.setText(this.resource.getName());
		this.actionBox.append(this.resourcelabel, true);

		this.propertyButton = new Ui.Button({ icon: 'tools' });
		this.actionBox.append(this.propertyButton);
		this.connect(this.propertyButton, 'press', function() {
			var dialog = new Wn.ResourcePropertiesDialog({ user: this.user, resource: this.resource });
			dialog.open();
		});

//		if(this.resource.canWrite()) {
//			var deleteButton = new Ui.Button({ icon: 'trash' });
//			this.connect(deleteButton, 'press', this.onDeletePress);
//			this.actionButtons.append(deleteButton);
//		}

		this.fullscreenButton = new Ui.Button({ icon: 'fullscreen' });
		this.actionBox.append(this.fullscreenButton);
		this.connect(this.fullscreenButton, 'press', function() {
			this.fullscreen();
		});
		
		if(this.contact != undefined) {
			this.bookmarkButton = new Ui.ToggleButton({ icon: 'star' });
			if(this.resource.getBookmark())
				this.bookmarkButton.toggle();
			this.connect(this.bookmarkButton, 'toggle', this.onBookmarkToggle);
			this.connect(this.bookmarkButton, 'untoggle', this.onBookmarkUntoggle);
			this.actionBox.append(this.bookmarkButton);
		}

		this.contentBox = new Ui.LBox();
		this.append(this.contentBox, true);
		
		// if mark the resource as seen
		this.resource.markSeenByMe();
	},

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {
		return this.selection;
	},

	getIsFullscreen: function() {
		return this.isFullscreen;
	},

	fullscreen: function() {
		if(!this.isFullscreen) {
			this.isFullscreen = true;
			this.remove(this.menuBox);

			this.unfullscreenButton = new Ui.Pressable({ verticalAlign: 'top', horizontalAlign: 'right' });
			this.unfullscreenButton.append(new Ui.Rectangle({ radius: 8, margin: 5, fill: 'white', opacity: 0.4 }));
			this.unfullscreenButton.append(new Ui.Icon({ icon: 'unfullscreen', fill: 'black', width: 48, height: 48, margin: 10, opacity: 0.3 }));
			this.connect(this.unfullscreenButton, 'press', this.unfullscreen);

			this.contentBox.append(this.unfullscreenButton);

			this.fireEvent('fullscreen', this);
		}
	},

	unfullscreen: function() {
		if(this.isFullscreen) {
			this.isFullscreen = false;
			this.contentBox.remove(this.unfullscreenButton);
			this.prepend(this.menuBox);
			this.fireEvent('unfullscreen', this);
		}
	},

	deleteResource: function() {
		this.user.removeResource(this.resource);
		Ui.App.current.setDefaultMain();
	},

	setActionButtons: function(actionButtons) {
		var buttons = [];
		buttons.push(this.contactface);
		buttons.push(this.resourcelabel);
		for(var i = 0; i < actionButtons.length; i++)
			buttons.push(actionButtons[i]);
		buttons.push(this.propertyButton);
		buttons.push(this.fullscreenButton);
		if(this.bookmarkButton !== undefined)
			buttons.push(this.bookmarkButton);
		this.actionBox.setContent(buttons);
	},

	getResource: function() {
		return this.resource;
	},

	getPath: function() {
		return this.path;
	},

	setPath: function(path) {
		if(this.path != path) {
			this.onPathChange(this.path, path);
			this.path = path;
		}
	},

	getUser: function() {
		return this.user;
	},

	onPathChange: function(oldPath, newPath) {
	},

	onResourceChange: function() {
		this.resourcelabel.setText(this.resource.getName());
		this.resource.markSeenByMe();
	},

	onDeletePress: function() {
		if(!this.resource.canWrite())
			return;

		var dialog = new Ui.Dialog({
			preferedWidth: 300,
			preferedHeight: 200,
			fullScrolling: true,
			title: 'Suppression',
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous vraiment supprimer cette ressource pour vous et toutes les personnes avec qui vous la partagée ?' })
		});
		var removeButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
		this.connect(removeButton, 'press', function() {
			dialog.close();
			this.deleteResource();
		});
		dialog.setActionButtons([ removeButton ]);
		dialog.open();
	},

	onBookmarkToggle: function() {
		this.user.bookmarkResource(this.resource);
	},

	onBookmarkUntoggle: function() {
		this.user.unbookmarkResource(this.resource);
	},
	
	onSelectionChange: function(selection) {
		if(selection.getElements().length === 0) {
			this.contextBox.hide();
			this.actionBox.show();
		}
		else {
			this.contextBox.show();
			this.actionBox.hide();
		}
	}

}, {
	setContent: function(content) {
		this.contentBox.setContent(content);
	},
	
	onLoad: function() {
		Wn.ResourceViewer.base.onLoad.call(this);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		Wn.ResourceViewer.base.onUnload.call(this);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
}, {
	apps: undefined,

	constructor: function() {
		this.apps = {};
	},

	register: function(mimetype, app) {
		Wn.ResourceViewer.apps[mimetype] = app;
	},

	getApplication: function(mimetype) {
		return Wn.ResourceViewer.apps[mimetype];
	}
});
