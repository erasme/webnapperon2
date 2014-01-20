
Ui.LBox.extend('Wn.ContactSharesView', {
	user: undefined,
	contact: undefined,
	shares: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);
		
		// for poor connection networks, check if
		// we miss some updates
		this.contact.update();
	},

	onContactChange: function() {				
		var resources = this.contact.getResources();

		if(resources.length === 0) {
			this.setContent(new Ui.Text({ fontSize: 20, text: 'Ce contact ne partage pas de ressources avec vous', margin: 20, textAlign: 'center', verticalAlign: 'center' }));
			this.shares = undefined;
		}
		else {
			if(this.shares === undefined) {
				this.shares = new Ui.Flow({ uniform: true });
				this.setContent(this.shares);
			}

			// find the diff
			var remove = [];
			var add = [];

			for(var i = 0; i < this.shares.getChildren().length; i++) {
				var child = this.shares.getChildren()[i];
				var found = false;
				for(var i2 = 0; (found === false) && (i2 < resources.length); i2++) {
					found = (child.getResource().getId() === resources[i2].getId());
				}
				if(!found)
					remove.push(child);
			}
			
			for(var i = 0; i < resources.length; i++) {
				var resource = resources[i];
				var found = false;
				for(var i2 = 0; (found === false) && (i2 < this.shares.getChildren().length); i2++) {
					found = (resource.getId() === this.shares.getChildren()[i2].getResource().getId());
				}
				if(!found)
					add.push(resource);
			}

			// remove old
			for(var i = 0; i < remove.length; i++)
				this.shares.remove(remove[i]);

			// add new
			if(add.length > 0) {
				for(var i = 0; i < add.length; i++) {
					if(add[i].getIsReady())
						this.onAddNewResourceReady(add[i]);
					else
						this.connect(add[i], 'ready', this.onAddNewResourceReady);
				}
			}
		}
	},
	
	onAddNewResourceReady: function(resource) {
		var viewConst = Wn.ResourceView.getView(resource.getType());
		if(viewConst === undefined)
			viewConst = Wn.ResourceView;
		var share = new viewConst({ user: this.user, contact: this.contact, resource: resource, margin: 5, width: 210, height: 244 });
		if(this.shares !== undefined)
			this.shares.append(share);
	}
	
}, {
	onLoad: function() {	
		Wn.ContactSharesView.base.onLoad.call(this);

		this.connect(this.contact, 'change', this.onContactChange);
		if(this.contact.getIsReady())
			this.onContactChange();
	},
	
	onUnload: function() {		
		Wn.ContactSharesView.base.onUnload.call(this);
		
		this.disconnect(this.contact, 'change', this.onContactChange);
	}
});

Ui.LBox.extend('Wn.ContactView', {
	user: undefined,
	contact: undefined,
	contactface: undefined,
	contentbox: undefined,
	addRemoveButton: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		var vbox = new Ui.VBox();
		this.setContent(vbox);
		
		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.menuBox = new Ui.LBox();
		vbox.append(this.menuBox);

		this.actionBox = new Ui.MenuToolBar({ margin: 5, spacing: 5 });
		this.menuBox.append(this.actionBox);

		this.contactface = new Wn.UserFace({ user: this.contact });
		this.actionBox.append(this.contactface);

		this.contactlabel = new Wn.UserTitle({ text: '', marginLeft: 10, marginRight: 10, textAlign: 'left', verticalAlign: 'center' });
		if(this.contact.getIsReady())
			this.contactlabel.setText(this.contact.getFirstname()+' '+this.contact.getLastname());
		this.actionBox.append(this.contactlabel, true);

		if(navigator.supportWebRTC) {
			var button = new Ui.Button({ icon: 'phone' });
			this.connect(button, 'press', this.onPhonePress);
			this.actionBox.append(button);
		}

		var button = new Ui.Button({ icon: 'bubble' });
		this.connect(button, 'press', this.onMessagesPress);
		this.actionBox.append(button);
		
		// view the contact profil
		var button = new Ui.Button({ icon: 'person' });
		this.connect(button, 'press', this.onProfilPress);
		this.actionBox.append(button);

		// the context menu
		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
		vbox.append(scroll, true);
		scroll.setContent(new Wn.ContactSharesView({ user: this.user, contact: this.contact }), true);
	},

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {
		return this.selection;
	},
	
	onProfilPress: function() {
		var dialog = new Wn.UserProfil({ user: this.contact });
		dialog.open();
	},

	onPhonePress: function() {
		var dialog = new Wn.VideoConfDialog({ user: this.user, contact: this.contact });
		dialog.open();
	},

	onMessagesPress: function() {
		var dialog = new Wn.ContactMessagesDialog({ user: this.user, contact: this.contact });
		dialog.open();
	},

	onContactChange: function() {
		this.contactlabel.setText(this.contact.getFirstname()+' '+this.contact.getLastname());
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
		Wn.ContactView.base.onLoad.call(this);

		this.connect(this.contact, 'change', this.onContactChange);
		if(this.contact.getIsReady())
			this.onContactChange();
	},
	
	onUnload: function() {
		Wn.ContactView.base.onUnload.call(this);
		
		this.disconnect(this.contact, 'change', this.onContactChange);
	}
});

