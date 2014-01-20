
Wn.WizardItem.extend('Wn.Google.Wizard', {
	constructor: function(config) {
		this.setContent(new Ui.Text({ text: 'Redirection en cours...', textAlign: 'center', verticalAlign: 'center' }));
		location = '/cloud/googleoauth2/redirect?state=create';
	}
});

Wn.LoginWizard.register('google', 'Google', 'google', [ Wn.Google.Wizard ]);

