
Ui.Dialog.extend('Wn.ReaderEditDialog', {
	readerUi: undefined,
	reader: undefined,
	user: undefined,
	nameField: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.readerUi = config.readerUi;
		delete(config.readerUi);
		this.reader = this.readerUi.getReader();
	
		this.setTitle('Lecteur RFID');
		this.setPreferedWidth(400);
		this.setPreferedHeight(300);
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
		
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Nom', verticalAlign: 'center', width: 100 }));
		this.nameField = new Ui.TextField({ value: this.reader.name, verticalAlign: 'center' });
		hbox.append(this.nameField, true);
						
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Identifiant', verticalAlign: 'center', width: 100 }));
		hbox.append(new Ui.Text({ text: this.reader.id, verticalAlign: 'center' }), true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'URL', verticalAlign: 'center', width: 100 }));
		
		var readerUrl = (new Core.Uri({ uri: '/cloud/rfid/'+this.reader.id+'/enter' })).toString();
		hbox.append(new Ui.Text({ text: readerUrl, verticalAlign: 'center', selectable: true }), true);
		
		var saveButton = new Ui.Button({ text: 'Enregistrer' });
		this.connect(saveButton, 'press', this.onSavePress);

		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', this.onDeletePress);
		
		this.setActionButtons([ deleteButton, saveButton ]);		
	},
	
	onSavePress: function() {
		this.reader.name = this.nameField.getValue();
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/user/'+this.user.getId()+'/readers/'+this.reader.id,
			content: JSON.stringify({ name: this.nameField.getValue() })
		});
		request.send();
		this.close();
	},
	
	onDeletePress: function() {
		this.readerUi["delete"]();
		this.close();
	}
});

Ui.Dialog.extend('Wn.ReaderNewDialog', {
	textField: undefined,
	user: undefined,
	request: undefined,
	device: undefined,
	nameField: undefined,
	reader: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.device = config.device;
		delete(config.device);
	
		this.addEvents('done');
	
		this.setTitle('Nouveau Lecteur RFID');
		this.setPreferedWidth(400);
		this.setPreferedHeight(300);
		
		this.setContent(new Ui.Text({ textAlign: 'center', text: 'Création en cours...' }));
		
		var closeButton = new Ui.Button({ text: 'Fermer' });
		this.setCancelButton(closeButton);
						
		this.request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/user/'+this.user.getId()+'/readers',
			content: JSON.stringify({ name: 'noname', device: this.device })
		});
		this.connect(this.request, 'done', this.onCreateDone);
		this.connect(this.request, 'error', this.onCreateError);
		this.request.send();
		
		this.connect(this, 'close', this.onDialogClose);
	},
	
	onCreateDone: function(req) {
	
		var reader = req.getResponseJSON();
		this.reader = reader;
	
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Nom', verticalAlign: 'center', width: 100 }));
		this.nameField = new Ui.TextField({ value: reader.name, verticalAlign: 'center' });
		hbox.append(this.nameField, true);
						
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Identifiant', verticalAlign: 'center', width: 100 }));
		hbox.append(new Ui.Text({ text: reader.id, verticalAlign: 'center' }), true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'URL', verticalAlign: 'center', width: 100 }));
		
		var readerUrl = (new Core.Uri({ uri: '/cloud/rfid/'+reader.id+'/enter' })).toString();
		hbox.append(new Ui.Text({ text: readerUrl, verticalAlign: 'center', selectable: true }), true);
		
		var saveButton = new Ui.Button({ text: 'Enregistrer' });
		this.connect(saveButton, 'press', this.onSavePress);

		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', this.onDeletePress);
		
		this.setActionButtons([ deleteButton, saveButton ]);
	},
	
	onCreateError: function() {
		this.setContent(new Ui.Text({ textAlign: 'center', text: 'Echec de la création. Rééssayer plus tard.' }));
	},
	
	onSavePress: function() {
		this.reader.name = this.nameField.getValue();
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/user/'+this.user.getId()+'/readers/'+this.reader.id,
			content: JSON.stringify({ name: this.nameField.getValue() })
		});
		request.send();
		this.close();
	},
	
	onDeletePress: function() {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/user/'+this.user.getId()+'/readers/'+this.reader.id
		});
		request.send();
		this.reader = undefined;
		this.close();
	},
	
	onDialogClose: function() {
		if(this.reader !== undefined)
			this.fireEvent('done', this, this.reader);
	}
});

