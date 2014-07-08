
Ui.Dialog.extend('Wn.RfidEditDialog', {
	rfidTags: undefined,

	constructor: function(config) {
		this.rfidTags = config.rfidTags;
		delete(config.rfidTags);
	
		this.setTitle('Tags RFID');
		this.setPreferredWidth(300);
		this.setCancelButton(new Ui.DialogCloseButton());
		
		var vbox = new Ui.VBox({ spacing: 10, margin: 10, verticalAlign: 'center' });
		this.setContent(vbox);
		
		for(var i = 0; i < this.rfidTags.length; i++) {
			var rfidTag = this.rfidTags[i];
			vbox.append(new Ui.Label({ text: rfidTag.getRfid(), horizontalAlign: 'center' }));
		}
		
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', function() {
			this.close();
			for(var i = 0; i < this.rfidTags.length; i++) {
				var rfidTag = this.rfidTags[i];
				rfidTag["delete"]();
			}
		});
		this.setActionButtons([ deleteButton ]);
	}
});

Ui.Dialog.extend('Wn.RfidNewDialog', {
	textField: undefined,
	user: undefined,
	path: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.path = config.path;
		delete(config.path);
	
		this.addEvents('done');
	
		this.setTitle('Nouveau Tag RFID');
		this.setPreferredWidth(300);
		this.setPreferredHeight(200);

		var hbox = new Ui.HBox({ spacing: 10, verticalAlign: 'center' });
		this.setContent(hbox);
		
		hbox.append(new Ui.Label({ text: 'RFID', verticalAlign: 'center' }));
		
		this.textField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(this.textField, true);

		hbox.append(new Ui.Icon({ icon: 'rfidreader', verticalAlign: 'center', width: 30, height: 30 }));

		this.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		
		var saveButton = new Ui.DefaultButton({ text: 'Enregistrer' });
		this.connect(saveButton, 'press', this.onSavePress);
		this.setActionButtons([ saveButton ]);
		
		this.connect(this, 'close', this.onClose);
		
		this.connect(Ui.App.current.getRfidReader(), 'enter', this.onRfid, true);
	},
	
	onSavePress: function() {
		var request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/user/'+this.user.getId()+'/rfids',
			content: JSON.stringify({ rfid: this.textField.getValue(), path: this.path })
		});
		request.send();
		this.close();
		this.fireEvent('done', this, this.textField.getValue());
	},
	
	onClose: function() {
		this.disconnect(Ui.App.current.getRfidReader(), 'enter', this.onRfid, true);
	},
	
	onRfid: function(reader, rfid) {	
		this.textField.setValue(rfid);
		// stop rfid propagation
		return true;
	}
});

Wn.SelectionButton.extend('Wn.RfidTag', {
	user: undefined,
	rfid: undefined,

	constructor: function(config) {
		this.addEvents('delete');

		this.user = config.user;
		delete(config.user);

		this.rfid = config.rfid;
		delete(config.rfid);
	
		this.setIcon('rfidtag');
		this.setText(this.rfid);
	},
	
	getRfid: function() {
		return this.rfid;
	},
	
	"delete": function() {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/user/'+this.user.getId()+'/rfids/'+this.rfid
		});
		request.send();
		this.fireEvent('delete', this);
	}
}, {
	// ex:
	// {
	//   delete: { text: 'Delete', icon: 'trash', scope: this, callback: this.onDelete, multiple: true },
	//   edit: ...
	// }
	getSelectionActions: function() {
		return Wn.RfidTag.rfidActions;
	}
}, {
	rfidActions: undefined,
	
	constructor: function() {
		Wn.RfidTag.rfidActions = {
			"delete": {
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				callback: Wn.RfidTag.onTagDelete, multiple: true
			},
			edit: {
				"default": true, hidden: true,
				text: 'Editer', icon: 'pen',
				callback: Wn.RfidTag.onTagEdit, multiple: true
			}
		}
	},
	
	onTagEdit: function(selection) {
		var elements = selection.getElements();
		var dialog = new Wn.RfidEditDialog({ rfidTags: elements });
		dialog.open();
	},
	
	onTagDelete: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++)
			elements[i]["delete"]();
		selection.clear();
	}
});

Wn.OptionSection.extend('Wn.RfidSection', {
	flow: undefined,
	user: undefined,
	path: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.path = config.path;
		delete(config.path);
	
		this.setTitle('Association RFID');
		
		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);

		var button = new Wn.ListAddButton({ verticalAlign: 'center', horizontalAlign: 'center' });
		this.connect(button, 'press', this.onTagNewPress);
		this.flow.append(button);
	},
	
	setTags: function(tags) {
		var remove = [];
		var child;
		for(var i = 0; i < this.flow.getChildren(); i++) {
			child = this.flow.getChildren()[i];
			if(Wn.RfidTag.hasInstance(child))
				remove.push(child);
		}
		for(child in remove)
			this.flow.remove(child);
		for(var i = 0; i < tags.length; i++)
			this.appendTag(tags[i]);
	},
	
	appendTag: function(rfid) {
		var tag = new Wn.RfidTag({ user: this.user, rfid: rfid });
		this.connect(tag, 'delete', this.onTagDelete);
		this.flow.insertAt(tag, this.flow.getChildren().length-1);
	},
	
	getTags: function() {
		var tags = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var child = this.flow.getChildren()[i];
			if(Wn.RfidTag.hasInstance(child))
				tags.push(child.getRfid());
		}
		return tags;
	},
	
	onTagDelete: function(tag) {
		this.flow.remove(tag);
	},
	
	onTagNewDone: function(dialog, rfid) {
		this.appendTag(rfid);
	},
	
	onTagNewPress: function() {
		var dialog = new Wn.RfidNewDialog({ user: this.user, path: this.path });
		this.connect(dialog, 'done', this.onTagNewDone);
		dialog.open();
	}
});