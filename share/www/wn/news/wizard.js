
Wn.WizardItem.extend('News.Wizard', {
	nameField: undefined,
	urlField: undefined,
	fullContentField: undefined,
	originalArticleField: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		this.nameField = new Wn.TextField({ title: 'Nom de la ressource' });
		this.connect(this.nameField, 'change', this.onChange);
		vbox.append(this.nameField);

		this.urlField = new Wn.TextField({ title: 'URL du flux RSS du journal' });
		this.connect(this.urlField, 'change', this.onChange);
		vbox.append(this.urlField);
		
		var hbox = new Ui.HBox({ spacing: 10 });
		vbox.append(hbox);
		this.fullContentField = new Ui.CheckBox({ text: 'Récupérer le contenu complet' });
		hbox.append(this.fullContentField, true);
		var helpButton = new Ui.Pressable();
		this.connect(helpButton, 'press', this.onHelpPress);
		hbox.append(helpButton);
		helpButton.setContent(new Ui.Icon({ icon: 'help', width: 24, height: 24, verticalAlign: 'center' }));

		this.originalArticleField = new Ui.CheckBox({ text: "Afficher l'article d'origine" });
		if(Ui.App.current.getUser().isAdmin())
			vbox.append(this.originalArticleField);

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
		var dialog = new Ui.Dialog({ title: 'Mise en garde', preferredWidth: 300, preferredHeight: 350, fullScrolling: true });
		dialog.setContent(new Ui.Text({ text: 
		  'ATTENTION, cette option va essayer de récupérer le contenu complet '+
		  'des articles référencés dans le flux RSS. Cela veux dire qu\'il va '+
		  'modifier le flux RSS.\n'+
		  'Cela peut être inutile voir poser des problèmes avec certains flux RSS.\n'+
		  'Mais surtout, cela peut être contraire au droit d\'auteur. Vous engager votre '+
		  'responsabilité en le faisant. Vérifiez donc que vous avez bien le droit de le faire.'
		}));
		var closeButton = new Ui.DefaultButton({ text: 'Fermer' });
		this.connect(closeButton, 'press', function() { dialog.close() });
		dialog.setActionButtons([closeButton]);
		dialog.setCancelButton(new Ui.DialogCloseButton());
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
		data.originalarticle = this.originalArticleField.getValue();
	}
});

Wn.ResourceWizard.register('news', 'Journal', 'newspaper', [ News.Wizard ], News.Creator);

