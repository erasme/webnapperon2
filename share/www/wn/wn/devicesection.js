
Ui.Dialog.extend('Wn.DeviceEditDialog', {
	device: undefined,
	nameField: undefined,

	constructor: function(config) {
		this.device = config.device;
		delete(config.device);
	
		this.setPreferedWidth(500);
		this.setPreferedHeight(400);
		this.setFullScrolling(true);
	
		this.setTitle('Client de consultation');
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
		
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		this.connect(deleteButton, 'press', this.onDeletePress);
		
		var saveButton = new Ui.Button({ text: 'Enregistrer' });
		this.connect(saveButton, 'press', this.onSavePress);
		
		this.setActionButtons([ deleteButton, saveButton ]);
		
		var vbox = new Ui.VBox({ spacing: 10, margin: 10 });
		this.setContent(vbox);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Identifiant', verticalAlign: 'center', width: 100, textAlign: 'right' }));
		hbox.append(new Ui.Text({ text: this.device.getDevice().id, verticalAlign: 'center' }), true);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Nom', verticalAlign: 'center', width: 100, textAlign: 'right' }));
		this.nameField = new Ui.TextField({ value: this.device.getDevice().name, verticalAlign: 'center' });
		hbox.append(this.nameField, true);
		
		var readerSection = new Wn.ReaderSection({ user: this.device.getUser(), device: this.device.getDevice().id, readers: this.device.getUser().getData().readers, title: 'Lecteurs RFID liés à cette interface' });
		vbox.append(readerSection);
	},
	
	onDeletePress: function() {
		this.device["delete"]();
		this.close();
	},
	
	onSavePress: function() {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/user/'+this.device.getUser().getId()+'/devices/'+this.device.getDevice().id,
			content: JSON.stringify({ name: this.nameField.getValue() })
		});
		request.send();
		this.close();
	}
});

Ui.Dialog.extend('Wn.DeviceNewDialog', {
	textField: undefined,
	user: undefined,
	request: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.addEvents('done');
	
		this.setTitle('Nouveau client de consultation');
		this.setPreferedWidth(400);
		this.setPreferedHeight(300);
		
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);
		
		vbox.append(new Ui.Text({ text: 'Enregister le navigateur actuel comme un nouveau client de consultation.' }));

		var hbox = new Ui.HBox({ spacing: 10 });
		hbox.append(new Ui.Text({ text: 'Nom d\'usage', width: 100, verticalAlign: 'center' }));
		this.textField = new Ui.TextField({ verticalAlign: 'center' });
		hbox.append(this.textField, true);
		vbox.append(hbox);
				
		var closeButton = new Ui.Button({ text: 'Fermer' });
		this.setCancelButton(closeButton);
		
		var createButton = new Ui.Button({ text: 'Créer' });
		this.connect(createButton, 'press', this.onCreatePress);
		this.setActionButtons([ createButton ]);		
	},
	
	onCreatePress: function() {
		this.request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/user/'+this.user.getId()+'/devices',
			content: JSON.stringify({ name: this.textField.getValue() })
		});
		this.connect(this.request, 'done', this.onCreateDone);
		this.connect(this.request, 'error', this.onCreateError);
		this.request.send();
	},
	
	onCreateDone: function(req) {
		this.close();
		var device = req.getResponseJSON();
		Ui.App.current.setDeviceId(device.id);
		this.fireEvent('done', this, device);
	},
	
	onCreateError: function() {
		this.close();
	}
});

Ui.Selectionable.extend('Wn.Device', {
	user: undefined,
	device: undefined,

	constructor: function(config) {
		this.addEvents('delete');
	
		this.user = config.user;
		delete(config.user);

		this.device = config.device;
		delete(config.device);
		
		var vbox = new Ui.VBox();
		this.setContent(vbox);
	
		var icon = new Ui.Icon({ icon: 'screen', width: 48, height: 48, fill: '#444444', horizontalAlign: 'center' });
		vbox.append(icon);
				
		var label = new Ui.CompactLabel({ width: 80, maxLine: 2, textAlign: 'center', text: this.device.name });
		vbox.append(label);
		
		if('localStorage' in window) {
			if((localStorage.getItem('deviceId') !== undefined) && (localStorage.getItem('deviceId') == this.device.id)) {
				icon.setFill('#3434e4');
				label.setColor('#3434e4');
			}
		}

	},
	
	getUser: function() {
		return this.user;
	},
	
	getDevice: function() {
		return this.device;
	},
	
	"delete": function() {
		request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/user/'+this.user.getId()+'/devices/'+this.device.id
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
		return Wn.Device.deviceActions;
	}
}, {
	deviceActions: undefined,
	
	constructor: function() {
		Wn.Device.deviceActions = {
			"delete": {
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				callback: Wn.Device.onDeviceDelete, multiple: true
			},
			edit: {
				"default": true,
				text: 'Editer', icon: 'pen',
				callback: Wn.Device.onDeviceEdit
			}
		}
	},
	
	onDeviceEdit: function(selection) {
		var elements = selection.getElements();
		var dialog = new Wn.DeviceEditDialog({ device: elements[0] });
		dialog.open();
	},
	
	onDeviceDelete: function(selection) {
		var elements = selection.getElements();
		for(var i = 0; i < elements.length; i++)
			elements[i]["delete"]();
		selection.clear();
	}
});

Wn.OptionSection.extend('Wn.DeviceSection', {
	flow: undefined,
	user: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.setTitle('Interfaces de consultation');
		
		this.flow = new Ui.Flow({ uniform: true });
		this.setContent(this.flow);
				
		var pressable = new Ui.Pressable();
		this.connect(pressable, 'press', this.onNewPress);
		this.flow.append(pressable);
		
		pressable.setContent(new Ui.Icon({ icon: 'plus', width: 48, height: 48, fill: '#444444', verticalAlign: 'center', horizontalAlign: 'center' }));
	},
	
	setDevices: function(devices) {
		var remove = [];
		var child;
		for(var i = 0; i < this.flow.getChildren(); i++) {
			child = this.flow.getChildren()[i];
			if(Wn.Device.hasInstance(child))
				remove.push(child);
		}
		for(child in remove)
			this.flow.remove(child);
		for(var i = 0; i < devices.length; i++)
			this.appendDevice(devices[i]);
	},
	
	appendDevice: function(device) {
		var device = new Wn.Device({ user: this.user, device: device });
		this.connect(device, 'delete', this.onDeviceDelete);
		this.flow.insertAt(device, this.flow.getChildren().length-1);
	},
	
	getDevices: function() {
		var devices = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var child = this.flow.getChildren()[i];
			if(Wn.Device.hasInstance(child))
				devices.push(child.getDevice());
		}
		return devices;
	},
	
	onDeviceDelete: function(tag) {
		this.flow.remove(tag);
	},
	
	onDeviceNewDone: function(dialog, device) {
		this.appendDevice(device);
	},
	
	onNewPress: function() {
		var dialog = new Wn.DeviceNewDialog({ user: this.user });
		this.connect(dialog, 'done', this.onDeviceNewDone);
		dialog.open();
	}
});