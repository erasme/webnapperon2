
Ui.Button.extend('Wn.AppView', {
	user: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.getIconBox().setVerticalAlign('center');
		this.getIconBox().setHorizontalAlign('center');
	}
});

Wn.AppView.extend('Wn.ResourceNew', {
	
	constructor: function(config) {
		this.setIcon('plus');
		this.connect(this, 'press', this.onResourceNewPress);
	},

	onResourceNewPress: function() {
		var dialog = new Wn.ResourceWizard({ user: this.user });
		dialog.open();
	}
});

