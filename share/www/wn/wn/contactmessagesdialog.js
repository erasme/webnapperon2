
Ui.LBox.extend('Wn.ContactNewMessage', {
	user: undefined,
	contact: undefined,
	userface: undefined,
	textfield: undefined,
	sendButton: undefined,
	text: undefined,
	request: undefined,
	vbox: undefined,

	constructor: function(config) {
		this.addEvents('new');

		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		//this.append(new Wn.ContentBgGraphic());

		var vbox = new Ui.VBox();
		this.vbox = vbox;
		this.append(vbox);

		var hbox = new Ui.HBox({ spacing: 5 });
		vbox.append(hbox, true);

		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 0 });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.userface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.userface);

		this.textfield = new Ui.TextAreaField({ margin: 0, marginLeft: 0, textHolder: 'Un message ?' });
		this.connect(this.textfield.textarea, 'focus', this.onTextAreaFocus);
		this.connect(this.textfield.textarea, 'blur', this.onTextAreaBlur);
		this.connect(this.textfield, 'change', function(textfield, value) {
			if(value == '')
				this.sendButton.disable();
			else
				this.sendButton.enable();
		});
		hbox.append(this.textfield, true);

		this.sendButton = new Ui.DefaultButton({ text: 'Envoyer', horizontalAlign: 'right', marginBottom: 10, marginRight: 10 });
		this.sendButton.disable();
		//vbox.append(this.sendButton);
		this.connect(this.sendButton, 'press', this.onButtonPress);
	},

	onTextAreaFocus: function() {
		if(this.sendButton.getParent() == undefined)
			this.vbox.append(this.sendButton);
	},

	onTextAreaBlur: function() {
		if((this.sendButton.getParent() !== undefined) && (this.textfield.getValue() === ''))
			this.vbox.remove(this.sendButton);
	},

	onUserChange: function() {
		if(this.user.getFaceUrl() != undefined)
			this.userface.setSrc(this.user.getFaceUrl());
	},

	onButtonPress: function() {
		this.text = this.textfield.getValue();
		this.request = this.user.sendMessage(this.contact, this.text);
		this.connect(this.request, 'done', this.onRequestDone);
		this.connect(this.request, 'error', this.onRequestError);
		this.disable();
	},

	onRequestDone: function() {
		console.log(this+'.onRequestDone');
		this.fireEvent('new', this, this.text);
		this.textfield.setValue('');
		this.enable();
		this.request = undefined;
	},

	onRequestError: function() {
		console.log(this+'.onRequestError');

		this.textfield.setValue('');
		this.enable();
		// TODO: signal error while sending
		this.request = undefined;
	}
}, {
	onLoad: function() {
		Wn.ContactNewMessage.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		Wn.ContactNewMessage.base.onUnload.call(this);
		
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.Pressable.extend('Wn.UserMessageView', {
	user: undefined,
	sourceFace: undefined,
	message: undefined,
	dialog: undefined,
	destinationFace: undefined,
	contact: undefined,
	previewBox: undefined,
	label: undefined,
	dateLabel: undefined,
	showDestination: true,
	showSource: true,
	source: undefined,
	destination: undefined,
	bg: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.message = config.message;
		delete(config.message);
		if('dialog' in config) {
			this.dialog = config.dialog;
			delete(config.dialog);
		}
		if('showSource' in config) {
			this.showSource = config.showSource;
			delete(config.showSource);
		}
		if('showDestination' in config) {
			this.showDestination = config.showDestination;
			delete(config.showDestination);
		}

		if(this.message.getOrigin() === this.user.getId())
			this.source = this.user;
		else
			this.source = Wn.Contact.getContact(this.message.getOrigin());

		if(this.message.getDestination() === this.user.getId())
			this.destination = this.user;
		else
			this.destination = Wn.Contact.getContact(this.message.getDestination());
		
		this.bg = new Ui.Rectangle();
		this.append(this.bg);

//		this.append(new Wn.ContentBgGraphic());

		var hbox = new Ui.HBox({ spacing: 10 });
		this.append(hbox);
		
		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right' });
//		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 0}));

		this.sourceFace = new Ui.Image({ width: 32, height: 32, margin: 0 });
		lbox.append(this.sourceFace);

		if(this.showSource)
			hbox.append(lbox);

		var vbox = new Ui.VBox({ spacing: 5 });
		hbox.append(vbox, true);

		var deltaStr;
		if(this.source === this.user)
			deltaStr = 'Moi, ';
		else
			deltaStr = this.source.getName()+', ';

		var delta = new Date() - this.message.getDate();
		if(delta < 3600*24*7) {
			var days = Math.floor(delta / (1000 * 60 * 60 * 24));
			var hours = Math.floor(delta / (1000 * 60 * 60));
			var minutes = Math.floor(delta / (1000 * 60));
			deltaStr += 'il y a ';
			if(days > 0)
				deltaStr += days+' jours';
			else if(hours > 0)
				deltaStr += hours+' heures';
			else
				deltaStr += minutes+' minutes';
		}
		else {
			deltaStr += 'le ';
			var createDate = this.message.getDate();
			deltaStr += (createDate.getDate()-1)+'/'+(createDate.getMonth()+1)+'/'+createDate.getFullYear();
		}

		this.dateLabel = new Ui.Text({ opacity: 0.8, fontSize: 10, textAlign: 'left', text: deltaStr });
		vbox.append(this.dateLabel);

		if((this.message.getType() === 'message') || (this.message.getType() === 'comment'))
			this.label = new Wn.ImprovedText({ text: '' });
		else
			this.label = new Ui.Text({ text: '' });

		vbox.append(this.label);

		if(this.message.getType() === 'message')
			this.label.setText(this.message.getContent());
				
		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right' });
//		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 0 }));
		this.destinationFace = new Ui.Image({ width: 32, height: 32, margin: 0 });
		lbox.append(this.destinationFace);

		if(this.showDestination)
			hbox.append(lbox);
		
		this.setLock((this.message.getType() !== 'contact') && (this.message.getType() !== 'resource') && (this.message.getType() !== 'comment'));

		this.connect(this, 'press', this.onMessageViewPress);
		
		if(this.message.getType() == 'comment') {
			this.resource = Wn.Resource.getResource(this.message.getContent().resource.id, this.user);
		}
	},

	setAllowMessage: function(allow) {
		if(allow)
			this.setLock(false);
		else
			this.setLock(this.message.getType() === 'message');
	},

	onBothReady: function() {
		var str;
		if(this.message.getOrigin() === this.user.getId()) {
			
			var dst = this.destination.getName()+' ';
			str = "J'ai ";
			if(this.message.getType() === 'resource')
				str += 'partagé la ressouce "'+this.message.getContent().name+'" avec '+dst;
			else if(this.message.getType() === 'contact')
				str += 'ajouté '+dst+' à mes contacts';
			else if(this.message.getType() === 'comment')
				str += 'laissé un commentaire sur la ressource "'+this.message.getContent().resource.name+'"';
			else if(this.message.getType() === 'call')
				str += 'passé un appel vidéo à '+dst;
			else
				str = this.message.getContent();
		}
		else {
			str = this.source.getName()+' ';
			if(this.message.getType() === 'resource')
				str += 'vous a partagé la ressouce "'+this.message.getContent().name+'"';
			else if(this.message.getType() == 'contact')
				str += 'vous a ajouté à ses contacts';
			else if(this.message.getType() == 'comment')
				str += 'à laissé un commentaire sur la ressource "'+this.message.getContent().resource.name+'"';
			else if(this.message.getType() === 'call')
				str += 'vous a appelé en vidéo';
			else
				str = this.message.getContent();
		}
		this.label.setText(str);
	},

	onDestinationChange: function() {
		if(this.destination.getFaceUrl() !== undefined)
			this.destinationFace.setSrc(this.destination.getFaceUrl());
		if(this.source.getIsReady())
			this.onBothReady();
	},

	onMessageViewPress: function() {
		this.message.markSeen();
		if(this.message.getType() == 'message') {
			var dialog = new Wn.ContactMessagesDialog({ user: this.user, contact: this.source });
			dialog.open();
		}
		else if(this.message.getType() == 'resource') {
			Ui.App.current.setMainPath('resource:'+this.message.getContent().id);
			if((this.dialog !== undefined) && Ui.Dialog.hasInstance(this.dialog))
				this.dialog.close();
		}
		else if(this.message.getType() == 'comment') {
			Ui.App.current.setMainPath('resource:'+this.message.getContent().resource.id+':'+this.message.getContent().file);
			if((this.dialog !== undefined) && Ui.Dialog.hasInstance(this.dialog))
				this.dialog.close();
		}
		else if(this.message.getType() == 'contact') {
			Ui.App.current.setMainPath('user:'+this.message.getContent());
			if((this.dialog !== undefined) && Ui.Dialog.hasInstance(this.dialog))
				this.dialog.close();
		}
	},
	
	onSourceChange: function() {
		if(this.source.getFaceUrl() !== undefined)
			this.sourceFace.setSrc(this.source.getFaceUrl());
		if(this.destination.getIsReady())
			this.onBothReady();
	},

	getMessage: function() {
		return this.message;
	},

	getSearchText: function() {
		return this.dateLabel.getText()+' '+this.label.getText();
	}
}, {
	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
	},

	onLoad: function() {
		Wn.UserMessageView.base.onLoad.apply(this, arguments);

		if(this.source !== undefined) {
			if(this.source.getIsReady())
				this.onSourceChange();
			this.connect(this.source, 'change', this.onSourceChange);
		}

		if(this.destination !== undefined) {
			if(this.destination.getIsReady())
				this.onDestinationChange();
			this.connect(this.destination, 'change', this.onDestinationChange);
		}
	},
	
	onUnload: function() {
		Wn.UserMessageView.base.onUnload.apply(this, arguments);

		if(this.source !== undefined)
			this.disconnect(this.source, 'change', this.onSourceChange);

		if(this.destination !== undefined)		
			this.disconnect(this.destination, 'change', this.onDestinationChange);
	}
}, {
	style: {
		background: 'rgba(250, 250, 250, 0)'
	}
});

