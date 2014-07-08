
Wn.WizardItem.extend('Wn.LoginWizardSelector', {
	selectItem: undefined,
	setup: undefined,

	constructor: function(config) {
		this.addEvents('choose');

		this.setup = config.setup;
		delete(config.setup);

		var vbox2 = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox2);

		vbox2.append(new Wn.RatioImage({ src: 'img/login_logo.png' }));

		var vbox = new Ui.VBox({ uniform: true, spacing: 10 });
		vbox2.append(vbox);

		for(var i = 0; i < this.setup.authentication.services.length; i++) {
			var service = this.setup.authentication.services[i];
			var def = Wn.LoginWizard.getWizard(service.type);
			if(def !== undefined) {
				var name = def.name;
				if(service.name !== undefined)
					name = service.name;
				var item = new Ui.Button({ icon: def.icon, text: name, orientation: 'horizontal' });
				this.connect(item, 'press', this.onItemPress);
				item.hostLoginWizardSelector = service.type;
				vbox.append(item);
			}
		}
		delete(config.wizardType);
	},

	getSelectedType: function() {
		return this.selectItem.hostLoginWizardSelector;
	},

	onItemPress: function(item) {
		this.selectItem = item;
		this.fireEvent('done', this);
	}
});

Ui.Dialog.extend('Wn.LoginWizard', {
	previousButton: undefined,
	nextButton: undefined,
	transBox: undefined,
	position: 0,
	current: undefined,
	wizardType: undefined,
	data: undefined,
	setup: undefined,

	constructor: function(config) {
		this.addEvents('done');

		this.setup = config.setup;
		delete(config.setup);

		this.setAutoClose(false);
		this.setTitle('Connexion');
		this.setFullScrolling(true);
		this.setPreferredWidth(450);
		this.setPreferredHeight(450);

		this.data = {};

		this.previousButton = new Ui.Button({ text: 'Précédent' });
		this.previousButton.hide();
		this.connect(this.previousButton, 'press', this.onPreviousPress);
		this.nextButton = new Ui.DefaultButton({ text: 'Suivant' });
		this.connect(this.nextButton, 'press', this.onNextPress);

		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		this.current = new Wn.LoginWizardSelector({ setup: this.setup });
		this.transBox.replaceContent(this.current);
		this.connect(this.current, 'done', this.onItemDone);
		this.nextButton.disable();
	},

	onPreviousPress: function() {
		this.position--;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();

		if(this.position < 0)
			this.position = 0;
		if(this.position == 0) {
			this.setTitle('Connexion');
			this.current = new Wn.LoginWizardSelector({ wizardType: this.wizardType, setup: this.setup });
			this.previousButton.hide();

			this.setActionButtons(undefined);
		}
		else {
			var def = Wn.LoginWizard.getWizard(this.wizardType);
			this.setTitle(def.name);
			this.current = new def.array[this.position - 1]({ data: this.data });
		}
		this.nextButton.setText('Suivant');
		this.connect(this.current, 'done', this.onItemDone);
		this.transBox.replaceContent(this.current);

		if(this.current.getIsDone())
			this.nextButton.enable();
		else
			this.nextButton.disable();
	},

	onItemDone: function() {
		if(this.position == 0)
			this.onNextPress();

		this.nextButton.enable();
	},

	findSetup: function(type) {
		for(var i = 0; i < this.setup.authentication.services.length; i++) {
			var service = this.setup.authentication.services[i];
			if(service.type === type)
				return service;
		}
		return undefined;
	},

	onNextPress: function() {
		this.position++;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();
		this.nextButton.disable();
		this.previousButton.show();

		if(this.position == 1) {
			this.setActionButtons([ this.previousButton, this.nextButton ]);

			if(this.wizardType != this.current.getSelectedType()) {
				this.wizardType = this.current.getSelectedType();
				this.data = {};
			}
		}
		var def = Wn.LoginWizard.getWizard(this.wizardType);
		var setup = this.findSetup(this.wizardType);

		if(this.position > def.array.length) {
			var creator = new def.creator({ data: this.data, item: this.current });
			this.disable();

			this.connect(creator, 'done', this.onCreatorDone);
			this.connect(creator, 'fail', this.onCreatorFail);
		}
		else {
			this.setTitle((setup.name !== undefined)?setup.name:def.name);
			this.current = new def.array[this.position - 1]({ data: this.data });

			if(this.position == def.array.length)
				this.nextButton.setText(def.endlabel);
			else
				this.nextButton.setText('Suivant');

			this.connect(this.current, 'done', this.onItemDone);
			this.transBox.replaceContent(this.current);
		}
	},

	onCreatorDone: function(creator, user) {
		this.close();
		this.fireEvent('done', this, user);
	},

	onCreatorFail: function() {
		this.enable();
		this.position--;
		this.nextButton.enable();
	}

}, {}, {
	apps: undefined,

	constructor: function() {
		this.apps = {};
	},

	register: function(type, name, icon, array, creator, endlabel) {
		Wn.LoginWizard.apps[type] = { name: name, icon: icon, array: array, creator: creator, endlabel: endlabel };
	},

	getWizardTypes: function() {
		var keys = [];
		for(var key in Wn.LoginWizard.apps)
			keys.push(key);
		return keys;
	},

	getWizard: function(type) {
		return Wn.LoginWizard.apps[type];
	}
});

