
Wn.WizardItem.extend('Wn.ResourceWizardSelector', {
	selectType: undefined,

	constructor: function(config) {
		var flow = new Ui.SFlow({ uniform: true, spacing: 10, itemAlign: 'stretch' });
		this.setContent(flow);

		var types = Wn.ResourceWizard.getWizardTypes();
		for(var i = 0; i < types.length; i++) {
			var def = Wn.ResourceWizard.getWizard(types[i]);
			var item = new Ui.Button({ icon: def.icon, text: def.name, orientation: 'horizontal', width: 150 });
			this.connect(item, 'press', this.onItemPress);
			item.hostResourceWizardSelector = types[i];
			flow.append(item);
		}
		delete(config.wizardType);
	},

	getSelectedType: function() {
		return this.selectType;
	},
	
	onItemPress: function(item) {
		this.selectType = item.hostResourceWizardSelector;
		this.fireEvent('done', this);
	}
});

Ui.Dialog.extend('Wn.ResourceWizard', {
	user: undefined,
	previousButton: undefined,
	nextButton: undefined,
	transBox: undefined,
	position: 0,
	current: undefined,
	wizardType: undefined,
	data: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.setFullScrolling(true);
		this.setPreferedWidth(450);
		this.setPreferedHeight(400);

		this.data = {};

		this.setTitle('Nouvelle ressource');
		this.setCancelButton(new Ui.Button({ text: 'Annuler' }));

		this.previousButton = new Ui.Button({ text: 'Précédent' });
		this.previousButton.hide();
		this.connect(this.previousButton, 'press', this.onPreviousPress);
		this.nextButton = new Ui.Button({ text: 'Suivant' });
		this.connect(this.nextButton, 'press', this.onNextPress);

		this.setActionButtons([ this.previousButton, this.nextButton ]);

		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		this.current = new Wn.ResourceWizardSelector();
		this.transBox.replaceContent(this.current);
		this.connect(this.current, 'done', this.onItemDone);
		this.nextButton.disable();
		this.nextButton.hide();
	},

	onPreviousPress: function() {
		this.position--;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();

		if(this.position < 0)
			this.position = 0;
		if(this.position == 0) {
			this.setTitle('Nouvelle ressource');
			this.current = new Wn.ResourceWizardSelector({ wizardType: this.wizardType });
			this.nextButton.hide();
			this.previousButton.hide();
		}
		else {
			var def = Wn.ResourceWizard.getWizard(this.wizardType);
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
		this.nextButton.enable();
		// auto next for the selector
		if(this.position == 0)
			this.onNextPress();
	},

	onNextPress: function() {
		this.position++;
		this.disconnect(this.current, 'done', this.onItemDone);
		this.current.save();
		this.nextButton.disable();
		this.previousButton.show();

		if(this.position == 1) {
			this.nextButton.show();
			if(this.wizardType != this.current.getSelectedType()) {
				this.wizardType = this.current.getSelectedType();
				this.data = {};
			}
		}
		var def = Wn.ResourceWizard.getWizard(this.wizardType);

		if(this.position > def.array.length) {
			var creator = new def.creator({user: this.user, data: this.data });
			this.disable();

			if(creator.getIsDone())
				this.onCreateDone();
			else
				this.connect(creator, 'done', this.onCreateDone);
		}
		else {
			this.setTitle(def.name);
			this.current = new def.array[this.position - 1]({ data: this.data });

			if(this.position == def.array.length)
				this.nextButton.setText('Créer');
			else
				this.nextButton.setText('Suivant');

			this.connect(this.current, 'done', this.onItemDone);
			this.transBox.replaceContent(this.current);
		}
	},

	onCreateDone: function() {
		this.close();
	}
}, {}, {
	apps: undefined,

	constructor: function() {
		this.apps = {};
	},

	register: function(type, name, icon, array, creator) {
		Wn.ResourceWizard.apps[type] = { name: name, icon: icon, array: array, creator: creator };
	},

	getWizardTypes: function() {
		var keys = [];
		for(var key in Wn.ResourceWizard.apps)
			keys.push(key);
		return keys;
	},

	getWizard: function(type) {
		return Wn.ResourceWizard.apps[type];
	}
});

