
Wn.ResourceCreator.extend('Weather.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'weather',
			name: this.getData().name,
			data: this.getData().location
		});
		this.done();
	}
});


