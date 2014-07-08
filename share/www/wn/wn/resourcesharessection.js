
Ui.Dialog.extend('Wn.ResourceSharesModifyDialog', {
	flow: undefined,
	selection: undefined,
	modifyButton: undefined,
	shareField: undefined,
	writeField: undefined,

	constructor: function(config) {
		this.selection = config.selection;
		delete(config.selection);

		this.setPreferredWidth(400);
		this.setPreferredHeight(400);
		this.setFullScrolling(true);
		this.setTitle('Modification des droits');
		this.setCancelButton(new Ui.DialogCloseButton());

		this.modifyButton = new Ui.DefaultButton({ text: 'Appliquer' });
		this.connect(this.modifyButton, 'press', this.onModifyPress);

		this.setActionButtons([ this.modifyButton ]);

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		var hbox = new Ui.HBox({ uniform: true });
		vbox.append(hbox);

		this.writeField = new Ui.CheckBox({ text: 'Ecriture' });
		if(this.selection[0].getResource().canWrite())
			hbox.append(this.writeField);

		this.shareField = new Ui.CheckBox({ text: 'Partage' });
		hbox.append(this.shareField);

//		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
//		vbox.append(scroll, true);

		this.flow = new Ui.Flow({ uniform: true, margin: 20 });
//		scroll.setContent(this.flow);
		vbox.append(this.flow);

		var shareRight = true;
		var writeRight = true;
		for(var i = 0; i < this.selection.length; i++) {
			var item = this.selection[i];		
			var right = item.getRight();
			var resource = item.getResource();
			var user = item.getUser();
			shareRight &= right.share;
			writeRight &= right.write;
			var icon;
			if(right.user_id == -1)
				icon = new Wn.ResourceWorldRight({ resource: resource, user: user, right: right, margin: 5 });
			else
				icon = new Wn.ResourceContactRight({ resource: resource, user: user, right: right, margin: 5 });
			icon.disable();
			this.flow.append(icon);
		}
		this.writeField.setValue(writeRight);
		this.shareField.setValue(shareRight);
	},

	onModifyPress: function() {
		for(var i = 0; i < this.selection.length; i++) {		
			var item = this.selection[i];
			var right = Core.Util.clone(item.getRight());
			right.share = this.shareField.getValue();
			var resource = item.getResource();
			if(resource.canWrite())
				right.write = this.writeField.getValue();
			if(right.user_id == -1)
				resource.addPublicRights(right);
			else
				resource.addRights(right);
		}
		this.close();
	}
});

Wn.SelectionButton.extend('Wn.ResourceRight', {
}, {
	getSelectionActions: function() {
		return Wn.ResourceRight.rightActions;
	}
}, {
	rightActions: undefined,
	
	constructor: function() {
		Wn.ResourceRight.rightActions = {
			"delete": {
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				callback: Wn.ResourceRight.onRightDelete, multiple: true
			},
			edit: {
				"default": true,
				text: 'Editer', icon: 'pen',
				callback: Wn.ResourceRight.onRightEdit, multiple: true
			}
		}
	},
	
	onRightEdit: function(selection) {
		var elements = selection.getElements();
		var dialog = new Wn.ResourceSharesModifyDialog({ selection: elements });
		dialog.open();
	},
	
	onRightDelete: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++)
			elements[i].deleteRight();
		selection.clear();
	}
});

