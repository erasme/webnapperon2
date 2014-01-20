
Wn.WizardItem.extend('Wn.Facebook.Wizard', {
	constructor: function(config) {
		this.setContent(new Ui.Text({ text: 'Redirection en cours...', textAlign: 'center', verticalAlign: 'center' }));
		location = '/cloud/facebookoauth2/redirect?state=create';
	}
});

Wn.LoginWizard.register('facebook', 'Facebook', 'facebook', [ Wn.Facebook.Wizard ]);

