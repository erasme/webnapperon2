
Ui.Pressable.extend('Wn.MessageView', {
	user: undefined,
	message: undefined,
	contact: undefined,
	comment: undefined,
	contactface: undefined,
	previewBox: undefined,
	label: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.message = config.message;
		delete(config.message);

		this.append(new Wn.ContentBgGraphic({ color: '#7e1967' }));

		var hbox = new Ui.HBox();
		this.append(hbox);

		this.label = new Ui.CompactLabel({ margin: 10, marginRight: 0, width: 142, height: 40, fontSize: 20, maxLine: 2, color: '#f1f1f1' });
		hbox.append(this.label, true);

		var lbox2 = new Ui.LBox({ verticalAlign: 'top', horizontalAlign: 'right', margin: 8 });
		hbox.append(lbox2);

		var lbox = new Ui.LBox({ verticalAlign: 'top', marginTop: 8, marginLeft: 8 });
		lbox2.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.contact = Wn.Contact.getContact(this.message.getOrigin());

		this.contactface = new Ui.Image({ width: 32, height: 32, margin: 1, src: this.contact.getFaceUrl() });
		lbox.append(this.contactface);

		var iconName = 'bubble';
		if(this.message.getType() == 'resource')
			iconName = 'resource';
		else if(this.message.getType() == 'contact')
			iconName = 'person';
		else if(this.message.getType() == 'comment')
			iconName = 'resource-comment';

		var icon = new Ui.DualIcon({ width: 24, height: 24, icon: iconName, verticalAlign: 'top', horizontalAlign: 'left' });
		lbox2.append(icon);

		this.displayContent();
		this.connect(this, 'press', this.onMessageViewPress);
	},

	getMessage: function() {
		return this.message;
	},

	onMessageViewPress: function() {
		this.message.markSeen();

		if(this.message.getType() == 'contact')
			Ui.App.current.setMainPath('user:'+this.contact.getId());
		else if(this.message.getType() == 'resource')
			Ui.App.current.setMainPath('resource:'+this.message.getContent().id);
		else if(this.message.getType() == 'comment')
			Ui.App.current.setMainPath('resource:'+this.message.getContent().resource.id+':'+this.message.getContent().file);
		else {
			var dialog = new Wn.ContactMessagesDialog({ user: this.user, contact: this.contact });
			dialog.open();
		}
	},

	displayContent: function() {
		if(this.message.getType() == 'message')
			this.label.setText(this.message.getContent());
		else if(this.message.getType() == 'contact')
			this.label.setText('Vous a ajouté à ses contacts');
		else if(this.message.getType() == 'resource')
			this.label.setText(this.message.getContent().name);
		else if(this.message.getType() == 'comment')
			this.label.setText(this.message.getContent().text);
	}
});