Wn.ResourceRight.extend('Wn.ResourceContactRight', {
	user: undefined,
	right: undefined,
	contact: undefined,
	resource: undefined,
	image: undefined,
	label: undefined,
	shareRight: undefined,
	writeRight: undefined,

	constructor: function(config) {	
		this.resource = config.resource;
		delete(config.resource);
		this.user = config.user;
		delete(config.user);
		this.right = config.right;
		delete(config.right);

		var lbox = new Ui.LBox({ horizontalAlign: 'center', verticalAlign: 'bottom' });
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1' }));

		this.image = new Ui.Image({ width: 46, height: 46 });
		lbox.append(this.image);

		var hbox = new Ui.HBox({ uniform: true, verticalAlign: 'bottom', horizontalAlign: 'right', margin: 3 });
		this.shareRight = new Ui.DualIcon({ icon: 'share', fill: '#f1f1f1', width: 20, height: 20 });
		hbox.append(this.shareRight);
		this.writeRight = new Ui.DualIcon({ icon: 'pen', fill: '#f1f1f1', width: 20, height: 20 });
		hbox.append(this.writeRight);
		lbox.append(hbox);

		this.setIcon(lbox);

		this.contact = Wn.Contact.getContact(this.right.user_id);
	},

	getUser: function() {
		return this.user;
	},

	getRight: function() {
		return this.right;
	},

	getResource: function() {
		return this.resource;
	},

	deleteRight: function() {
		this.resource.addRights({ user_id: this.right.user_id, read: false, write: false, share: false });
	},
		
	changeRight: function(right) {
		this.resource.addRights({ user_id: this.right.user_id,  read: right.read, write: right.write, share: right.share });
	},

	onResourceChange: function() {
		var rights = {};
		for(var i = 0; i < this.resource.getRights().length; i++) {
			if(this.resource.getRights()[i].user_id == this.right.user_id)
				rights = this.resource.getRights()[i];
		}
		if(rights.share)
			this.shareRight.show();
		else
			this.shareRight.hide();
		if(rights.write)
			this.writeRight.show();
		else
			this.writeRight.hide();
	},

	onContactChange: function() {
		this.setText(this.contact.getName());
		this.image.setSrc(this.contact.getFaceUrl());
	}
}, {
	onLoad: function() {
		Wn.ResourceContactRight.base.onLoad.call(this);
	
		this.connect(this.contact, 'change', this.onContactChange);
		if(this.contact.getIsReady())
			this.onContactChange();
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		Wn.ResourceContactRight.base.onUnload.call(this);

		this.disconnect(this.contact, 'change', this.onContactChange);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

Wn.ResourceRight.extend('Wn.ResourceWorldRight', {
	user: undefined,
	right: undefined,
	resource: undefined,
	image: undefined,
	label: undefined,
	shareRight: undefined,
	writeRight: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.user = config.user;
		delete(config.user);
		this.right = config.right;
		this.right.user_id = -1;
		delete(config.right);

		this.setIcon('earth');

		var hbox = new Ui.HBox({ uniform: true, verticalAlign: 'bottom', horizontalAlign: 'right', margin: 3 });
		this.shareRight = new Ui.DualIcon({ icon: 'share', fill: '#f1f1f1', width: 20, height: 20 });
		hbox.append(this.shareRight);
		this.writeRight = new Ui.DualIcon({ icon: 'pen', fill: '#f1f1f1', width: 20, height: 20 });
		hbox.append(this.writeRight);
		this.getIconBox().append(hbox);

		this.setText('Tout le monde');
	},

	getUser: function() {
		return this.user;
	},

	getRight: function() {
		return this.right;
	},

	getResource: function() {
		return this.resource;
	},

	deleteRight: function() {
		this.resource.addPublicRights({ read: false, write: false, share: false });
	},

	changeRight: function(right) {
		this.resource.addPublicRights({ read: right.read, write: right.write, share: right.share });
	},

	onResourceChange: function() {
		var rights = this.resource.getPublicRights();
		if(rights.share)
			this.shareRight.show();
		else
			this.shareRight.hide();
		if(rights.write)
			this.writeRight.show();
		else
			this.writeRight.hide();
	}
}, {
	onLoad: function() {
		Wn.ResourceWorldRight.base.onLoad.call(this);
	
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		Wn.ResourceWorldRight.base.onUnload.call(this);

		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

Wn.ListAddButton.extend('Wn.ResourceContactAdd', {
	user: undefined,
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		this.user = config.user;
		delete(config.user);
		this.connect(this, 'press', this.onAddPress);
	},

	onAddPress: function() {
		var dialog = new Wn.AddContactRightDialog({ user: this.user, resource: this.resource });
		dialog.open();
	}
});

Wn.OptionSection.extend('Wn.ResourceSharesSection', {
	user: undefined,
	resource: undefined,
	flow: undefined,
	deleteButton: undefined,
	modifyButton: undefined,
	selection: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.setTitle('Partages');

		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);
	},

	onModifyPress: function() {
		var rights = [];
		for(var i = 0; i < this.selection.length; i++)
			rights.push(this.selection[i].getRight());
		var dialog = new Wn.ResourceSharesModifyDialog({ user: this.user, resource: this.resource, selection: rights });
		dialog.open();
	},

	deleteSelected: function() {
		for(var i = 0; i < this.selection.length; i++) {
			var child = this.selection[i];
			child.deleteRight();
			this.flow.remove(child);
		}
	},

	onResourceChange: function() {
		while(this.flow.getFirstChild() !== undefined)
			this.flow.remove(this.flow.getFirstChild());

		// public rights
		if(this.resource.getPublicRights().read) {
			var icon = new Wn.ResourceWorldRight({ resource: this.resource, user: this.user, right: this.resource.getPublicRights() });
			if(!this.resource.canShare())
				icon.disable();
			this.flow.append(icon);
		}

		// contact rights
		for(var i = 0; i < this.resource.getRights().length; i++) {
			var right = this.resource.getRights()[i];
			var icon = new Wn.ResourceContactRight({ resource: this.resource, user: this.user, right: right });
			if(!this.resource.canShare())
				icon.disable();
			this.flow.append(icon);
		}
		if(this.resource.canShare()) {
			var addIcon = new Wn.ResourceContactAdd({
				resource: this.resource, user: this.user,
				verticalAlign: 'center', horizontalAlign: 'center'
			});
			this.flow.append(addIcon);
		}
	},

	onDrop: function(dropbox, mimetype, data) {
		this.resource.addRights({ user_id: data, read: true, write: true, share: true });
	}
}, {
	onLoad: function() {
		Wn.ResourceSharesSection.base.onLoad.call(this);
		this.connect(this.resource, 'change', this.onResourceChange);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		Wn.ResourceSharesSection.base.onUnload.call(this);
		this.disconnect(this.resource, 'change', this.onResourceChange);
	}
});

