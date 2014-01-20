

Ui.LBox.extend('Wn.Viewer', {
	user: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	},

	getUser: function() {
		return this.user;
	}
}, {}, {
	viewers: undefined,

	constructor: function() {
		this.viewers = {};
	},

	register: function(mimetype, viewer) {
		Wn.Viewer.viewers[mimetype] = viewer;
	},

	getViewer: function(mimetype) {
		return Wn.Viewer.viewers[mimetype];
	}
});
