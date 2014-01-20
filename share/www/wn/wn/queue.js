

Core.Object.extend('Wn.Queue', {
	channel: undefined,
	socket: undefined,
	retryTask: undefined,
	stopped: false,

	constructor: function(config) {
		this.addEvents('open', 'message', 'close');

		this.channel = config.channel;
		delete(config.channel);
		
		console.log('new Wn.Queue('+this.channel+')');
		
		this.startMonitoring();
	},

	getChannel: function() {
		return this.channel;
	},
	
	setChannel: function(channel) {
		if(this.channel != channel) {
			this.channel = channel;
			if(this.socket !== undefined) {
				this.socket.close();
				if(this.retryTask != undefined)
					this.retryTask.abort();
				this.startMonitoring();
			}
		}
	},

	sendMessage: function(message) {
		this.socket.send(JSON.stringify(message));	
	},
	
	startMonitoring: function() {
		this.socket = new Core.Socket({ service: '/cloud/queue/'+this.channel });
		this.connect(this.socket, 'message', this.onMessageReceived);
		this.connect(this.socket, 'open', this.onSocketOpen);
		this.connect(this.socket, 'error', this.onSocketError);
		this.connect(this.socket, 'close', this.onSocketClose);
	},

	onSocketOpen: function() {
		this.fireEvent('open', this);
	},

	onSocketError: function() {
		this.socket.close();
	},

	onSocketClose: function() {
		this.disconnect(this.socket, 'message', this.onMessageReceived);
		this.disconnect(this.socket, 'error', this.onSocketError);
		this.disconnect(this.socket, 'close', this.onSocketClose);
		this.socket = undefined;
		if(!this.stopped)
			this.retryTask = new Core.DelayedTask({ delay: 5, scope: this, callback: this.startMonitoring });
		else
			this.fireEvent('close', this);
	},

	onMessageReceived: function(socket, msg) {
		this.fireEvent('message', this, JSON.parse(msg));
	},
	
	close: function() {
		if(!this.stopped && (this.socket !== undefined)) {
			this.stopped = true;
			this.socket.close();
		}
	}
});

