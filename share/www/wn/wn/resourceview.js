
Ui.Selectionable.extend('Wn.ResourceView', {
	user: undefined,
	contact: undefined,
	resource: undefined,
	contactface: undefined,
	title: undefined,
	previewBox: undefined,
	newicon: undefined,
	graphic: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		if('contact' in config) {
			this.contact = config.contact;
			delete(config.contact);
		}
		this.resource = config.resource;
		delete(config.resource);
		
		this.setData(this);
		
		var dropbox = new Ui.DropBox();
		dropbox.addMimetype('Wn.MenuContactIcon');
		this.connect(dropbox, 'drop', this.onUserDrop);
		this.append(dropbox);

		this.graphic = new Wn.ResourceViewGraphic();
		dropbox.append(this.graphic);

		this.newicon = new Wn.NewRibbon({ width: 54, height: 54, verticalAlign: 'top', horizontalAlign: 'right', margin: 2 });
		this.append(this.newicon);

		this.connect(this, 'press', this.onResourcePress);
	},

	getGraphic: function() {
		return this.graphic;
	},

	getResource: function() {
		return this.resource;
	},

	onUserDrop: function(dropbox, mimetype, data) {
		if(this.resource.canShare()) {
			var diff = { user_id: data.getContact().getId(), read: true, share: this.user.getData().default_share_right };
			if(this.resource.canWrite() && this.user.getData().default_write_right)
				diff.write = true;	
			this.resource.addRights(diff);
		}
	},

	onResourceChange: function() {
		if(!this.resource.getIsReady())
			return;
			
		if(this.resource.getOwnerId() != this.user.getId()) {
			if(this.contact == undefined)
				this.contact = Wn.Contact.getContact(this.resource.getOwnerId());
			this.graphic.setUserImage(this.contact.getFaceUrl());
		}
	
		this.graphic.setTitle(this.resource.getName());

		if(this.resource.getSeenByMeRev() != this.resource.getRev())
			this.newicon.show();
		else
			this.newicon.hide();

		this.graphic.setShareCount(this.resource.getRights().length);
		if(this.resource.getPublicRights().read)
			this.graphic.setShareMode('public');
		else
			this.graphic.setShareMode('group');
	},

	onResourcePress: function() {
		Ui.App.current.setMainPath('resource:'+this.resource.getId());
	},
	
	onResourceEdit: function() {
		var dialog = new Wn.ResourcePropertiesDialog({ user: this.user, resource: this.resource });
		dialog.open();
	},
	
	onResourceDelete: function() {
		var dialog = new Wn.ResourceDeleteDialog({ resource: this.resource });
		dialog.open();	
	},
	
	testDeleteRight: function() {
		return (Ui.App.current.getUser().isAdmin() || this.resource.canWrite());
	}
}, {
	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				testRight: this.testDeleteRight,
				scope: this, callback: this.onResourceDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Modifier', icon: 'pen',
				scope: this, callback: this.onResourceEdit, multiple: false
			}
		};
	},

	onLoad: function() {
		Wn.ResourceView.base.onLoad.call(this);

		this.connect(this.resource, 'change', this.onResourceChange);
		this.onResourceChange();
	},
	
	onUnload: function() {
		Wn.ResourceView.base.onUnload.call(this);

		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
}, {
	views: undefined,

	constructor: function() {
		this.views = {};
	},

	register: function(type, view) {
		Wn.ResourceView.views[type] = view;
	},

	getView: function(type) {
		return Wn.ResourceView.views[type];
	}
});