Ui.Selectionable.extend('Wn.RfidReaderUi', {
	user: undefined,
	reader: undefined,

	constructor: function(config) {
		this.addEvents('delete');
	
		this.user = config.user;
		delete(config.user);

		this.reader = config.reader;
		delete(config.reader);
				
		var vbox = new Ui.VBox();
		this.setContent(vbox);
	
		vbox.append(new Ui.Icon({ icon: 'rfidreader', width: 48, height: 48, fill: '#444444', horizontalAlign: 'center' }));
	
		var label = new Ui.CompactLabel({ width: 80, maxLine: 2, textAlign: 'center', text: this.reader.name });
		vbox.append(label);
	},
	
	getUser: function() {
		return this.user;
	},
	
	getReader: function() {
		return this.reader;
	},
	
	"delete": function() {
		request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/user/'+this.user.getId()+'/readers/'+this.reader.id
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
		return Wn.RfidReaderUi.readerActions;
	}
}, {
	readerActions: undefined,
	
	constructor: function() {
		Wn.RfidReaderUi.readerActions = {
			"delete": {
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				callback: Wn.RfidReaderUi.onReaderDelete, multiple: true
			},
			edit: {
				"default": true,
				text: 'Editer', icon: 'pen',
				callback: Wn.RfidReaderUi.onReaderEdit
			}
		}
	},
	
	onReaderEdit: function(selection) {
		var elements = selection.getElements();
		var dialog = new Wn.ReaderEditDialog({ readerUi: elements[0], user: elements[0].getUser() });
		dialog.open();
	},
	
	onReaderDelete: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++)
			elements[i]["delete"]();
		selection.clear();
	}
});

Wn.OptionSection.extend('Wn.ReaderSection', {
	flow: undefined,
	user: undefined,
	device: null,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.device = config.device;
		delete(config.device);
	
		this.setTitle('Lecteurs RFID');
		
		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);
				
		var pressable = new Ui.Pressable();
		this.connect(pressable, 'press', this.onReaderNewPress);
		this.flow.append(pressable);
		
		pressable.setContent(new Ui.Icon({ icon: 'plus', width: 48, height: 48, fill: '#444444', verticalAlign: 'center', horizontalAlign: 'center' }));
	},
	
	setReaders: function(readers) {
		var remove = [];
		var child;
		for(var i = 0; i < this.flow.getChildren(); i++) {
			child = this.flow.getChildren()[i];
			if(Wn.RfidReaderUi.hasInstance(child))
				remove.push(child);
		}
		for(child in remove)
			this.flow.remove(child);
		for(var i = 0; i < readers.length; i++) {		
			if(readers[i].device === this.device)
				this.appendReader(readers[i]);
		}
	},
	
	appendReader: function(reader) {
		var reader = new Wn.RfidReaderUi({ user: this.user, reader: reader });
		this.connect(reader, 'delete', this.onReaderDelete);
		this.flow.insertAt(reader, this.flow.getChildren().length-1);
	},
	
	getReaders: function() {
		var readers = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var child = this.flow.getChildren()[i];
			if(Wn.RfidReaderUi.hasInstance(child))
				readers.push(child.getReader());
		}
		return readers;
	},
	
	onReaderDelete: function(tag) {
		this.flow.remove(tag);
	},
	
	onReaderNewDone: function(dialog, reader) {
		this.appendReader(reader);
	},
	
	onReaderNewPress: function() {
		var dialog = new Wn.ReaderNewDialog({ user: this.user, device: this.device });
		this.connect(dialog, 'done', this.onReaderNewDone);
		dialog.open();
	}
});