
Wn.ResourceView.extend('News.Preview', {
	request: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('newspaper');
	}
}, {}, {
	constructor: function() {
		this.register('news', this);
	}
});

