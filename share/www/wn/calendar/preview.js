
Wn.ResourceView.extend('Calendar.Preview', {
	constructor: function(config) {
		this.getGraphic().setIcon('calendar');
	}
}, {}, {
	constructor: function() {
		this.register('calendar', this);
	}
});

