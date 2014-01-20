
Wn.ResourceCreator.extend('Picasa.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'picasa',
			name: this.getData().name,
			data: this.getData().url
		});
		this.done();
	}
});


