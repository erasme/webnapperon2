
Wn.ResourceCreator.extend('Podcast.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'podcast',
			name: this.getData().name,
			url: this.getData().url
		});
		this.done();
	}
});


