
Ui.Dialog.extend('Wn.ResourcePropertiesDialog', {
	user: undefined,
	resource: undefined,
	flow: undefined,
	deleteButton: undefined,
	modifyButton: undefined,
	nameField: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.setPreferedWidth(500);
		this.setPreferedHeight(500);
		this.setFullScrolling(true);

		this.setTitle('Propriétés de la ressource');
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));

		var vbox = new Ui.VBox();
		this.setContent(vbox);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		
		hbox.append(new Ui.Text({ text: 'Nom', width: 100, textAlign: 'right', verticalAlign: 'center' }));
		this.nameField = new Ui.TextField({ value: this.resource.getName(), verticalAlign: 'center' });
		hbox.append(this.nameField, true);

		var sharesSection = new Wn.ResourceSharesSection({ user: this.user, resource: this.resource });
		vbox.append(sharesSection);
		
		var tags = this.user.getRfidsFromPath('resource:'+this.resource.getId());
		var rfidSection = new Wn.RfidSection({ user: this.user, tags: tags, path: 'resource:'+this.resource.getId() });
		vbox.append(rfidSection);

		if(Ui.App.current.getUser().isAdmin() || this.resource.canWrite()) {
			this.deleteButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
			this.connect(this.deleteButton, 'press', this.onDeletePress);

			this.saveButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);

			this.setActionButtons([ this.deleteButton, this.saveButton ]);
		}
		else {
			hbox.disable();
		}
	},

	onSavePress: function() {
		this.resource.changeData({ name: this.nameField.getValue() });
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

