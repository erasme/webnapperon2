
Ui.Selectionable.extend('Wn.AddContactIcon', {
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

		var vbox = new Ui.VBox({ margin: 5 });
		this.append(vbox);

		this.selectableBox = new Ui.LBox({ horizontalAlign: 'center' });
		vbox.append(this.selectableBox);

		this.selectableBox.append(new Ui.Rectangle({ fill: '#999999' }));
		this.selectableBox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.image = new Ui.Image({ width: 64, height: 64, margin: 1, src: this.contact.getFaceUrl() });
		this.selectableBox.append(this.image);

		this.label = new Ui.CompactLabel({ text: '', fontSize: 14, margin: 3, width: 90, maxLine: 2, textAlign: 'center', color: '#67696c', horizontalAlign: 'center' });
		vbox.append(this.label);
	},

	getContact: function() {
		return this.contact;
	},

	onContactChange: function() {
		this.label.setText(this.contact.getFirstname()+' '+this.contact.getLastname());
	}	
}, {
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
	}
});


Wn.AddContactIcon.extend('Wn.AddContactRightIcon', {
	constructor: function() {
		this.image.setWidth(46);
		this.image.setHeight(46);
		this.label.setWidth(80);
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

