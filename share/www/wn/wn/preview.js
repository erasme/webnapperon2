

Ui.LBox.extend('Wn.Preview', {
	user: undefined,
	resource: undefined,

	constructor: function(config) {
		this.setWidth(190);
		this.setHeight(190);
		this.resource = config.resource;
		delete(config.resource);
		this.user = config.user;
		delete(config.user);
	},

	getResource: function() {
		return this.resource;
	},

	getUser: function() {
		return this.user;
	}
}, {}, {
	previews: undefined,

	constructor: function() {
		this.previews = {};
	},

	register: function(mimetype, preview) {
		Wn.Preview.previews[mimetype] = preview;
	},

	getPreview: function(mimetype) {
		return Wn.Preview.previews[mimetype];
	}
});