Ui.Dialog.extend('Wn.ContactMessagesDialog', {
	user: undefined,
	contact: undefined,
	message: undefined,
	messagesView: undefined,
	startMessageId: -1,
	messageRequest: undefined,
	messages: undefined,
	transBox: undefined,
	messagesPart: undefined,
	videoconfPart: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		if('message' in config) {
			this.message = config.message;
			delete(config.message);
		}

		this.setFullScrolling(false);
		this.setTitle('Messages');
		this.setPreferredWidth(600);
		this.setPreferredHeight(600);

		this.setCancelButton(new Ui.DialogCloseButton());

		this.transBox = new Ui.TransitionBox();
		this.setContent(this.transBox);

		this.messagesPart = new Ui.ScrollingArea();

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.messagesPart.setContent(vbox);

		vbox.append(new Wn.ContactNewMessage({ user: this.user, contact: this.contact }));

		this.messagesView = new Ui.VBox({ spacing: 15 });
		vbox.append(this.messagesView);

		var segmentbar = new Ui.SegmentBar({
			field: 'text', data: [
				{ text: 'Texte', type: 'text' }, { text: 'Appel vidéo', type: 'video' }
			]
		});
		this.setActionButtons([ segmentbar ]);
		this.connect(segmentbar, 'change', this.onSegmentBarChange);

		if(this.message !== undefined)
			segmentbar.setCurrentPosition(1);
		else
			segmentbar.setCurrentPosition(0);
		
		this.updateMessages();
	},

	onSegmentBarChange: function(segmentbar, data) {
		if(data.type === 'video') {
			if(this.message !== undefined)
				this.transBox.replaceContent(new Wn.VideoConfView({ user: this.user, contact: this.contact, message: this.message }));
			else
				this.transBox.replaceContent(new Wn.VideoConfView({ user: this.user, contact: this.contact }));
		}
		else {
			this.transBox.replaceContent(this.messagesPart);
		}
	},

	updateMessages: function() {
		if(this.messagesRequest !== undefined) {
			this.disconnect(this.messagesRequest, 'done', this.onGetMessagesDone);
			this.disconnect(this.messagesRequest, 'error', this.onGetMessagesError);
			this.messagesRequest.abort();
		}
		this.messagesRequest = new Core.HttpRequest({ url: '/cloud/message?limit=100&user='+this.user.getId()+'&with='+this.contact.getId() });
		this.connect(this.messagesRequest, 'done', this.onGetMessagesDone);
		this.connect(this.messagesRequest, 'error', this.onGetMessagesError);
		this.messagesRequest.send();
	},
	
	onGetMessagesDone: function() {
		var json = this.messagesRequest.getResponseJSON();
		this.messages = [];
		for(var i = 0; i < json.length; i++) {
			this.messages.push(new Wn.Message({ message: json[i] }));
		}
		this.updateMessagesView();
		this.messagesRequest = undefined;
	},
	
	onGetMessagesError: function() {
		this.messagesRequest = undefined;
	},
	
	findMessageView: function(message) {
		for(var i = 0; i < this.messagesView.getChildren().length; i++) {
			if(Wn.UserMessageView.hasInstance(this.messagesView.getChildren()[i]) &&
			   this.messagesView.getChildren()[i].getMessage().getId() == message.getId())
				return this.messagesView.getChildren()[i];
		}
		return undefined;
	},

	updateMessagesView: function() {
		if(this.messages === undefined)
			return;

		var markMessages = [];
		var all = this.messages;

		var currentDate;
		for(var i = all.length-1; i >= 0; i--) {

			// handle time markers
			var marker = undefined;
			var createDate = all[i].getDate();
			if(currentDate === undefined) {
			}
			// year marker
			else if(currentDate.getFullYear() != createDate.getFullYear()) {
				marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Label({ text: currentDate.getFullYear(), fontSize: 14, fontWeight: 'bold' }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
			}
			// month marker
			else if(currentDate.getMonth() != createDate.getMonth()) {
				marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Separator({ verticalAlign: 'center', width: 10 }));
				var monthNames = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];
				marker.append(new Ui.Label({ text: monthNames[currentDate.getMonth()], fontSize: 12 }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
			}
			currentDate = createDate;

			if(all[i].getType() == 'comment')
				continue;

			if(all[i].getOrigin() === this.user.getId()) {
				if(all[i].getDestination() == this.contact.getId()) {
					var view = this.findMessageView(all[i]);
					if(view == undefined) {
						if(marker !== undefined)
							this.messagesView.prepend(marker);
						view = new Wn.UserMessageView({
							user: this.user, message: all[i], dialog: this,
							showDestination: false
						});
						this.messagesView.prepend(view);
					}
				}
			}
			else if(all[i].getOrigin() === this.contact.getId()) {
				var view = this.findMessageView(all[i]);
				if(view == undefined) {
					if(marker !== undefined)
						this.messagesView.prepend(marker);
					view = new Wn.UserMessageView({
						user: this.user, message: all[i], dialog: this,
						showDestination: false
					});
					this.messagesView.prepend(view);
					if(!all[i].getSeen() && (all[i].getType() === 'message'))
						markMessages.push(all[i]);
				}
			}
		}
		for(var i = 0; i < markMessages.length; i++)
			markMessages[i].markSeen();
	},

	onMessagesChange: function() {
		if(this.messages === undefined)
			return;
		var userMessages = this.user.getMessages();
		for(var i = userMessages.length-1; i >= 0 ; i--) {
			var userMessage = userMessages[i];
			var found = undefined;
			for(var i2 = 0; (found === undefined) && (i2 < this.messages.length); i2++) {
				if(this.messages[i2].getId() === userMessage.getId())
					found = this.messages[i2];
			}
			if(found === undefined)
				this.messages.unshift(userMessage);
		}
		this.updateMessagesView();
	}
}, {
	onLoad: function() {
		Wn.ContactMessagesDialog.base.onLoad.apply(this, arguments);
		this.connect(this.user, 'messageschange', this.onMessagesChange);
	},

	onUnload: function() {
		Wn.ContactMessagesDialog.base.onUnload.apply(this, arguments);
		this.disconnect(this.user, 'messageschange', this.onMessagesChange);
	}
});
