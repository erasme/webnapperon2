
Wn.WizardItem.extend('Storage.Wizard', {
	nameField: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom de la ressource:', horizontalAlign: 'left' }));

		this.nameField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.nameField, 'change', this.onChange);
		vbox.append(this.nameField);

		var data = this.getData();
		if(data.name != undefined)
			this.nameField.setValue(data.name);
		this.onChange();
	},

	onChange: function() {
		if(this.nameField.getValue() != '')
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.name = this.nameField.getValue();
	}
});

Wn.ResourceWizard.register('storage', 'Fichiers', 'files', [ Storage.Wizard ], Storage.Creator);

