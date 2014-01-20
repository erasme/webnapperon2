
Wn.ResourceCreator.extend('Storage.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'storage',
			name: this.getData().name
		});
		this.done();
	}
});


