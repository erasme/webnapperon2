

Core.FilePostUploader.extend('Wn.FilePostUploader', {
	resource: undefined,

	constructor: function(config) {
		this.resource = config.resource;
		delete(config.resource);
		if(this.resource !== undefined)
			this.resource.addUploader(this);
	},

	getResource: function() {
		return this.resource;
	}
});