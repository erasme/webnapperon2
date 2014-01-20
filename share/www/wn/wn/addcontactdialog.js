
Ui.Dialog.extend('Wn.AddContactDialog', {
	user: undefined,
	flow: undefined,
	mainVbox: undefined,
	searchField: undefined,
	searchRequest: undefined,

	constructor: function(config) {
		this.addEvents('add');

		this.user = config.user;
		delete(config.user);

		this.setFullScrolling(true);
		this.setPreferedWidth(450);
		this.setPreferedHeight(450);
		this.setTitle('Ajouter des contacts');

		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));

		this.mainVbox = new Ui.VBox();
		this.setContent(this.mainVbox);

		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search' });
		this.mainVbox.append(this.searchField);

		this.connect(this.searchField, 'validate', this.onSearchValidate);

		this.flow = new Ui.Flow();
		this.mainVbox.append(this.flow);

		// start a search on all available contacts
		//this.onSearchValidate();
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
			this.flow.append(new Wn.AddContactIcon({
				user: this.user,
				contact: new Wn.Contact({ contact: current, user: this.user }),
				dialog: this, margin: 5
			}));
		}
		this.mainVbox.enable();
		this.searchRequest = undefined;
	},

	onSearchError: function() {
		this.mainVbox.enable();
		this.searchRequest = undefined;
	}
});

