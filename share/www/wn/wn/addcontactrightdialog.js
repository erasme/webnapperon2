
Ui.Dialog.extend('Wn.AddContactRightDialog', {
	user: undefined,
	resource: undefined,
	flow: undefined,
	mainVbox: undefined,
	searchField: undefined,
	searchRequest: undefined,
	shareField: undefined,
	writeField: undefined,

	constructor: function(config) {
		this.addEvents('add');

		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.setFullScrolling(true);
		this.setPreferredWidth(400);
		this.setPreferredHeight(400);
		this.setTitle('Ajouter des partages');

		this.setCancelButton(new Ui.DialogCloseButton());

		this.mainVbox = new Ui.VBox();
		this.setContent(this.mainVbox);

		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.mainVbox.append(this.searchField);

		this.connect(this.searchField, 'validate', this.onSearchValidate);

		var hbox = new Ui.HBox({ uniform: true });
		this.mainVbox.append(hbox);

		this.writeField = new Ui.CheckBox({ text: 'Ecriture' });
		if(this.resource.canWrite()) {
			hbox.append(this.writeField);
			this.writeField.setValue(this.user.getData().default_write_right);
		}

		this.shareField = new Ui.CheckBox({ text: 'Partage' });
		this.shareField.setValue(this.user.getData().default_share_right);
		hbox.append(this.shareField);

		this.flow = new Ui.Flow({ uniform: true });
		this.mainVbox.append(this.flow);

		if(!this.resource.getPublicRights().read)
			this.flow.append(new Wn.AddWorldIcon({ user: this.user, dialog: this }));
	},

	onSearchValidate: function() {
		if(this.searchRequest !== undefined) {
			this.disconnect(this.searchRequest, 'done', this.onSearchDone);
			this.disconnect(this.searchRequest, 'error', this.onSearchError);
			this.searchRequest.abort();
		}
		
		// clean previous list
		while(this.flow.getFirstChild() != undefined)
			this.flow.remove(this.flow.getFirstChild());
		// disable search
		this.mainVbox.disable();

		this.searchRequest = new Core.HttpRequest({ method: 'GET', url: '/cloud/user?query='+encodeURIComponent(this.searchField.getValue()) });
		this.connect(this.searchRequest, 'done', this.onSearchDone);
		this.connect(this.searchRequest, 'error', this.onSearchError);
		this.searchRequest.send();
	},

	onSearchDone: function(req) {
		var users = req.getResponseJSON();
		// update contact list
		for(var i = 0; i < users.length; i++) {
			var current = users[i];
			// test if already in resource rights
			var already = (this.resource.getOwnerId() === current.id);
			for(var i2 = 0; !already && (i2 < this.resource.getRights().length); i2++)
				already = (this.resource.getRights()[i2].user_id === current.id);
			if(!already)
				this.flow.append(new Wn.AddContactRightIcon({
					user: this.user,
					contact: new Wn.Contact({ contact: current, user: this.user }),
					dialog: this
				}));
		}
		this.mainVbox.enable();
		this.searchRequest = undefined;
	},

	onSearchError: function() {
		this.mainVbox.enable();
		this.searchRequest = undefined;
	},
	
	getResource: function() {
		return this.resource;
	},

	getRights: function() {
		return { read: true, write: this.writeField.getValue(), share: this.shareField.getValue() };
	},

	onAddPress: function() {
		var contacts = [];
		var icons = [];
		for(var i = 0; i < this.flow.getChildren().length; i++) {
			var icon = this.flow.getChildren()[i];
			if(icon.getIsSelected()) {
				if(Wn.AddWorldIcon.hasInstance(icon))
					this.resource.addPublicRights({ read: true, write: this.writeField.getValue(), share: this.shareField.getValue() });
				else
					contacts.push(icon.getContact());
				icons.push(icon);
			}
		}
		for(var i = 0; i < contacts.length; i++)
			this.resource.addRights({ user_id: contacts[i].getId(), read: true, write: this.writeField.getValue(), share: this.shareField.getValue() });
		for(var i = 0; i < icons.length; i++)
			this.flow.remove(icons[i]);
	}
});

