
Ui.LBox.extend('Wn.VideoConfView', {
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
	hasAccepted: false,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);

		if('message' in config) {
			this.message = config.message;
			delete(config.message);
		}
	},

	findParentDialog: function() {
		var parent = this.getParent();
		while((parent !== undefined) && !Ui.Dialog.hasInstance(parent)) {
			parent = parent.getParent();
		}
		return parent;
	},

	buildUi: function() {
		if(this.message !== undefined) {
			this.channel = this.message.content;
			this.isCaller = false;

			var vbox = new Ui.VBox({ spacing: 10, margin: 20, verticalAlign: 'center' });
			this.setContent(vbox);

			var image = new Ui.Image({ width: 128, height: 128, horizontalAlign: 'center', src: this.contact.getFaceUrl() });
			vbox.append(image);

			var text = new Ui.Text({ textAlign: 'center',
				text: 'Vous avez un appel vidéo de '+this.contact.getName()
			});
			vbox.append(text);

			var hbox = new Ui.HBox({ uniform: true, horizontalAlign: 'center', spacing: 10 });
			
			var denyButton = new Wn.AlertButton({ text: 'Refuser' });
			hbox.append(denyButton);
			var allowButton = new Ui.DefaultButton({ text: 'Accepter' });
			hbox.append(allowButton);
			
			vbox.append(hbox);

			// connect to the queue
			this.queue = new Wn.Queue({ channel: this.channel });
			this.connect(this.queue, 'open', this.onQueueOpen);
			this.connect(this.queue, 'close', this.onQueueClose);
			this.connect(this.queue, 'message', this.onQueueMessage);

			this.connect(denyButton, 'press', function() {
				this.queue.sendMessage({ 'user': this.user.getId(), 'event': 'reject' });
				var dialog = this.findParentDialog();
				if(dialog !== undefined)
					dialog.close();
			});
			this.connect(allowButton, 'press', function() {
				this.hasAccepted = true;
				this.buildVideoUi();
			});
		}
		else {
			if(!navigator.supportWebRTC) {
				this.setContent(new Ui.Text({
					verticalAlign: 'center',
					margin: 10, textAlign: 'center',
					text: 'Votre navigateur Web ne supporte pas cette fonctionnalitée.'+
					' Pour passer un appel vidéo, votre navigateur doit gérer le protocole WebRTC.'
				}));
			}
			else {
				if(this.contact.getIsOnline())
					this.buildVideoUi();
				else
					this.setContent(new Ui.Text({
						verticalAlign: 'center',
						margin: 10, textAlign: 'center',
						text: 'Votre interlocuteur n\'est pas connecté pour le moment.'+
						' Il doit être connecté pour pouvoir passer un appel vidéo.'
					}));
			}
		}
	},

	buildRemoteVideo: function() {
		this.remoteVideo = new Ui.Video({ autoplay: true });
		this.remoteBox.setContent(this.remoteVideo);
	},

	buildVideoUi: function() {				
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
			this.remoteBox.setContent(new Ui.Text({ text: 'Appel en cours...',
				margin: 10, textAlign: 'center', verticalAlign: 'center', fontSize: 24 }));
			this.queue.sendMessage({ 'user': this.user.getId(), 'event': 'accept' });
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
	},
	
	onQueueClose: function() {
		console.log(this+'.onQueueClose');
		this.setContent(new Ui.Text({
			textAlign: 'center', margin: 10, verticalAlign: 'center',
			text: 'Votre interlocuteur a mis fin à cet appel vidéo'
		}));
	},
	
	onQueueMessage: function(queue, msg) {
//		if(msg.user === this.user.getId())
//			return;
	
		console.log('onQueueMessage contact: '+this.contact.getId());
		console.log(msg);
	
		if(msg.event === 'reject') {
			if(this.isCaller) {
				this.setContent(new Ui.Text({
					textAlign: 'center', margin: 10, verticalAlign: 'center',
					text: 'Votre interlocuteur refuser cet appel vidéo'
				}));
			}
			else {
				var dialog = this.findParentDialog();
				if(dialog !== undefined)
					dialog.close();
			}
		}
		else if(msg.event === 'accept') {
			if(this.isCaller) {
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
			else if(!this.hasAccepted) {
				var dialog = this.findParentDialog();
				if(dialog !== undefined)
					dialog.close();
			}
		}
		else if((msg.event === 'sdp') && (msg.user !== this.user.getId())) {
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
		else if((msg.event === 'candidate') && (msg.candidate !== null) && (msg.user !== this.user.getId())) {
			if(this.peerConnection === undefined)
				this.createPeerConnection();
			this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
		}
		else if(msg.event === 'end') {
			if(!this.isCaller && !this.hasAccepted) {
				var dialog = this.findParentDialog();
				if(dialog !== undefined)
					dialog.close();
			}
			if(this.queue !== undefined) {
				this.queue.close();
				this.queue = undefined;
			}
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
	}
}, {
	onLoad: function() {
		Wn.VideoConfView.base.onLoad.apply(this, arguments);
		this.buildUi();
	},

	onUnload: function() {
		Wn.VideoConfView.base.onUnload.apply(this, arguments);

		// stop using the local video stream when the dialog is unloaded
		if(this.localStream !== undefined) {
			this.localStream.stop();
			this.localStream = undefined;
		}
		// stop the queue
		if(this.queue !== undefined) {
			if(this.hasAccepted || this.isCaller)
				this.queue.sendMessage({ 'user': this.user.getId(), 'event': 'end' });
			this.queue.close();
			this.queue = undefined;
		}
	}
});
