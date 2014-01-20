
Ui.Dialog.extend('Wn.HistoryMessagesDialog', {
	user: undefined,
	contact: undefined,
	messagesView: undefined,
	startMessageId: -1,
	messageRequest: undefined,
	messages: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.setFullScrolling(true);
		this.setTitle('Messages');
		this.setPreferedWidth(600);
		this.setPreferedHeight(600);

		var button = new Ui.Button({ text: 'Fermer' });
		this.connect(button, 'press', function() { this.close() });
		this.setCancelButton(button);

		var vbox = new Ui.VBox({ margin: 10, spacing: 10 });
		this.setContent(vbox);

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
		this.messagesRequest = new Core.HttpRequest({ url: '/cloud/message?limit=500&user='+this.user.getId() });
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

			if(all[i].getType() == 'comment')
				continue;

			// handle time markers
			var createDate = all[i].getDate();
			if(currentDate === undefined) {
			}
			// year marker
			else if(currentDate.getFullYear() != createDate.getFullYear()) {
				var marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Label({ text: currentDate.getFullYear(), fontSize: 14, fontWeight: 'bold' }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
				this.messagesView.prepend(marker);
			}
			// month marker
			else if(currentDate.getMonth() != createDate.getMonth()) {
				var marker = new Ui.HBox({ spacing: 10 });
				marker.append(new Ui.Separator({ verticalAlign: 'center', width: 10 }));
				var monthNames = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];
				marker.append(new Ui.Label({ text: monthNames[currentDate.getMonth()], fontSize: 12 }));
				marker.append(new Ui.Separator({ verticalAlign: 'center' }), true);
				this.messagesView.prepend(marker);
			}
			currentDate = createDate;

			if(all[i].getOrigin() == this.user.getId()) {
				var view = this.findMessageView(all[i]);
				if(view == undefined) {
					view = new Wn.UserMessageView({ user: this.user, message: all[i], marginRight: 80, dialog: this });
					this.messagesView.prepend(view);
				}
			}
			else {
				var view = this.findMessageView(all[i]);
				if(view == undefined) {
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
