
Storage.Preview.extend('Podcast.Preview', {
	constructor: function(config) {
		this.getGraphic().setIcon('note');
	}
}, {}, {
	constructor: function() {
		this.register('podcast', this);
	}
});

