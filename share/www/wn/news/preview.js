
Wn.ResourceView.extend('News.Preview', {
	request: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('newspaper');
		//this.getGraphic().setColor('#e20045');
	}
}, {}, {
	constructor: function() {
		this.register('news', this);
	}
});

