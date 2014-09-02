
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

		if(!this.contact.getIsResourcesLoaded()) {
			this.setContent(new Ui.Text({ fontSize: 20, text: 'Chargement en cours...', margin: 20, textAlign: 'center', verticalAlign: 'center' }));
		}
		else if(resources.length === 0) {
			this.setContent(new Ui.Text({ fontSize: 20, text: 'Ce contact ne partage pas de ressources avec vous', margin: 20, textAlign: 'center', verticalAlign: 'center' }));
			this.shares = undefined;
		}
		else {
			if(this.shares === undefined) {
				this.shares = new Ui.SFlow({
					uniform: true, itemAlign: 'stretch',
					margin: 40, spacing: 40
				});
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
		var share = new viewConst({
			user: this.user, contact: this.contact, resource: resource,
			width: 180, height: 220
		});
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
	contentbox: undefined,
	actions: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		this.actions = [];

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		var button = new Ui.Button({ icon: 'bubble', text: 'Message' });
		this.connect(button, 'press', this.onMessagesPress);
		this.actions.push(button);
		
		// view the contact profil
//		var button = new Ui.Button({ icon: 'person', text: 'Profil' });
//		this.connect(button, 'press', this.onProfilPress);
//		this.actions.push(button);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
		vbox.append(scroll, true);
		scroll.setContent(new Wn.ContactSharesView({ user: this.user, contact: this.contact }), true);

		this.user.watchContact(this.contact);
	},

	getTitle: function() {
		return this.contact.getName();
	},

	getActions: function() {
		return this.actions;
	},

	onProfilPress: function() {
		var dialog = new Wn.UserProfil({ user: this.contact });
		dialog.open();
	},

	onMessagesPress: function() {
		var dialog = new Wn.ContactMessagesDialog({ user: this.user, contact: this.contact });
		dialog.open();
	},

	onContactChange: function() {
		this.fireEvent('change', this);
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

