
Wn.ResourceCreator.extend('Radio.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'radio',
			name: this.getData().name,
			data: this.getData().url
		});
		this.done();
	}
});


