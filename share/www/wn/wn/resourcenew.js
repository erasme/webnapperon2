
Ui.Pressable.extend('Wn.ResourceNew', {
	user: undefined,
	graphic: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.resource = config.resource;
		delete(config.resource);

		this.graphic = new Wn.AppViewGraphic({ icon: 'plus' });
		this.append(this.graphic);
		
		this.connect(this, 'press', this.onResourcePress);
	},

	onResourcePress: function() {
		var dialog = new Wn.ResourceWizard({ user: this.user });
		dialog.open();
	}
});

