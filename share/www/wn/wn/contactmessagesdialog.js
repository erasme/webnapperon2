
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

		this.append(new Wn.ContentBgGraphic());

		var vbox = new Ui.VBox();
		this.vbox = vbox;
		this.append(vbox);

		var hbox = new Ui.HBox();
		vbox.append(hbox, true);

		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 8 });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.userface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.userface);

		this.textfield = new Ui.TextAreaField({ margin: 10, marginLeft: 0, textHolder: 'Un message ?' });
		this.connect(this.textfield.textarea, 'focus', this.onTextAreaFocus);
		this.connect(this.textfield.textarea, 'blur', this.onTextAreaBlur);
		this.connect(this.textfield, 'change', function(textfield, value) {
			if(value == '')
				this.sendButton.disable();
			else
				this.sendButton.enable();
		});
		hbox.append(this.textfield, true);

		this.sendButton = new Ui.Button({ text: 'Envoyer', horizontalAlign: 'right', marginBottom: 10, marginRight: 10 });
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

		this.request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/message',
			content: JSON.stringify({ content: this.text, type: 'message', origin: this.user.getId(), destination: this.contact.getId() })
		});
		this.connect(this.request, 'done', this.onRequestDone);
		this.connect(this.request, 'error', this.onRequestError);
		this.request.send();

		// ask for a message update for low speed network
		// with websocket problems
		this.user.updateMessages();

		this.disable();
	},

	onRequestDone: function() {
		this.fireEvent('new', this, this.text);
		this.textfield.setValue('');
		this.enable();
		this.request = undefined;
	},

	onRequestError: function() {
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
	userface: undefined,
	message: undefined,
	dialog: undefined,
	contactface: undefined,
	contact: undefined,
	previewBox: undefined,
	label: undefined,
	dateLabel: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.message = config.message;
		delete(config.message);
		if('dialog' in config) {
			this.dialog = config.dialog;
			delete(config.dialog);
		}

		this.append(new Wn.ContentBgGraphic());

		var vbox = new Ui.VBox();
		this.append(vbox);

		var hbox = new Ui.HBox();
		vbox.append(hbox);
		
		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 8 });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.userface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.userface);

		if((this.message.getType() === 'message') || (this.message.getType() === 'comment'))
			this.label = new Wn.ImproveText({ margin: 10, marginRight: 0, text: '' });
		else
			this.label = new Ui.Text({ margin: 10, marginRight: 0, text: '' });

		hbox.append(this.label, true);

		if(this.message.getType() == 'message')
			this.label.setText(this.message.getContent());

		if(this.message.getOrigin() === this.user.getId())
			this.contact = Wn.Contact.getContact(this.message.getDestination());
		else
			this.contact = Wn.Contact.getContact(this.message.getOrigin());

		var lbox = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 8 });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.contactface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.contactface);

		this.contactface.setSrc(this.contact.getFaceUrl());

		var delta = new Date() - this.message.getDate();
		var days = Math.floor(delta / (1000 * 60 * 60 * 24));
		var hours = Math.floor(delta / (1000 * 60 * 60));
		var minutes = Math.floor(delta / (1000 * 60));
		var deltaStr = 'il y a ';
		if(days > 0)
			deltaStr += days+' jours';
		else if(hours > 0)
			deltaStr += hours+' heures';
		else
			deltaStr += minutes+' minutes';

		this.dateLabel = new Ui.Label({ opacity: 0.8, fontSize: 10, horizontalAlign: 'left', marginLeft: 8, marginBottom: 8, text: deltaStr });
		vbox.append(this.dateLabel);

		this.setLock((this.message.getType() !== 'contact') && (this.message.getType() !== 'resource') && (this.message.getType() !== 'comment'));

		this.connect(this, 'press', this.onMessageViewPress);
		
		if(this.message.getType() == 'comment') {
			var resourceAndPath = this.user.getResourceAndPathFromData(this.message.getContent());
			this.resource = resourceAndPath.resource;
		}
	},

	onContactChange: function() {
		var str;
		if(this.message.getOrigin() == this.user.getId()) {
			var dst = this.contact.getFirstname()+' '+this.contact.getLastname()+' ';
			str = "Vous avez ";
			if(this.message.getType() == 'resource')
				str += 'partagé la ressouce "'+this.message.getContent().name+'" avec '+dst;
			else if(this.message.getType() == 'contact')
				str += 'ajouté '+dst+' à vos contacts';
			else if(this.message.getType() == 'comment')
				str += ' laissé un commentaire sur la ressource "'+this.message.getContent().resource.name+'"';
			else
				str = this.message.getContent();
		}
		else {
			str = this.contact.getFirstname()+' '+this.contact.getLastname()+' ';
			if(this.message.getType() == 'resource')
				str += 'vous a partagé la ressouce "'+this.message.getContent().name+'"';
			else if(this.message.getType() == 'contact')
				str += 'vous a ajouté à ses contacts';
			else if(this.message.getType() == 'comment')
				str += 'à laissé un commentaire sur la ressource "'+this.message.getContent().resource.name+'"';
			else
				str = this.message.getContent();
		}
		this.label.setText(str);
	},

	onMessageViewPress: function() {
		if(this.message.getType() == 'resource') {
			Ui.App.current.setMainPath('resource:'+this.message.getContent().id);
			if(this.dialog !== undefined)
				this.dialog.close();
		}
		else if(this.message.getType() == 'comment') {
			var resourceAndPath = this.user.getResourceAndPathFromData(this.message.getContent());
			if(resourceAndPath.resource != undefined) {
				Ui.App.current.setMainPath('resource:'+resourceAndPath.resource.getId()+':'+resourceAndPath.path);
				if(this.dialog !== undefined)
					this.dialog.close();
			}
		}
		else if(this.message.getType() == 'contact') {
			Ui.App.current.setMainPath('user:'+this.contact.getId());
			if(this.dialog !== undefined)
				this.dialog.close();
		}
	},
	
	onUserChange: function() {
		if(this.user.getFaceUrl() != undefined)
			this.userface.setSrc(this.user.getFaceUrl());
	},

	getMessage: function() {
		return this.message;
	}
}, {
	onLoad: function() {
		Wn.UserMessageView.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
		
		if(this.contact != undefined) {
			if(this.contact.getIsReady())
				this.onContactChange();
			this.connect(this.contact, 'change', this.onContactChange);
		}
	},
	
	onUnload: function() {
		Wn.UserMessageView.base.onUnload.call(this);

		this.disconnect(this.user, 'change', this.onUserChange);

		if(this.contact != undefined)		
			this.disconnect(this.contact, 'change', this.onContactChange);
	}
});

