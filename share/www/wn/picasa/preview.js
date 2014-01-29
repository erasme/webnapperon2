
Storage.Preview.extend('Picasa.Preview', {
	picasa: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('picasa');
	}
}, {}, {
	constructor: function() {
		this.register('picasa', this);
	}
});