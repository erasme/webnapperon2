
Wn.ResourceView.extend('Radio.Preview', {
	constructor: function(config) {
		this.getGraphic().setIcon('radio');
	}
}, {}, {
	constructor: function() {
		this.register('radio', this);
	}
});