Ui.Dialog.extend('Wn.ContactMessagesDialog', {
	user: undefined,
	contact: undefined,
	messagesView: undefined,
	startMessageId: -1,
	messageRequest: undefined,
	messages: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.contact = config.contact;
		delete(config.contact);

		this.setFullScrolling(true);
		this.setTitle('Messages');
		this.setPreferedWidth(600);
		this.setPreferedHeight(600);

		var button = new Ui.Button({ text: 'Fermer' });
		this.connect(button, 'press', function() { this.close() });
		this.setCancelButton(button);

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.setContent(vbox);

		vbox.append(new Wn.ContactNewMessage({ user: this.user, contact: this.contact, marginRight: 80 }));

		this.messagesView = new Ui.VBox({ spacing: 10 });
		vbox.append(this.messagesView);

		this.messages = [];

		this.connect(this, 'visible', this.onViewVisible);
		this.connect(this, 'hidden', this.onViewHidden);
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

	onViewVisible: function() {
		this.connect(this.user, 'messageschange', this.updateMessages);
		this.updateMessages();
	},

	onViewHidden: function() {
		this.disconnect(this.user, 'messageschange', this.updateMessages);
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

			if(all[i].getOrigin() == this.user.getId()) {
				if(all[i].getDestination() == this.contact.getId()) {
					var view = this.findMessageView(all[i]);
					if(view == undefined) {
						if(marker !== undefined)
							this.messagesView.prepend(marker);
						view = new Wn.UserMessageView({ user: this.user, message: all[i], marginRight: 80, dialog: this });
						this.messagesView.prepend(view);
					}
				}
			}
			else if(all[i].getOrigin() == this.contact.getId()) {
				var view = this.findMessageView(all[i]);
				if(view == undefined) {
					if(marker !== undefined)
						this.messagesView.prepend(marker);
					view = new Wn.UserMessageView({ user: this.user, marginLeft: 80, message: all[i], dialog: this });
					this.messagesView.prepend(view);
					if(!all[i].getSeen())
						markMessages.push(all[i]);
				}
			}
		}
		for(var i = 0; i < markMessages.length; i++)
			markMessages[i].markSeen();
	}
});
