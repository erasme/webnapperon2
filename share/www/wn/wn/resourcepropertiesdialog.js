
Ui.Dialog.extend('Wn.ResourcePropertiesDialog', {
	user: undefined,
	resource: undefined,
	flow: undefined,
	deleteButton: undefined,
	modifyButton: undefined,
	nameField: undefined,
	bookmarkField: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.setPreferredWidth(500);
		this.setPreferredHeight(500);
		this.setFullScrolling(true);

		this.setTitle('Propriétés de la ressource');
		this.setCancelButton(new Ui.DialogCloseButton());

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		this.nameField = new Wn.TextField({ title: 'Nom', width: 200, value: this.resource.getName() });
		vbox.append(this.nameField);

		if(this.resource.getOwnerId() !== this.user.getId()) {
			this.bookmarkField = new Wn.CheckField({
				title: 'Favoris', width: 200, value: this.resource.getBookmark(),
				text: "afficher sur ma page d'accueil"
			});
			vbox.append(this.bookmarkField);
		}

		var sharesSection = new Wn.ResourceSharesSection({ user: this.user, resource: this.resource });
		vbox.append(sharesSection);
		
		var tags = this.user.getRfidsFromPath('resource:'+this.resource.getId());
		var rfidSection = new Wn.RfidSection({ user: this.user, tags: tags, path: 'resource:'+this.resource.getId() });
		vbox.append(rfidSection);

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.deleteButton = new Wn.AlertButton({ text: 'Supprimer' });
			this.connect(this.deleteButton, 'press', this.onDeletePress);

			this.saveButton = new Ui.DefaultButton({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);

			this.setActionButtons([ this.deleteButton, this.saveButton ]);
		}
		else {
			hbox.disable();
		}
	},

	onSavePress: function() {
		if(this.resource.getName() !== this.nameField.getValue())
			this.resource.changeData({ name: this.nameField.getValue() });

		if((this.bookmarkField !== undefined) && (this.resource.getBookmark() !== this.bookmarkField.getValue())) {
			if(this.bookmarkField.getValue())
				this.resource.bookmark();
			else
				this.resource.unbookmark();
		}
		this.close();
	},

	onDeletePress: function() {
		var dialog = new Wn.ResourceDeleteDialog({ resource: this.resource });
		this.connect(dialog, 'done', function() {
			this.close();
		});
		dialog.open();
	}
});

