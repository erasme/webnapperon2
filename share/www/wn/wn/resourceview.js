
Ui.Button.extend('Wn.ResourceView', {
	user: undefined,
	contact: undefined,
	resource: undefined,
	contactface: undefined,
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

		this.setDraggableData(this);

		this.getDropBox().addMimetype(Wn.MenuContact);
		this.connect(this.getDropBox(), 'drop', this.onUserDrop);

		var lbox = new Ui.LBox();
		this.setIcon(lbox);

		this.graphic = new Wn.ResourceViewGraphic();
		lbox.append(this.graphic);

		this.newicon = new Wn.NewRibbon({ width: 54, height: 54, verticalAlign: 'top', horizontalAlign: 'left', margin: 1 });
		lbox.append(this.newicon);

//		this.connect(this, 'press', this.onPress);
	},

//	getDropBox: function() {
//		return this.dropbox;
//	},

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
			
		if(this.resource.getOwnerId() !== this.user.getId()) {
			if(this.contact === undefined)
				this.contact = Wn.Contact.getContact(this.resource.getOwnerId());
			this.graphic.setUserImage(this.contact.getFaceUrl());
		}
		else
			this.graphic.setUserImage(this.user.getFaceUrl()); 
		
		this.graphic.setTitle(this.resource.getName().toUpperCase());

		if(this.resource.getSeenByMeRev() !== this.resource.getRev())
			this.newicon.show();
		else
			this.newicon.hide();

		this.graphic.setShareCount(this.resource.getRights().length);
		if(this.resource.getPublicRights().read)
			this.graphic.setShareMode('public');
		else
			this.graphic.setShareMode('group');
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
	},

	onBookmark: function() {
		this.resource.bookmark();
	},

	onUnbookmark: function() {
		this.resource.unbookmark();
	},

	testBookmarkRight: function() {
		return !this.resource.getBookmark() && (this.resource.getOwnerId() !== this.user.getId());
	},

	testUnbookmarkRight: function() {
		return this.resource.getBookmark() && (this.resource.getOwnerId() !== this.user.getId());
	}
}, {
	onPress: function() {
		Ui.App.current.setMainPath('resource:'+this.resource.getId());
	},

	updateColors: function() {
		Wn.ResourceView.base.updateColors.apply(this, arguments);
		this.graphic.setColor(this.getColor());
		this.graphic.setForeground(this.getForeground());
		this.graphic.setBackground(this.getBackground());
	},

	getSelectionActions: function() {
		return {
			"bookmark": { 
				text: 'Mettre en favoris', icon: 'star',
				testRight: this.testBookmarkRight,
				scope: this, callback: this.onBookmark, multiple: false
			},
			"unbookmark": { 
				text: 'Enlever des favoris', icon: 'star',
				testRight: this.testUnbookmarkRight,
				scope: this, callback: this.onUnbookmark, multiple: false
			},
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
	},

	onStyleChange: function() {
		Wn.ResourceView.base.onStyleChange.apply(this, arguments);
		this.graphic.setMargin(this.getStyleProperty('borderWidth'));
	},

	getColor: function() {
		var color = Ui.Color.create(this.getStyleProperty('color'));
		var yuv = color.getYuva();
		var deltaY = 0;
		if(this.getIsDown())
			deltaY = -0.20;
		else if(this.getIsOver()) {
			deltaY = 0.20;
			yuv.a = Math.max(0.4, yuv.a);
		}
		return new Ui.Color({ y: yuv.y + deltaY, u: yuv.u, v: yuv.v, a: yuv.a });
	}
}, {
	style: {
		color: '#a1a1a1'
	},
	
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

