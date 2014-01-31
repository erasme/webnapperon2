
Core.Object.extend('Wn.Message', {
	message: undefined,
	ready: false,
	request: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete');
		if('message' in config) {
			this['message'] = config['message'];
			delete(config['message']);
			this.updateData(this['message']);
		}
		else if('id' in config) {
			var id = config.id;
			delete(config.id);
			this['message'] = { id: id };
			this.update();
		}
	},

	getIsReady: function() {
		return this.ready;
	},

	update: function() {
		if(this.request !== undefined) {
			this.disconnect(this.request, 'done', this.onGetMessageDone);
			this.disconnect(this.request, 'error', this.onGetMessageError);
			this.request.abort();
		}
		this.request = new Core.HttpRequest({ url: '/cloud/message/'+this['message'].id });
		this.connect(this.request, 'done', this.onGetMessageDone);
		this.connect(this.request, 'error', this.onGetMessageError);
		this.request.send();
	},

	updateData: function(values) {
		this['message'] = values;
		if(!this.ready) {
			this.ready = true;
			this.fireEvent('ready', this);
		}
		this.fireEvent('change', this);
	},

	getMessage: function() {
		return this['message'];
	},

	getId: function() {
		return this.message.id;
	},

	getType: function() {
		return this.message.type;
	},

	getOrigin: function() {
		return this.message.origin;
	},

	getDestination: function() {
		return this.message.destination;
	},

	getSeen: function() {
		return this.message.seen !== -1;
	},

	getDate: function() {
		return new Date(this.message.create * 1000);
	},

	getContent: function() {
		return this.message.content;
	},

	markSeen: function() {
		var request = new Core.HttpRequest({ method: 'PUT', url: '/cloud/message/'+this['message'].id });
		request.send();
	},

	onGetMessageError: function(request) {
		if(request.getStatus() == 404)
			this.fireEvent('delete', this);
		this.request = undefined;
	},

	onGetMessageDone: function(request) {
		var newMessage = request.getResponseJSON();
		this.updateData(newMessage);
		this.request = undefined;
	}
});

