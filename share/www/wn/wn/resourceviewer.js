
Ui.Dialog.extend('Wn.ResourceDeleteDialog', {
	resource: undefined,
	
	constructor: function(config) {
		this.addEvents('done');
	
		this.resource = config.resource;
		delete(config.resource);
		
		this.setPreferredWidth(300);
		this.setPreferredHeight(200);
		this.setFullScrolling(true);
		this.setTitle('Suppression');
		
		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
			this.setContent(new Ui.Text({ text: 'Voulez vous vraiment supprimer cette ressource pour vous et toutes les personnes avec qui vous la partagée ?' }));
		
			var removeButton = new Ui.DefaultButton({ text: 'Supprimer' });
			this.connect(removeButton, 'press', function() {
				this.close();
				this.resource.deleteResource();
				this.fireEvent('done', this, this.resource);
			});
			this.setActionButtons([ removeButton ]);
		}
		else {
			this.setCancelButton(new Ui.DialogCloseButton());
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

Ui.DropBox.extend('Wn.ResourceViewer', {
	resource: undefined,
	path: undefined,
	user: undefined,
	contact: undefined,
	isFullscreen: false,
	propertyButton: undefined,
	actions: undefined,
	actionButtons: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.actions = [];

		if('contact' in config) {
			this.contact = config.contact;
			delete(config.contact);
		}
		if('path' in config) {
			this.path = config.path;
			delete(config.path);
		}

		this.propertyButton = new Ui.Button({ icon: 'resourcetools', text: 'Outils' });
		this.actions.push(this.propertyButton);
		this.connect(this.propertyButton, 'press', function() {
			var dialog = new Wn.ResourcePropertiesDialog({ user: this.user, resource: this.resource });
			dialog.open();
		});

		this.addMimetype(Wn.MenuContact);
		this.connect(this, 'drop', this.onUserDrop);

		// if mark the resource as seen
		this.resource.markSeenByMe();

		this.user.watchResource(this.getResource());
	},

	getTitle: function() {
		return this.resource.getName();
	},

	getActions: function() {
		if((this.actionButtons === undefined) || (this.actionButtons.length === 0))
			return this.actions;
		else {
			var i;
			var buttons = [];
			for(i = 0; i < this.actionButtons.length; i++)
				buttons.push(this.actionButtons[i]);
			for(i = 0; i < this.actions.length; i++)
				buttons.push(this.actions[i]);
			return buttons;
		}
	},
	
	getIsFullscreen: function() {
		return this.isFullscreen;
	},

	fullscreen: function() {
		if(!this.isFullscreen)
			this.isFullscreen = true;
	},

	unfullscreen: function() {
		if(this.isFullscreen)
			this.isFullscreen = false;
	},

	deleteResource: function() {
		this.user.removeResource(this.resource);
		Ui.App.current.setDefaultMain();
	},

	setActionButtons: function(actionButtons) {
		this.actionButtons = actionButtons;
		this.fireEvent('change', this);
	},

	getResource: function() {
		return this.resource;
	},

	getPath: function() {
		return this.path;
	},

	setPath: function(path) {
		if(this.path !== path) {
			this.onPathChange(this.path, path);
			this.path = path;
		}
	},

	getUser: function() {
		return this.user;
	},

	onUserDrop: function(dropbox, mimetype, data) {
		if(this.resource.canShare()) {
			var diff = { user_id: data.getContact().getId(), read: true, share: this.user.getData().default_share_right };
			if(this.resource.canWrite() && this.user.getData().default_write_right)
				diff.write = true;	
			this.resource.addRights(diff);
		}
	},

	onPathChange: function(oldPath, newPath) {
	},

	onResourceChange: function() {
		this.fireEvent('change', this);
		this.resource.markSeenByMe();
	},

	onDeletePress: function() {
		if(!this.resource.canWrite())
			return;

		var dialog = new Ui.Dialog({
			preferredWidth: 300,
			preferredHeight: 200,
			fullScrolling: true,
			title: 'Suppression',
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text:
				'Voulez vous vraiment supprimer cette ressource pour vous'+
				' et toutes les personnes avec qui vous la partagée ?'
			})
		});
		var removeButton = new Wn.AlertButton({ text: 'Supprimer' });
		this.connect(removeButton, 'press', function() {
			dialog.close();
			this.deleteResource();
		});
		dialog.setActionButtons([ removeButton ]);
		dialog.open();
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
	onLoad: function() {
		Wn.ResourceViewer.base.onLoad.call(this);
		this.connect(this.resource, 'change', this.onResourceChange);
	},
	
	onUnload: function() {
		Wn.ResourceViewer.base.onUnload.call(this);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
}, {
	style: {
		background: '#f1f1f1'
	},

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
