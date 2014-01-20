
Storage.Preview.extend('Podcast.Preview', {
	constructor: function(config) {
		this.getGraphic().setIcon('note');
		var podcast = this.getResource().getData();
		// ask picasa to update its content
		var request = new Core.HttpRequest({ url: '/cloud/podcast/'+podcast+'/update' });
		request.send();
	}
}, {}, {
	constructor: function() {
		this.register('podcast', this);
	}
});

