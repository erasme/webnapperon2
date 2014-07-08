
Ui.Dialog.extend('Wn.AddContactDialog', {
	user: undefined,
	flow: undefined,
	searchField: undefined,
	searchRequest: undefined,

	constructor: function(config) {
		this.addEvents('add');

		this.user = config.user;
		delete(config.user);

		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		this.setTitle('Rechercher des contacts');

		this.setCancelButton(new Ui.DialogCloseButton());

		this.searchField = new Ui.TextButtonField({ buttonIcon: 'search', width: 150 });
		Ui.Box.setResizable(this.searchField, true);
		this.setActionButtons([ this.searchField ]);

		this.connect(this.searchField, 'validate', this.onSearchValidate);

		this.flow = new Ui.Flow({ uniform: true, verticalAlign: 'top' });
		this.setContent(this.flow);

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
		this.searchField.disable();
		this.flow.disable();

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
		this.searchField.enable();
		this.flow.enable();
		this.searchRequest = undefined;
	},

	onSearchError: function() {
		// TODO: display the error
		this.searchField.enable();
		this.flow.enable();
		this.searchRequest = undefined;
	}
});

