
Core.Object.extend('Wn.ResourceCreator', {
	data: undefined,
	user: undefined,
	isDone: false,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);

		this.user = config.user;
		delete(config.user);

		this.addEvents('done');
	},

	getIsDone: function() {
		return this.isDone;
	},

	getData: function() {
		return this.data;
	},

	getUser: function() {
		return this.user;
	},

	done: function() {
		if(!this.isDone) {
			this.isDone = true;
			this.fireEvent('done');
		}
	}
});

