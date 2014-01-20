
Wn.LoginCreator.extend('Wn.Create.Creator', {
	item: undefined,
	newuser: undefined,
	newresources: undefined,
	resources: undefined,

	constructor: function(config) {
		this.item = config.item;
		delete(config.item);

		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user',
			content: JSON.stringify({
				login: this.getData().login,
				password: this.getData().password,
				firstname: this.getData().firstname,
				lastname: this.getData().lastname
			})
		});
		this.connect(request, 'done', this.onCreateUserDone);
		this.connect(request, 'error', this.onCreateUserError);
		request.send();
	},

	onCreateUserError: function(req) {
		var status = req.getStatus();
		var message = 'Echec de la création. Vérifier vos données';
		if(status == 409) {
			message = 'Echec: l\'identifiant existe déjà';
		}
		else if(status == 403) {
			if(req.getResponseJSON().code == 1)
				message = 'Echec: mot de passe trop faible';
		}
		this.item.showError(message);
		this.fail();
	},

	onCreateUserDone: function() {
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user/login', content: JSON.stringify({ login: this.getData().login, password: this.getData().password }) });
		this.connect(request, 'done', this.onLoginBasicDone);
		this.connect(request, 'error', this.onLoginBasicFails);
		request.send();
	},

	onLoginBasicDone: function() {
		this.done();
	},

	onLoginBasicFails: function() {
		this.fail();
	}
});


Wn.WizardItem.extend('Wn.Create.Wizard', {
	firstnameField: undefined,
	lastnameField: undefined,
	loginField: undefined,
	passwordField: undefined,
	errorMessage: undefined,
	errorTimeout: undefined,

	constructor: function(config) {

		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: 'Nom:', horizontalAlign: 'left' }));

		this.lastnameField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.lastnameField, 'change', this.onChange);
		vbox.append(this.lastnameField);

		vbox.append(new Ui.Label({ text: 'Prénom:', horizontalAlign: 'left' }));

		this.firstnameField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.firstnameField, 'change', this.onChange);
		vbox.append(this.firstnameField);

		vbox.append(new Ui.Label({ text: 'Identifiant:', horizontalAlign: 'left' }));

		this.loginField = new Ui.TextField({ marginLeft: 20 });
		this.connect(this.loginField, 'change', this.onChange);
		vbox.append(this.loginField);

		var hbox = new Ui.HBox({ horizontalAlign: 'left' });
		vbox.append(hbox);

		hbox.append(new Ui.Label({ text: 'Mot de passe: ' }));
		hbox.append(new Ui.Label({ text: ' 8 caractères minium avec chiffre et lettre', opacity: 0.4 }));

		this.passwordField = new Ui.TextField({ marginLeft: 20, passwordMode: true });
		this.connect(this.passwordField, 'change', this.onChange);
		vbox.append(this.passwordField);

		this.errorMessage = new Ui.Label({ text: 'Echec de la création. Vérifier vos données', color: 'red' });
		this.errorMessage.hide();
		vbox.append(this.errorMessage);

		var data = this.getData();
		if(data.login != undefined)
			this.loginField.setValue(data.login);
		if(data.password != undefined)
			this.passwordField.setValue(data.password);
		this.onChange();
	},

	showError: function(message) {
		if(this.errorTimeout != undefined)
			this.errorTimeout.abort();
		this.errorMessage.setText(message);
		this.errorMessage.show();
		this.errorTimeout = new Core.DelayedTask({ scope: this, delay: 4, callback: this.onShowErrorTimeout });
	},

	onShowErrorTimeout: function() {
		if(this.errorTimeout != undefined) {
			this.errorTimeout.abort();
			this.errorTimeout = undefined;
			this.errorMessage.hide();
		}
		this.errorTimeout = undefined;
		this.errorMessage.hide();
	},

	onChange: function() {
		if((this.firstnameField.getValue() != '') && (this.lastnameField.getValue() != '') &&
		   (this.loginField.getValue() != '') && (this.passwordField.getValue() != ''))
			this.done();
	}
}, {
	onSave: function() {
		var data = this.getData();
		data.firstname = this.firstnameField.getValue();
		data.lastname = this.lastnameField.getValue();
		data.login = this.loginField.getValue();
		data.password = this.passwordField.getValue();
	}
});

Wn.LoginWizard.register('create', 'Nouveau compte', 'plus', [ Wn.Create.Wizard ], Wn.Create.Creator, 'Créer');

