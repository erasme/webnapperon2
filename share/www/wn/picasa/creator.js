
Wn.ResourceCreator.extend('Picasa.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'picasa',
			name: this.getData().name,
			url: this.getData().url
		});
		this.done();
	}
});


