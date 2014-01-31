
Ui.Dialog.extend('Wn.VideoConfDialog', {
	user: undefined,
	contact: undefined,
	localVideo: undefined,
	localStream: undefined,
	remoteVideo: undefined,
	remoteStream: undefined,
	queue: undefined,
	remoteBox: undefined,
	peerConnection: undefined,
	isCaller: true,
	message: undefined,
	channel: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);
		
		this.setTitle('Appel vidéo');
		this.setPreferedWidth(500);
		this.setPreferedHeight(500);
		this.connect(this, 'unload', this.onVideoConfUnload);
		
		if('message' in config) {
			console.log('message');
			console.log(config.message);
		
			this.message = config.message;
			delete(config.message);
			this.channel = this.message.content;
			this.isCaller = false;
						
			var hbox = new Ui.HBox({ uniform: true, verticalAlign: 'center', horizontalAlign: 'center' });
			
			var denyButton = new Ui.Button({ text: 'Refuser', style: { "Ui.Button": { color: '#fa4141' } } });
			hbox.append(denyButton);
			var allowButton = new Ui.Button({ text: 'Accepter', style: { "Ui.Button": { color: '#41fa41' } } });
			hbox.append(allowButton);
			
			this.setContent(hbox);
			
			this.connect(denyButton, 'press', function() {
				this.close();
			});
			this.connect(allowButton, 'press', function() {
				this.disconnect(this.message, 'change', this.onMessageChange);
				this.buildVideoUi();
			});
		}
		else {
			this.buildVideoUi();
		}				
	},

	buildRemoteVideo: function() {
		this.remoteVideo = new Ui.Video({ autoplay: true });
		this.remoteBox.setContent(this.remoteVideo);
	},

	buildVideoUi: function() {	
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
			
		var lbox = new Ui.LBox();
		this.setContent(lbox);
		
		this.remoteBox = new Ui.LBox();
		lbox.append(this.remoteBox);
		
		this.remoteBox.setContent(new Ui.Text({ text: 'Attente d\'autorisation',
			margin: 10, textAlign: 'center', verticalAlign: 'center', fontSize: 24 }));
		
		var lbox2 = new Ui.LBox({ verticalAlign: 'bottom', horizontalAlign: 'left' });
		lbox.append(lbox2);
		lbox2.append(new Ui.Rectangle({ fill: '#999999' }));
		this.localVideo = new Ui.Video({ margin: 2, width: 100, height: 100, autoplay: true });
		this.connect(this.localVideo, 'ready', this.onLocalVideoReady);
		lbox2.append(this.localVideo);
		
		// ask access to audio and video
		var mediaConstraints = {"audio": true, "video": {"mandatory": {}, "optional": []}};
		var scope = this;
		navigator.getUserMedia(mediaConstraints,
			function(stream) {
				scope.onUserMediaSuccess.call(scope, stream);
			},
			function(error) {
				this.onUserMediaError.call(scope, error);
			}
		);
	},
	
	onUserMediaSuccess: function(stream) {
		this.localStream = stream;
		this.localVideo.setSrc(this.localStream);

		if(this.isCaller) {
			this.buildRemoteVideo();
		
			// generate a random queue channel
			var chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			this.channel = '';
			for(var i = 0; i < 10; i++)
				this.channel += chars.charAt(Math.floor((Math.random()*chars.length)));
		
			// connect to the queue
			this.queue = new Wn.Queue({ channel: this.channel });
			this.connect(this.queue, 'open', this.onQueueOpen);
			this.connect(this.queue, 'close', this.onQueueClose);
			this.connect(this.queue, 'message', this.onQueueMessage);
			this.remoteBox.setContent(new Ui.Text({ text: 'Appel en cours...',
				margin: 10, textAlign: 'center', verticalAlign: 'center', fontSize: 24 }));
		}
		else {
			// connect to the queue
			this.queue = new Wn.Queue({ channel: this.channel });
			this.connect(this.queue, 'open', this.onQueueOpen);
			this.connect(this.queue, 'close', this.onQueueClose);
			this.connect(this.queue, 'message', this.onQueueMessage);
			this.remoteBox.setContent(new Ui.Text({ text: 'Appel en cours...',
				margin: 10, textAlign: 'center', verticalAlign: 'center', fontSize: 24 }));
		}
	},

	onUserMediaError: function(error) {
		// user refuse access, close the dialog
		this.close();
	},
	
	onLocalVideoReady: function() {
		var nw = this.localVideo.getNaturalWidth();
		var nh = this.localVideo.getNaturalHeight();
		if(nw > nh) {
			this.localVideo.setWidth(100);
			this.localVideo.setHeight(nh*100/nw);
		}
		else {
			this.localVideo.setHeight(100);
			this.localVideo.setWidth(nw*100/nh);
		}
	},
	
	onQueueOpen: function() {
		if(this.isCaller)
			// send a message to the contact			
			this.user.sendMessage(this.contact, this.channel, 'call');
		else
			this.queue.sendMessage({ 'user': this.user.getId(), 'event': 'accept' });
	},
	
	onQueueClose: function() {
	},
	
	onQueueMessage: function(queue, msg) {
		if(msg.user === this.user.getId())
			return;
	
		console.log('onQueueMessage contact: '+this.contact.getId());
		console.log(msg);
	
		if(msg.event === 'accept') {
			console.log('contact accept');
			// remote user accept the call, create the PeerConnection
			this.createPeerConnection();
			// create an offer
			var scope = this;
			this.peerConnection.createOffer(function(desc) {
				scope.onGotDescription.call(scope, desc);
			}, function(error) {
				console.log('createOffer ERROR');
				console.log(error);
			});
		}
		else if(msg.event === 'sdp') {
			if(this.peerConnection === undefined)
				this.createPeerConnection();
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
			var scope = this;
            this.peerConnection.createAnswer(function(desc) {
				scope.onGotDescription.call(scope, desc);
			}, function(error) {
				console.log('createAnswer ERROR');
				console.log(error);
			});
		}
		else if((msg.event === 'candidate') && (msg.candidate !== null)) {
			if(this.peerConnection === undefined)
				this.createPeerConnection();
			this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
		}
	},
	
	onGotDescription: function(desc) {
		this.peerConnection.setLocalDescription(desc);
		this.queue.sendMessage({ 'user': this.user.getId(), 'event': 'sdp', 'sdp': desc });
	},
	
	createPeerConnection: function() {
		// use mozilla's stun servers
		var configuration = {"iceServers":[{'url':'stun:stun.services.mozilla.com'}]};
//		var configuration = {"iceServers":[{'url':'stun:192.168.0.245:3478'}]};
		var constraints = { 'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};

		this.peerConnection = new RTCPeerConnection(configuration, constraints);
		this.peerConnection.addStream(this.localStream);
		var scope = this;
		// send any ice candidates to the other peer
    	this.peerConnection.onicecandidate = function(evt) {
			scope.queue.sendMessage({ 'user': scope.user.getId(), 'event': 'candidate', 'candidate': evt.candidate });
	    };
	    // once remote stream arrives, show it in the remote video element
		this.peerConnection.onaddstream = function(evt) {
			scope.buildRemoteVideo();
			scope.remoteStream = evt.stream;
			scope.remoteVideo.setSrc(evt.stream);
	    };
	    // if remote stream removed, close
		this.peerConnection.onremovestream = function(evt) {
			console.log('onremovestream');
			scope.remoteStream = null;
			scope.close();
	    };
	},
	
	onVideoConfUnload: function() {
		// stop using the local video stream when the dialog is unloaded
		if(this.localStream !== undefined) {
			this.localStream.stop();
			this.localStream = undefined;
		}
		// stop the queue
		if(this.queue !== undefined) {
			this.queue.close();
			this.queue = undefined;
		}
	}
});
