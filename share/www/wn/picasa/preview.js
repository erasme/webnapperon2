
Storage.Preview.extend('Picasa.Preview', {
	picasa: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('picasa');
		this.picasa = this.getResource().getData();
		// ask picasa to update its content
		request = new Core.HttpRequest({ url: '/cloud/picasa/'+this.picasa+'/update' });
		request.send();
	}
}, {}, {
	constructor: function() {
		this.register('picasa', this);
	}
});