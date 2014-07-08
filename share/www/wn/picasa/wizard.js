
Wn.WizardItem.extend('Picasa.Wizard', {
	nameField: undefined,
	urlField: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		this.nameField = new Wn.TextField({ title: 'Nom de la ressource' });
		this.connect(this.nameField, 'change', this.onChange);
		vbox.append(this.nameField);

		this.urlField = new Wn.TextField({ title: "URL du flux RSS de l'album" });
		this.connect(this.urlField, 'change', this.onChange);
		vbox.append(this.urlField);

		var data = this.getData();
		if(data.name != undefined)
			this.nameField.setValue(data.name);
		if(data.url != undefined)
			this.urlField.setValue(data.url);
		this.onChange();
	},

	onChange: function() {
		if((this.urlField.getValue() != '') && (this.nameField.getValue() != '') &&
		   (this.urlField.getValue().match(/^http(s){0,1}:\/\/.*google.*$/)))
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.name = this.nameField.getValue();
		data.url = this.urlField.getValue();
	}
});

Wn.ResourceWizard.register('picasa', 'Picasa', 'picasa', [ Picasa.Wizard ], Picasa.Creator);

