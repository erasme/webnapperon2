
Wn.WizardItem.extend('Radio.Wizard', {
	nameField: undefined,
	urlField: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom de la ressource:', horizontalAlign: 'left' }));

		this.nameField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.nameField, 'change', this.onChange);
		vbox.append(this.nameField);

		vbox.append(new Ui.Label({ text: 'URL du flux MP3:', horizontalAlign: 'left' }));

		this.urlField = new Ui.TextField({ marginLeft: 20 });
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
		   (this.urlField.getValue().match(/^http(s){0,1}:\/\/.*$/)))
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.name = this.nameField.getValue();
		data.url = this.urlField.getValue();
	}
});

//Wn.ResourceWizard.register('radio', 'Radio', 'eye', [ Radio.Wizard ], Radio.Creator);

