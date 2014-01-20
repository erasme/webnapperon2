
Wn.WizardItem.extend('News.Wizard', {
	nameField: undefined,
	urlField: undefined,
	fullContentField: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom de la ressource:', horizontalAlign: 'left' }));

		this.nameField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.nameField, 'change', this.onChange);
		vbox.append(this.nameField);

		vbox.append(new Ui.Label({ text: 'URL du flux RSS du journal:', horizontalAlign: 'left' }));

		this.urlField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.urlField, 'change', this.onChange);
		vbox.append(this.urlField);
		
		hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		this.fullContentField = new Ui.CheckBox({ text: 'Récupérer le contenu complet' });
		hbox.append(this.fullContentField, true);
		var helpButton = new Ui.Pressable();
		this.connect(helpButton, 'press', this.onHelpPress);
		hbox.append(helpButton);
		helpButton.setContent(new Ui.Icon({ icon: 'help', width: 24, height: 24, verticalAlign: 'center' }));

		var data = this.getData();
		if(data.name != undefined)
			this.nameField.setValue(data.name);
		if(data.url != undefined)
			this.urlField.setValue(data.url);
		if(data.fullcontent != undefined)
			this.fullContentField.setValue(data.fullcontent);
		this.onChange();
	},

	onHelpPress: function() {
		var dialog = new Ui.Dialog({ title: 'Mise en garde', preferedWidth: 300, preferedHeight: 350, fullScrolling: true });
		dialog.setContent(new Ui.Text({ text: 
		  'ATTENTION, cette option va essayer de récupérer le contenu complet '+
		  'des articles référencés dans le flux RSS. Cela veux dire qu\'il va '+
		  'modifier le flux RSS.\n'+
		  'Cela peut être inutile voir poser des problèmes avec certains flux RSS.\n'+
		  'Mais surtout, cela peut être contraire au droit d\'auteur. Vous engager votre '+
		  'responsabilité en le faisant. Vérifiez donc que vous avez bien le droit de le faire.'
		}));
		var closeButton = new Ui.Button({ text: 'Fermer' });
		this.connect(closeButton, 'press', function() { dialog.close() });
		dialog.setActionButtons([closeButton]);
		dialog.open();
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
		data.fullcontent = this.fullContentField.getValue();
	}
});

Wn.ResourceWizard.register('news', 'Journal', 'newspaper', [ News.Wizard ], News.Creator);

