
Wn.SelectionButton.extend('Wn.AddContactIcon', {
	user: undefined,
	contact: undefined,
	dialog: undefined,
	image: undefined,
	label: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);
		this.dialog = config.dialog;
		delete(config.dialog);

		var lbox = new Ui.LBox({ horizontalAlign: 'center' });
		this.setIcon(lbox);

		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1' }));

		this.image = new Ui.Image({ width: 64, height: 64, src: this.contact.getFaceUrl() });
		lbox.append(this.image);
	},

	getContact: function() {
		return this.contact;
	},

	onContactChange: function() {
		this.setText(this.contact.getName());
	}	
}, {
	onStyleChange: function() {
		Wn.AddContactIcon.base.onStyleChange.apply(this, arguments);
		var iconSize = this.getStyleProperty('iconSize');
		this.image.setWidth(iconSize);
		this.image.setHeight(iconSize);
	},

	getSelectionActions: function() {
		return Wn.AddContactIcon.contactActions;
	},

	onLoad: function() {
		Wn.AddContactIcon.base.onLoad.call(this);

		this.connect(this.contact, 'change', this.onContactChange);
		if(this.contact.getIsReady())
			this.onContactChange();
	},
	
	onUnload: function() {
		Wn.AddContactIcon.base.onUnload.call(this);
		
		this.disconnect(this.contact, 'change', this.onContactChange);
	}
}, {
	contactActions: undefined,

	constructor: function() {
		Wn.AddContactIcon.contactActions = {
			profil: {
				text: 'Profil', icon: 'person', testRight: Wn.AddContactIcon.testIsAdmin,
				callback: Wn.AddContactIcon.onContactProfil, multiple: false
			},
			view: {
				"default": true,
				text: 'Voir', icon: 'eye',
				callback: Wn.AddContactIcon.onContactView, multiple: false
			},
			add: {
				text: 'Ajouter', icon: 'plus', testRight: Wn.AddContactIcon.testAddContactRight,
				callback: Wn.AddContactIcon.onContactAdd, multiple: true
			}
		}
	},

	testAddContactRight: function() {	
		return (
			// dont allow to add ourself
			(Ui.App.current.getUser().getId() !== this.contact.getId()) &&
			// dont allow to add a contact already present
			(Ui.App.current.getUser().getContact(this.contact.getId()) === undefined));
	},

	testIsAdmin: function() {
		return Ui.App.current.getUser().isAdmin();
	},

	onContactAdd: function(selection) {
		var contacts = [];
		var icons = [];
		for(var i = 0; i < selection.getElements().length; i++) {
			var icon = selection.getElements()[i];
			contacts.push(icon.getContact());
		}
		Ui.App.current.getUser().prependContacts(contacts);
		if(selection.getElements()[0].dialog !== undefined)
			selection.getElements()[0].dialog.close();
	},

	onContactView: function(selection) {
		Ui.App.current.setMainPath('user:'+selection.getElements()[0].getContact().getId());
		selection.getElements()[0].dialog.close();
	},

	onContactProfil: function(selection) {
		var dialog = new Wn.UserProfil({ user: selection.getElements()[0].getContact() });
		dialog.open();
		selection.getElements()[0].dialog.close();
	}
});


Wn.AddContactIcon.extend('Wn.AddContactRightIcon', {
	constructor: function() {
	}
}, {
	getSelectionActions: function() {
		return Wn.AddContactRightIcon.contactActions;
	}
}, {
	contactActions: undefined,

	constructor: function() {
		Wn.AddContactRightIcon.contactActions = {
			add: {
				text: 'Ajouter', icon: 'plus',
				callback: Wn.AddContactRightIcon.onContactRightAdd, multiple: true
			}
		}
	},

	onContactRightAdd: function(selection) {
		for(var i = 0; i < selection.getElements().length; i++) {
			var item = selection.getElements()[i];
			var rights = item.dialog.getRights();
			var resource = item.dialog.getResource();
			rights.user_id = item.getContact().getId();
			resource.addRights(rights);
		}
		selection.getElements()[0].dialog.close();
	}
});

