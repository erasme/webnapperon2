
Ui.Dialog.extend('Storage.FilePropertiesDialog', {
	resource: undefined,
	file: undefined,
	storage: undefined,
	deleteButton: undefined,
	modifyButton: undefined,
	nameField: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
	
		this.file = config.file;
		delete(config.file);
				
		this.storage = config.storage;
		delete(config.storage);
	
		this.setPreferedWidth(500);
		this.setPreferedHeight(500);
		this.setFullScrolling(true);

		this.setTitle('Propriétés du fichier');
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));

		var mainVbox = new Ui.VBox({});
		this.setContent(mainVbox);

		var vbox = new Ui.VBox({ uniform: true});
		mainVbox.append(vbox);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);		
		hbox.append(new Ui.Text({ text: 'Nom', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.nameField = new Ui.TextField({ value: this.file.name, verticalAlign: 'center' });
		hbox.append(this.nameField, true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Type', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		hbox.append(new Ui.Text({ text: this.file.mimetype, verticalAlign: 'center' }), true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Taille', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		hbox.append(new Ui.Text({ text: this.formatSize(this.file.size), verticalAlign: 'center' }), true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Création', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		hbox.append(new Ui.Text({ text: this.formatDate(new Date(this.file.ctime*1000)), verticalAlign: 'center' }), true);

		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		hbox.append(new Ui.Text({ text: 'Modification', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		hbox.append(new Ui.Text({ text: this.formatDate(new Date(this.file.mtime*1000)), verticalAlign: 'center' }), true);

		var user = Ui.App.current.getUser();
		var path = 'resource:'+this.resource.getId()+':'+this.file.id;
		var tags = user.getRfidsFromPath(path);
		var rfidSection = new Wn.RfidSection({ user: user, tags: tags, path: path });
		mainVbox.append(rfidSection);

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.deleteButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(this.deleteButton, 'press', this.onDeletePress);

			this.saveButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);

			this.setActionButtons([ this.deleteButton, this.saveButton ]);
		}
		else {
			this.nameField.disable();
		}
	},
	
	formatSize: function(size) {
		var res;
		if(size > 1000000000)
			res = (size/1000000000).toFixed(2)+' Go';
		else if(size > 1000000)
			res = (size/1000000).toFixed(2)+' Mo';
		else if(size > 1000)
			res = (size/1000).toFixed(2)+' ko';
		else
			res = size+' octets';
		return res;
	},
	
	formatDate: function(date) {
		var res = '';
		if(date.getDate() < 10)
			res += '0'+date.getDate();
		else
			res += date.getDate();
		res += '/';
		if((date.getMonth()+1) < 10)
			res += '0'+(date.getMonth()+1);
		else
			res += (date.getMonth()+1);
		res += '/'+date.getFullYear()+' ';
		if(date.getHours() < 10)
			res += '0'+date.getHours();
		else
			res += date.getHours();
		res += ':';
		if(date.getMinutes() < 10)
			res += '0'+date.getMinutes();
		else
			res += date.getMinutes();
		res += ':';
		if(date.getSeconds() < 10)
			res += '0'+date.getSeconds();
		else
			res += date.getSeconds();
		return res;
	},

	onSavePress: function() {
		var request = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/storage/'+this.storage+'/'+this.file.id,
			content: JSON.stringify({ name: this.nameField.getValue() })
		 });
		request.send();
		this.close();
	},

	onDeletePress: function() {
		var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id });
		request.send();
		this.close();
	}
});

