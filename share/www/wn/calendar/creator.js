
Wn.ResourceCreator.extend('Calendar.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'calendar',
			name: this.getData().name,
			data: this.getData().url
		});
		this.done();
	}
});


