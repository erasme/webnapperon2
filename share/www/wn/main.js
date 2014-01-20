
Ui.LBox.extend('Wn.Error', {
	delay: undefined,

	constructor: function(config) {
		this.setContent(new Ui.Text({
			text: 'La ressource recherchée n\'a pas été trouvée',
			margin: 20, fontSize: 20,
			verticalAlign: 'center', textAlign: 'center'
		}));
	},

	onTimeout: function() {
		Ui.App.current.setMainPath('');
	}
}, {
	onVisible: function() {
		if(this.delay != undefined)
			this.delay.abort();
		this.delay = new Core.DelayedTask({ scope: this, callback: this.onTimeout, delay: 5 });
	},

	onHidden: function() {
		if(this.delay != undefined) {
			this.delay.abort();
			this.delay = undefined;
		}
	}
});

Ui.LBox.extend('Wn.MenuUser', {
	user: undefined,
	image: undefined,
	msglabel: undefined,
	uploaders: undefined,
	progressbox: undefined,
	progressbar: undefined,
	progresscounter: undefined,
	arrow: undefined,

	constructor: function(config) {
		this.uploaders = [];

		var pressable = new Ui.Pressable();
		this.setContent(pressable);
		this.connect(pressable, 'press', this.onPress);

		var vbox = new Ui.VBox();
		pressable.setContent(vbox);

		var lbox = new Ui.LBox();
		vbox.append(lbox);

		this.arrow = new Wn.ContactArrow({ width: 10, height: 20, verticalAlign: 'center', horizontalAlign: 'left' });
		this.arrow.hide();
		lbox.append(this.arrow);
		
		var icon = new Ui.Icon({ icon: 'home', width: 64, height: 64, fill: '#f1f1f1', margin: 3, horizontalAlign: 'center' });
		lbox.append(icon);

		this.progressbox = new Ui.HBox({ margin: 10, verticalAlign: 'bottom', horizontalAlign: 'center', spacing: 2 });
		this.progressbox.hide();
		lbox.append(this.progressbox);
		
		this.progresscounter = new Ui.Label({ color: '#999999', fontSize: 8, fontWeight: 'bold' });
		this.progressbox.append(this.progresscounter);

		this.progressbar = new Wn.ProgressBar({ width: 40 });
		this.progressbox.append(this.progressbar);

		this.msglabel = new Ui.Label({ horizontalAlign: 'center', verticalAlign: 'bottom', marginBottom: 18, color: '#999999', fontWeight: 'bold', text: '' });
		lbox.append(this.msglabel);

		var label = new Ui.Label({ text: 'Accueil', color: '#999999', marginBottom: 15 });
		vbox.append(label);
	},

	onPress: function() {
		app.setMainPath('user:'+this.user.getId());
	},

	setCurrent: function(isCurrent) {
		if(isCurrent)
			this.arrow.show();
		else
			this.arrow.hide();
	},

	setUser: function(user) {
		this.user = user;
		this.connect(this.user, 'messageschange', this.onUserMessagesChange);
		this.connect(this.user, 'order', this.onUserOrder);
		this.connect(this.user, 'call', this.onUserCall);
		this.onUserMessagesChange();
	},

	getUploaders: function() {
		return this.uploaders;
	},

	addUploader: function(uploader) {
		this.uploaders.push(uploader);
		this.connect(uploader, 'complete', this.onUploaderCompleteError);
		this.connect(uploader, 'error', this.onUploaderCompleteError);
		this.connect(uploader, 'progress', this.updateUploaders);
		this.updateUploaders();
	},

	updateUploaders: function() {
		var count = 0;
		var countKnown = 0;
		var totalOctet = 0;
		var loadedOctet = 0;
		for(var i = 0; i < this.uploaders.length; i++) {
			var uploader = this.uploaders[i];
			if(uploader.getTotal() != undefined) {
				totalOctet += uploader.getTotal();
				loadedOctet += uploader.getLoaded();
				countKnown++;
			}
			count++;
		}
		// update the progress bar
		if(count == 0)
			this.progressbox.hide();
		else {
			this.progressbox.show();
			this.progresscounter.setText(count);
			if(countKnown == count)
				this.progressbar.setValue(loadedOctet / totalOctet);
		}
	},

	onUploaderCompleteError: function(uploader) {
		this.disconnect(uploader, 'complete', this.onUploaderCompleteError);
		this.disconnect(uploader, 'error', this.onUploaderCompleteError);
		// find the uploader
		var i = 0;
		for(i = 0; (i < this.uploaders.length) && (uploader != this.uploaders[i]); i++) {}
		if(i < this.uploaders.length) {
			this.uploaders.splice(i,1);
			this.updateUploaders();
		}
	},

	onUserOrder: function(user, message) {
		Ui.App.current.setMainPath(message.content);
	},
	
	onUserCall: function(user, contact, message) {
		var dialog = new Wn.VideoConfDialog({ user: this.user, contact: contact, message: message });
		dialog.open();
	},
	
	onUserRfid: function(user, message) {
//		console.log('onUserRfid rfid: '+message.content);
		var path = this.user.getRfidPath(message.content);
		if(path !== undefined)
			Ui.App.current.setMainPath(path);
		// we dont own this tag but it might be public
		// search for it
		else {
			var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/rfid/'+message.content });
			this.connect(request, 'done', function(req) {
				var json = req.getResponseJSON();
				if((json !== undefined) && (json.path !== undefined))
					Ui.App.current.setMainPath(json.path);
			});
			request.send();
		}
	},

	onUserMessagesChange: function() {
		var count = Ui.App.current.updateMessagesSeen();
/*		var count = 0;
		for(var i = 0; i < this.user.getMessages().length; i++) {
			var message = this.user.getMessages()[i];
			if((message.getDestination() !== this.user.getId()) || message.getSeen())
				continue;
			// if the message is a comment on the currently displayed resource
			// mark it seen
			if((message.getType() === 'comment') && !message.getSeen() &&
			   (message.getContent().indexOf(Ui.App.current.getMainPath()+';') === 0)) {
			   message.markSeen();
			}
			if((message.getDestination() == this.user.getId()) && !message.getSeen())
				count++;
		}*/

		if(count > 0) {
			this.msglabel.setText('+'+count);
			this.msglabel.show();
		}
		else
			this.msglabel.hide();
	}
});


Ui.CanvasElement.extend('Wn.ContactArrow', {}, {
	updateCanvas: function(ctx) {
		ctx.fillStyle = '#eeeeee';
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(this.getLayoutWidth(), this.getLayoutHeight()/2);
		ctx.lineTo(0, this.getLayoutHeight());
		ctx.closePath();
		ctx.fill();
	}
});

Ui.Selectionable.extend('Wn.MenuContactIcon', {
	user: undefined,
	contact: undefined,
	image: undefined,
	statusRect: undefined,
	newicon: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);
		
		this.append(new Ui.Rectangle({ fill: '#999999', margin: 1 }));
		this.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 2 }));

		this.image = new Ui.Image({ width: 64, height: 64, margin: 2 });
		this.append(this.image);
		
		this.statusRect = new Ui.Rectangle({ fill: '#d93737', width: 10, height: 10, marginBottom: 5, marginRight: 5, horizontalAlign: 'right', verticalAlign: 'bottom' });
		this.append(this.statusRect);
		
		this.newicon = new Wn.NewRibbon({ width: 32, height: 32, verticalAlign: 'top', horizontalAlign: 'right' });
		this.append(this.newicon);
	},
	
	getContact: function() {
		return this.contact;
	},
	
	onContactChange: function() {
		this.statusRect.setFill(this.contact.getIsOnline()?'#13d774':'#d71354');
		this.image.setSrc(this.contact.getFaceUrl());
		this.onContactResourceChange();
	},

	onContactResourceChange: function() {
		// update the newicon
		var hasNew = false;
		for(var i = 0; !hasNew && (i < this.contact.getResources().length); i++) {
			var resource = this.contact.getResources()[i];
			hasNew = (resource.getSeenByMeRev() != resource.getRev());
		}
		if(hasNew) 
			this.newicon.show();
		else
			this.newicon.hide();
	},
	
	onContactDelete: function() {
		var dialog = new Ui.Dialog({
			title: 'Enlever un contact',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300,
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous supprimer ce contact de votre liste de contact ?\n\nCela ne vous empêchera pas de le remettre plus tard si vous changez d\'avis.' })
		});
		var removeButton = new Ui.Button({ text: 'Enlever' });
		this.connect(removeButton, 'press', function() {
			this.user.removeContact(this.contact);
			dialog.close();
		});
		dialog.setActionButtons([ removeButton ]);
		dialog.open();
	},
	
	onContactEdit: function() {
		var dialog = new Wn.UserProfil({ user: this.contact });
		dialog.open();
	}
}, {
	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Enlever', icon: 'trash',
				scope: this, callback: this.onContactDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Modifier', icon: 'pen',
				scope: this, callback: this.onContactEdit, multiple: false
			}
		};
	},
	
	// disable "press" event for Ui.Selectionable
	onPress: function() {
	},
	
	onLoad: function() {
		Wn.MenuContactIcon.base.onLoad.call(this);

		this.connect(this.contact, 'change', this.onContactChange);
		this.connect(this.contact, 'resourcechange', this.onContactResourceChange);
		if(this.contact.getIsReady())
			this.onContactChange();
	},
	
	onUnload: function() {
		Wn.MenuContactIcon.base.onUnload.call(this);
		
		this.disconnect(this.contact, 'change', this.onContactChange);
		this.disconnect(this.contact, 'resourcechange', this.onContactResourceChange);
	}
});

Ui.LBox.extend('Wn.MenuContact', {
	user: undefined,
	contact: undefined,
	draggable: undefined,
	dropbox: undefined,
	label: undefined,
	arrow: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);

		this.dropbox = new Ui.DropBox({ marginTop: 5, marginBottom: 5 });
		this.dropbox.addMimetype('Wn.ResourceView');
		this.connect(this.dropbox, 'drop', this.onDrop);
		this.setContent(this.dropbox);

		var vbox = new Ui.VBox();
		this.dropbox.setContent(vbox);

		var lbox = new Ui.LBox();
		vbox.append(lbox);

		this.arrow = new Wn.ContactArrow({ width: 10, height: 20, verticalAlign: 'center', horizontalAlign: 'left' });
		this.arrow.hide();
		lbox.append(this.arrow);

		this.draggable = new Wn.MenuContactIcon({ horizontalAlign: 'center', contact: this.contact, user: this.user });
		this.connect(this.draggable, 'press', this.onPress);
		lbox.append(this.draggable);

		this.label = new Ui.CompactLabel({ fontSize: 14, margin: 3, marginBottom: 5, width: 90, maxLine: 2, textAlign: 'center', color: '#a7a9ac', horizontalAlign: 'center' });
		vbox.append(this.label);
		
		if(Ui.App.current.getMainPath() === 'user:'+this.contact.getId())
			this.setCurrent(true);
	},

	setCurrent: function(isCurrent) {
		if(isCurrent)
			this.arrow.show();
		else
			this.arrow.hide();
	},

	getContact: function() {
		return this.contact;
	},

	onPress: function() {
		app.setMainPath('user:'+this.contact.getId());
	},

	onContactChange: function() {
		this.label.setText(this.contact.getFirstname()+' '+this.contact.getLastname());
	},

	onDrop: function(dropbox, mimetype, data) {
		// drop a resource ? share it with the contact
		var resource = Wn.Resource.getResource(data);
		if(resource.getIsReady())
			this.onResourceReady(resource);
		else
			this.connect(resource, 'ready', this.onResourceReady);
	},
	
	onResourceReady: function(resource) {
		if(resource.canShare()) {
			var diff = { user_id: this.contact.getId(), read: true, share: this.user.getData().default_share_right };
			if(resource.canWrite() && this.user.getData().default_write_right)
				diff.write = true;	
			resource.addRights(diff);
		}
	}
}, {
	onLoad: function() {
		Wn.MenuContact.base.onLoad.call(this);

		this.connect(this.contact, 'change', this.onContactChange);
		if(this.contact.getIsReady())
			this.onContactChange();
	},
	
	onUnload: function() {
		Wn.MenuContact.base.onUnload.call(this);
		
		this.disconnect(this.contact, 'change', this.onContactChange);
	}
});

Ui.LBox.extend('Wn.MenuNewContact', {
	user: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		var pressable = new Ui.Pressable({ horizontalAlign: 'center' });
		this.connect(pressable, 'press', this.onPress);
		this.setContent(pressable);

		pressable.append(new Ui.Icon({ icon: 'plus', margin: 13, marginBottom: 15, width: 48, height: 48, fill: '#f1f1f1' }));
	},

	onPress: function() {
		var dialog = new Wn.AddContactDialog({ user: this.user });
		dialog.open();
	}
});

Ui.LBox.extend('Wn.Menu', {
	user: undefined,
	menuUser: undefined,
	contactsWatcher: undefined,
	resourcesWatcher: undefined,
	messageBox: undefined,

	resources: undefined,
	contacts: undefined,

	constructor: function(config) {
		this.addEvents('launch');

		this.user = config.user;
		delete(config.user);

		this.append(new Ui.Rectangle({ fill: '#3f3f3f' }));

		var vbox = new Ui.VBox({ spacing: 5 });
		this.append(vbox);

		this.menuUser = new Wn.MenuUser({ margin: 0, user: this.user });
		vbox.append(this.menuUser);

		var scroll = new Ui.ScrollingArea({ directionRelease: true, scrollHorizontal: false, showShadows: true });
		vbox.append(scroll, true);

		var vbox = new Ui.VBox({ margin: 0, spacing: 5 });
		scroll.setContent(vbox);

		vbox.append(new Wn.MenuNewContact({ user: this.user }));

		// this.contacts = new Ui.VBox({ spacing: 5 });
		this.contacts = new Wn.VDropBox({ spacing: 5 });
		this.contacts.addMimetype('Wn.MenuContactIcon');
		this.connect(this.contacts, 'dropat', this.onUserDropAt);
		vbox.append(this.contacts);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},

	getUploaders: function() {
		return this.menuUser.getUploaders();
	},

	addUploader: function(uploader) {
		this.menuUser.addUploader(uploader);
	},

	setCurrentUser: function(userId) {
		for(var i = 0; i < this.contacts.getLogicalChildren().length; i++) {
			if(this.contacts.getLogicalChildren()[i].getContact().getId() == userId) {
				this.contacts.getLogicalChildren()[i].setCurrent(true);
				if('scrollIntoViewIfNeeded' in this.contacts.getLogicalChildren()[i].getDrawing())
					this.contacts.getLogicalChildren()[i].getDrawing().scrollIntoViewIfNeeded();
				else
					this.contacts.getLogicalChildren()[i].getDrawing().scrollIntoView();
			}
			else
				this.contacts.getLogicalChildren()[i].setCurrent(false);
		}
		this.menuUser.setCurrent(this.user.getId() == userId);
	},

	onUserChange: function(user) {
		// find the diff
		var remove = [];
		var add = [];

		for(var i2 = 0; i2 < this.contacts.getLogicalChildren().length; i2++)
			this.contacts.getLogicalChildren()[i2].hostMenuFound = false;

		for(var i = 0; i < this.user.getContacts().length; i++) {
			var contact = this.user.getContacts()[i];
			var found = undefined;
			for(var i2 = 0; (found == undefined) && (i2 < this.contacts.getLogicalChildren().length); i2++) {
				if(this.contacts.getLogicalChildren()[i2].getContact().getId() == contact.getId())
					found = this.contacts.getLogicalChildren()[i2];
			}
			if(found == undefined)
				add.push(contact);
			else
				found.hostMenuFound = true;
		}

		for(var i2 = 0; i2 < this.contacts.getLogicalChildren().length; i2++)
			if(!this.contacts.getLogicalChildren()[i2].hostMenuFound)
				remove.push(this.contacts.getLogicalChildren()[i2]);

		// remove old
		for(var i = 0; i < remove.length; i++)
			this.contacts.remove(remove[i]);

		// add new
		if(add.length > 0) {
			for(var i = 0; i < add.length; i++) {
				this.contacts.insertAt(new Wn.MenuContact({ user: this.user, contact: add[i] }), add[i].getPosition());
			}
		}
		// check if the order is correct
		var badContactPosition;
		var iterCount = 0;
		do {
			badContactPosition = undefined;
			for(var i = 0; i < this.contacts.getLogicalChildren().length; i++) {
				var contactPos = this.contacts.getLogicalChildren()[i].getContact().getPosition();
				if(contactPos != i) {
					// protect against bad server position and infinite loop
					if((contactPos > 0) && (contactPos < this.contacts.getLogicalChildren().length)) {				
						badContactPosition = this.contacts.getLogicalChildren()[i];
						this.contacts.moveAt(badContactPosition, contactPos);
					}
					break;
				}
			}
			iterCount++;
		} while((badContactPosition !== undefined) && (iterCount <= this.contacts.getLogicalChildren().length));
	},

	onUserDropAt: function(flowbox, mimetype, data, pos) {
		// check if we already display this contact
		var found = undefined;
		var foundAt = -1;
		for(var i = 0; (i < this.contacts.getLogicalChildren().length) && (found === undefined); i++) {
			var contact = this.contacts.getLogicalChildren()[i];
			if(contact.getContact() === data.getContact()) {
				found = contact;
				foundAt = i;
			}
		}
		if(found !== undefined) {
			if((foundAt != pos) && (foundAt+1 != pos)) {
				if(foundAt < pos)
					pos--;
				this.contacts.moveAt(found, pos);
				this.user.setContactPosition(found.getContact(), pos);
			}
		}
	}
});

Ui.Dialog.extend('Wn.ReloadDialog', {
	constructor: function(config) {
		this.setTitle('Mise à jour de l\'application');
		this.setFullScrolling(true);
		this.setPreferedWidth(300);
		this.setPreferedHeight(300);
		this.setContent(new Ui.Text({ text: 'Une mise à jour est disponible. Il est souhaitable de recharger l\'application.', margin: 20 }));
		
		var reloadButton = new Ui.Button({ text: 'Recharger' });
		this.connect(reloadButton, 'press', this.onReloadPress);
		this.setActionButtons([reloadButton]);

		this.setCancelButton(new Ui.Button({ text: 'Plus tard' }));
	},

	onReloadPress: function() {
		window.location.reload();
	}
});

Ui.App.extend('Wn.App', {
	loginDialog: undefined,
	user: undefined,
	deviceQueue: undefined,
	menuswitch: undefined,
	contentswitch: undefined,
	hbox: undefined,
	menu: undefined,
	mainbox: undefined,
	main: undefined,
	isFullscreen: false,
	sessionId: undefined,
	currentPath: undefined,
	resource: undefined,
	rfidReader: undefined,
	reloadDialog: undefined,

	constructor: function(config) {
		this.setContent(new Ui.VBox());
		this.sendGetAuthSession();
		this.connect(window, 'hashchange', this.onHashChange);
		
		this.rfidReader = new Wn.RfidReader();
		this.connect(this.rfidReader, 'enter', this.onRfidEnter);		
	},

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {	
		if('getSelectionHandler' in this.getMain())
			return this.getMain().getSelectionHandler();
	},

	getRfidReader: function() {
		return this.rfidReader;
	},

	sendGetAuthSession: function() {
		var oldSession = undefined;
		// if a session is given as argument, use it
		if(this.getArguments()['authsession'] != undefined)
			oldSession = this.getArguments()['authsession'];
		// else look in the localStorage
		else if('localStorage' in window)
			oldSession = localStorage.getItem('authsession');
		var url = '/cloud/authsession/';
		if(oldSession != undefined)
			url += encodeURIComponent(oldSession);
		else
			url += 'current';
		url += '?setcookie=1';
				
		var request = new Core.HttpRequest({ method: 'GET', url: url });
		this.connect(request, 'done', this.onGetAuthSessionDone);
		this.connect(request, 'error', this.onGetAuthSessionError);
		request.send();
	},

	onGetAuthSessionError: function(req) {
		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	onGetAuthSessionDone: function(req) {
		var res = req.getResponseJSON();
		this.sessionId = res.id;

		if(('localStorage' in window) && (this.getArguments()['authsession'] == undefined)) {
			if(localStorage.getItem('authsession') != res.id)
				localStorage.setItem('authsession', res.id);
		}
		// if we connect with an argument session, use the session HTTP header
		if((this.getArguments()['authsession'] != undefined) && (this.getArguments()['authsession'] == res.id))
			Core.HttpRequest.setRequestHeader('X-Webnapperon-Authentication', res.id);
		var userId = res.user;
		var request = new Core.HttpRequest({ url: '/cloud/user/'+userId });
		this.connect(request, 'done', this.onGetUserDone);
		this.connect(request, 'error', this.onGetUserError);
		request.send();
	},

	onGetUserDone: function(req) {
		// continue after login
		this.onLoginDone(req.getResponseJSON());
	},

	onGetUserError: function(req) {
		// delete the session from the localStorage if not valid
		if(('localStorage' in window) && this.sessionId == localStorage.getItem('authsession'))
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	getUser: function() {
		return this.user;
	},

	basicLogin: function() {
		this.loginDialog = new Wn.LoginWizard();
		this.connect(this.loginDialog, 'done', this.onBasicLoginDone);
		this.loginDialog.open();
	},

	onBasicLoginDone: function(dialog) {
		dialog.close();
		this.sendGetAuthSession();
	},

	onLoginDone: function(user) {
		this.user = new Wn.User({ user: user });
		this.connect(this.user, 'delete', this.onUserDelete);
		this.connect(this.user, 'serverchange', this.onServerChange);

		this.hbox = new Ui.HBox();
		this.setContent(this.hbox);

		this.contentswitch = new Ui.TransitionBox();
		this.hbox.append(this.contentswitch, true);
		
		this.menu = new Wn.Menu({ user: this.user, width: 80 });
		this.hbox.append(this.menu);

		var path = '';
		// Test (hash != '#_=_') because of Facebook OAuth2 login
		if(('location' in window) && ('hash' in location) && (location.hash != undefined) &&
			(location.hash != '') && (location.hash != '#') && (location.hash != '#_=_'))
			path = location.hash.substring(1);
		else
			path = 'user:'+this.user.getId();
		this.setMainPath(path);
		
		// if a device queue is defined, connect
		if(('localStorage' in window) && (localStorage.getItem('deviceId') !== undefined) && (localStorage.getItem('deviceId') !== null)) {
			this.deviceQueue = new Wn.Queue({ channel: localStorage.getItem('deviceId') });
			this.connect(this.deviceQueue, 'message', this.onDeviceMessage);
		}
	},

	getDeviceId: function() {
		if(('localStorage' in window) && (localStorage.getItem('deviceId') !== undefined))
			return localStorage.getItem('deviceId');
		else
			return undefined;
	},

	setDeviceId: function(id) {
		if('localStorage' in window) {
			if((id === undefined) || (id === null)) {
				localStorage.removeItem('deviceId');
			}
			else {
				localStorage.setItem('deviceId', id);
				if(this.deviceQueue !== undefined)
					this.deviceQueue.setChannel(id);
				else {
					this.deviceQueue = new Wn.Queue({ channel: id });
					this.connect(this.deviceQueue, 'message', this.onDeviceMessage);
				}
			}
		}
	},

	updateMessagesSeen: function() {
		var path = this.getMainPath();
		if(path === undefined)
			return 0;
		var countUnseen = 0;
		
		var messages = this.user.getMessages();
		// markseen all contact added notification for this user
		if(path.indexOf('user:') === 0) {
			for(var i = 0; i < messages.length; i++) {
				var message = messages[i];
				if(message.getSeen() || (message.getDestination() != this.user.getId()))
					continue;
				if((message.getType() === 'contact') && (path === 'user:'+message.getContent()))
					message.markSeen();
				else
					countUnseen++;
			}
		}
		// markseen all comments or resource shared notifications on this resource
		else if(path.indexOf('resource:') === 0) {
			for(var i = 0; i < messages.length; i++) {
				var message = messages[i];
				if(message.getSeen() || (message.getDestination() != this.user.getId()))
					continue;
				if(((message.getType() === 'comment') && ('resource:'+message.getContent().resource.id+':'+message.getContent().file === path)) ||
				   ((message.getType() === 'resource') && ('resource:'+message.getContent().id === path)))
					message.markSeen();
				else
					countUnseen++;
			}
		}
		return countUnseen;
	},	

	getMainPath: function() {
		return this.currentPath;
	},

	notifyMainPath: function(path) {
		if(path == this.currentPath)
			return false;
		this.currentPath = path;	
		if(('location' in window) && ('hash' in location))
			location.hash = '#'+path;
		// log on the server
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/pathlog',
			content: JSON.stringify({ owner: Ui.App.current.getUser().getId(), path: path })
		});
		request.send();
		
		this.updateMessagesSeen();
		return true;
	},

	setMainPath: function(path) {
		if(!this.notifyMainPath(path))
			return;
		
		//console.log(this+'.setMainPath: '+path);
		
		if(this.resource != undefined) {
			this.disconnect(this.resource, 'error', this.onResourceError);
			this.disconnect(this.resource, 'delete', this.onResourceError);
			this.disconnect(this.resource, 'ready', this.onResourceReady);
			this.resource = undefined;
		}
			
		if(path == '') {
			app.setMain(new Wn.UserView({ user: this.user }));
			this.menu.setCurrentUser(this.user.getId());
		}
		else {
			var pos = path.indexOf(':');
			if(pos == -1) {
				this.setMainPath('error:notfound');
				return;
			}
			var type = path.substring(0,pos);
			var subpath = path.substring(pos+1);
			switch(type) {
				case 'rfid':
					var rfidPath = this.user.getRfidPath(subpath);
					if(rfidPath === undefined) {
						// we dont own this tag but it might be public
						// search for it
						var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/rfid/'+subpath });
						this.connect(request, 'done', function(req) {
							var json = req.getResponseJSON();
							if((json !== undefined) && (json.path !== undefined)) {
								Ui.App.current.setMainPath(json.path);
								// auto play the content when RFID is used
								var main = this.getMain();
								if('play' in main)
									main.play();
							}
						});
						this.connect(request, 'error', function() {
							this.setMainPath('error:notfound');
						});
						request.send();
					}
					else {
						this.setMainPath(rfidPath);
						// auto play the content when RFID is used
						var main = this.getMain();
						if('play' in main)
							main.play();
					}
					return;
				case 'user':
					var contactId = subpath;
					this.menu.setCurrentUser(contactId);
					if(contactId == this.user.getId())
						app.setMain(new Wn.UserView({ user: this.user }));
					else {
						var contact = Wn.Contact.getContact(contactId);
						app.setMain(new Wn.ContactView({ user: this.user, contact: contact }));
					}
					break;
				case 'resource':
					var pos = subpath.indexOf(':');
					var resourceId;
					var resourceSubpath;
					// resource with subpath
					if(pos != -1) {
						var resourceId = subpath.substring(0, pos);
						var resourceSubpath = subpath.substring(pos+1);
						this.resourceSubpath = resourceSubpath;
					}
					// resource only
					else {
						var resourceId = subpath;
						this.resourceSubpath = undefined;
					}

					this.resource = Wn.Resource.getResource(resourceId, this.user);
					if(this.resource == undefined) {
						this.setMainPath('error:notfound');
						return;
					}					
					if(this.resource.getIsReady())
						this.onResourceReady();
					else {
						this.connect(this.resource, 'ready', this.onResourceReady);
						this.connect(this.resource, 'error', this.onResourceError);
						this.connect(this.resource, 'delete', this.onResourceError);
					}
					break;
				case 'error':
					this.setMain(new Wn.Error());
					break;
				default:
					this.setMainPath('error:notfound');
			}
		}
		if((this.isFullscreen) && ('fullscreen' in this.getMain()))
			this.getMain().fullscreen();
	},
	
	onResourceError: function() {
		this.disconnect(this.resource, 'error', this.onResourceError);
		this.disconnect(this.resource, 'delete', this.onResourceError);
		this.disconnect(this.resource, 'ready', this.onResourceReady);
		this.resource = undefined;
		this.setMainPath('error:notfound');
	},
	
	onResourceReady: function() {
		this.disconnect(this.resource, 'error', this.onResourceError);
		this.disconnect(this.resource, 'delete', this.onResourceError);
		this.disconnect(this.resource, 'ready', this.onResourceReady);
	
		// check if the resource is not already loaded
		if(Wn.ResourceViewer.hasInstance(this.main) && (this.main.getResource() == this.resource)) {
			// change the subpath if needed
			if(this.resourceSubpath != undefined)
				this.main.setPath(this.resourceSubpath);
			return;
		}
		var viewconst = Wn.ResourceViewer.getApplication(this.resource.getType());		
		if(viewconst === undefined) {
			this.setMainPath('error:notfound');
			return;
		}
		this.menu.setCurrentUser(this.resource.getOwnerId());
		// my own resource
		if(this.resource.getOwnerId() == this.user.getId()) {
			var viewer = new viewconst({ user: this.user, contact: undefined, resource: this.resource, path: this.resourceSubpath });
			this.setMain(viewer);
		}
		// a shared resource
		else {
			var contact = Wn.Contact.getContact(this.resource.getOwnerId());
			var viewer = new viewconst({ user: this.user, contact: contact, resource: this.resource, path: this.resourceSubpath });
			this.setMain(viewer);
		}
		this.resource = undefined;
	},

	getMain: function() {
		return this.main;
	},

	setMain: function(main) {
		if((this.main != undefined) && this.main.hasEvent('fullscreen') && this.main.hasEvent('unfullscreen')) {
			this.disconnect(this.main, 'fullscreen', this.onContentFullscreen);
			this.disconnect(this.main, 'unfullscreen', this.onContentUnfullscreen);
		}
		if(main.hasEvent('fullscreen') && main.hasEvent('unfullscreen')) {
			this.connect(main, 'fullscreen', this.onContentFullscreen);
			this.connect(main, 'unfullscreen', this.onContentUnfullscreen);
		}
		if(this.main != undefined) {
			this.main.disable();
			this.mainbox.append(new Ui.Rectangle({ fill: 'white', opacity: 0.5 }));
			this.mainbox.append(new Ui.Loading({ width: 50, height: 50, verticalAlign: 'center', horizontalAlign: 'center' }));
		}
		this.mainbox = new Ui.LBox();
		this.main = main;
		this.mainbox.setContent(this.main);
		this.contentswitch.replaceContent(this.mainbox);
	},

	setDefaultMain: function() {
		this.setMainPath('');
	},

	getUploaders: function() {
		return this.menu.getUploaders();
	},

	addUploader: function(uploader) {
		this.menu.addUploader(uploader);
	},

	onContentFullscreen: function() {
		if(!this.isFullscreen) {
			this.isFullscreen = true;
			this.hbox.remove(this.menu);
//			if(document.body != undefined)
//				document.body.style.backgroundColor = '#bbbbbb';
			
			// request browser fullscreen
			var docElm = document.documentElement;
			if('requestFullscreen' in docElm)
				docElm.requestFullscreen();
			else if('mozRequestFullScreen' in docElm)
				docElm.mozRequestFullScreen();
			else if('webkitRequestFullScreen' in docElm) 
				docElm.webkitRequestFullScreen();
		}
	},

	onContentUnfullscreen: function() {
		if(this.isFullscreen) {
			this.isFullscreen = false;
			this.hbox.append(this.menu);
//			if(document.body != undefined)
//				document.body.style.backgroundColor = '#eeeeee';
			// request browser unfullscreen
			if('exitFullscreen' in document)
				document.exitFullscreen();
			else if('mozCancelFullScreen' in document)
				document.mozCancelFullScreen();
			else if('webkitCancelFullScreen' in document)
				document.webkitCancelFullScreen();
		}
	},

	onHashChange: function() {
		if(location.hash.substring(1) != this.currentPath)
			this.setMainPath(location.hash.substring(1));
	},

	onServerChange: function() {
		if(this.reloadDialog === undefined) {
			this.reloadDialog = new Wn.ReloadDialog();
			this.connect(this.reloadDialog, 'close', function() {
				this.reloadDialog = undefined;
			});
			this.reloadDialog.open();
		}
	},

	onUserDelete: function() {
		var dialog = new Ui.Dialog({
			title: 'Compte supprimé',
			fullScrolling: true,
			preferedWidth: 300, 
			preferedHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 'Il semble que votre compte a été supprimé.' }));
		var exitButton = new Ui.Button({ text: 'Quitter' });
		dialog.setActionButtons([exitButton]);
		this.connect(exitButton, 'press', function() {
			window.location.reload();
		});
		dialog.open();
	},
	
	onRfidEnter: function(rfidReader, rfid) {
		//console.log(this+'.onRfidEnter: '+rfid);
		this.setMainPath('rfid:'+rfid);
		return true;
	},
	
	onDeviceMessage: function(queue, msg) {
		//console.log(this+'.onDeviceMessage');
		//console.log(msg);
		if(msg.type == 'rfid')
			this.getRfidReader().fireEnter(msg.content);
		else if(msg.type == 'order')
			this.setMainPath(msg.content);
	}
});

Ui.Icon.register('person', 'm 31.255154,11.504904 c 0.385499,1.705036 0.852155,3.545577 0.942733,5.320176 0.02391,0.473904 0.05217,1.095629 -0.145648,1.499968 1.613732,1.07389 0.823894,3.305727 -0.120288,4.44121 -0.339848,0.407238 -1.112295,0.913023 -1.284756,1.418085 -0.255067,0.742738 -0.570278,1.471708 -1.020267,2.12894 -0.376079,0.547814 -0.295647,0.13333 -0.670277,0.973892 -0.253616,1.142005 -0.638392,3.728181 -0.0942,4.789752 0.714477,1.392 2.279662,2.27314 3.575286,3.013705 1.717355,0.982586 3.636154,1.703587 5.470172,2.43618 1.688371,0.674623 3.449202,1.178235 5.073805,2.002855 0.509409,0.257965 1.023166,0.510133 1.505765,0.817374 0.389122,0.24782 1.042007,0.629697 1.134758,1.129685 v 3.930351 H 2.137661 l 0.02971,-3.930351 c 0.092752,-0.499265 0.7456362,-0.881865 1.1347583,-1.129685 0.4825983,-0.307241 0.9963555,-0.558683 1.5057649,-0.817374 1.6246029,-0.82462 3.3861595,-1.328232 5.0738045,-2.002855 1.8340193,-0.733318 3.7520943,-1.453594 5.4701723,-2.43618 1.2949,-0.740565 2.860085,-1.621705 3.574562,-3.013705 0.544915,-1.062295 0.240575,-3.659341 -0.01378,-4.799897 l 0,0 c -0.435498,-0.281878 -0.736217,-1.155047 -0.983312,-1.591995 -0.26014,-0.461584 -0.469556,-0.959399 -0.786941,-1.386925 -0.432599,-0.583322 -1.153599,-0.856505 -1.624603,-1.40287 -0.314486,-0.363759 -0.448541,-0.814476 -0.604334,-1.260842 -0.186228,-0.533321 -0.09492,-0.966646 -0.178258,-1.565908 -0.03695,-0.256518 0.0942,-0.554336 0.246372,-0.770999 0.186952,-0.26666 0.527525,-0.318834 0.613755,-0.656507 0.106519,-0.418107 -0.128258,-0.907952 -0.173185,-1.320987 -0.04783,-0.441294 -0.162315,-1.144903 -0.160141,-1.587647 0.0072,-1.606487 -0.28985,-3.055732 0.996356,-4.32527 0.452163,-0.444918 0.96592,-0.829692 1.45649,-1.231133 l 0,0 c 0.188401,-0.5999868 1.092006,-0.9695441 1.620255,-1.1709891 0.686218,-0.260864 1.407941,-0.4072376 2.111549,-0.6166535 2.123143,-0.6325951 4.562946,-0.5652052 6.4245,0.7456363 0.610857,0.4304255 1.452868,0.060868 2.096332,0.4304255 0.619552,0.3565141 1.358667,1.1804098 1.287654,1.9405378 z');
Ui.Icon.override('home', 'm 44,44 c 0,1.1 -0.9,2 -2,2 h -36 c -1.1,0 -2,-0.9 -2,-2 v -18.017 c 0,-1.1 0.688,-2.579 1.53,-3.287 l 16.939,-14.247 c 0.842,-0.708 2.219,-0.708 3.061,0 l 16.939,14.247 c 0.842,0.708 1.53,2.187 1.53,3.287 v 18.017 z');
Ui.Icon.register('bubble','M 22.9375,3.90625 C 10.790957,3.90625 0.5,12.130045 0.5,22.78125 0.5,33.432455 10.790957,41.625 22.9375,41.625 c 2.124327,0 4.17045,-0.3792 6.125,-0.84375 7.279657,3.168207 11.862809,3.147181 18.4375,1.96875 -2.660808,-2.477164 -5.513133,-5.353739 -7.40625,-7.9375 3.222545,-3.236231 5.28125,-7.390481 5.28125,-12.03125 0,-10.651205 -10.291328,-18.875 -22.4375,-18.875 z m 0,4.59375 c 10.113871,0 17.84375,6.639208 17.84375,14.28125 -0.698708,5.363994 -3.032958,8.351365 -6.65625,11.25 0.926077,2.069229 3.275767,4.207025 4.59375,5.6875 -3.489625,-0.707366 -6.340952,-1.85199 -8.78125,-3.75 -2.352313,0.645471 -4.924033,1.051885 -7,1.0625 -10.114319,0 -17.84375,-6.608273 -17.84375,-14.25 C 5.09375,15.139208 12.823181,8.5 22.9375,8.5 z');
Ui.Icon.register('earth', 'm 46.985785,24 c 0,12.8259 -10.1334,23.0301 -22.959233,23.0301 -12.755325,0 -23.03009452,-10.2042 -23.03009452,-23.0301 0,-12.6841 10.27476952,-22.8883 23.03009452,-22.8883 12.826193,0 22.959233,10.2042 22.959233,22.8883 z m -34.084356,5.8817 c -0.283453,-1.7716 -0.425178,-3.7558 -0.425178,-5.6691 0,-1.4172 0.07086,-2.551 0.212589,-3.8974 -3.2593405,-0.6378 -5.1729935,-1.1338 -6.6611155,-1.7716 -0.495686,1.7007 -0.779137,3.614 -0.779137,5.4564 0,0.9213 0,1.8425 0.141371,2.622 0.921573,1.0629 3.259695,2.4802 7.5114705,3.2597 z m 3.89746,11.4089 c -1.630202,-2.2676 -2.693145,-5.173 -3.401775,-8.5744 -2.834517,-0.6378 -5.3852275,-1.4173 -7.0859375,-2.3385 1.062944,2.6219 2.40934,4.9604 4.4643635,6.8737 1.700711,1.8421 3.826598,3.1176 6.023349,4.0392 z m -9.7082205,-25.2272 c 0.638121,0.5669 1.700711,0.6378 5.8816225,1.7716 0.779491,-4.5353 2.125888,-8.2906 4.251775,-11.1252 -2.409338,1.1339 -4.535226,2.1259 -6.448171,4.181 -1.6302015,1.4881 -2.8348705,3.3305 -3.6852265,5.1726 z m 8.3614705,14.3143 c 2.409339,0.4252 4.747816,0.6378 7.157156,0.7086 v -9.9916 c -2.551066,-0.071 -5.10213,-0.2126 -7.511471,-0.4961 0,1.2756 -0.07051,2.3385 -0.07051,3.614 0,2.0551 0.141725,4.2518 0.424823,6.1651 z m 0,-12.1884 c 2.338831,0.2126 4.747816,0.3543 7.157156,0.4252 v -13.1805 c 0,0 -0.07086,0 -0.141726,0 -3.188832,1.2758 -5.881269,6.2363 -7.01543,12.7553 z m 7.157511,24.5186 v -9.1414 c -2.196752,-0.071 -4.393503,-0.2125 -6.519036,-0.4251 0.424823,1.8424 1.062589,3.4722 1.912945,4.9604 1.062943,2.5507 2.692437,4.6061 4.606091,4.6061 z m 2.692436,-37.2736 v 13.1802 c 2.480202,-0.071 4.818679,-0.2126 7.227669,-0.4252 -0.92122,-5.1021 -2.97589,-9.5665 -5.385233,-11.7629 -0.637412,-0.4252 -1.346042,-0.9921 -1.842436,-0.9921 z m 7.157159,25.0143 c 0.35431,-1.9133 0.42482,-4.1101 0.42482,-6.236 0,-1.2755 0,-2.3384 -0.0705,-3.5431 -2.40934,0.2126 -4.889543,0.3543 -7.51147,0.4252 v 9.9916 c 2.480202,-0.071 4.81868,-0.2834 7.15716,-0.6377 z m -0.56691,2.6928 c -2.19639,0.2126 -4.393145,0.3543 -6.590249,0.4251 v 9.1414 c 3.685229,0 5.669039,-6.3777 6.590249,-9.5665 z m -1.13345,-26.5024 c 2.12554,2.7636 3.47229,6.6611 4.18092,11.2672 3.82659,-0.7086 5.38522,-1.3464 5.95213,-1.7716 -1.98416,-4.3935 -5.7399,-7.9366 -10.13305,-9.4956 z m 10.69995,24.0222 c -1.84244,0.8503 -4.25178,1.5589 -6.87335,2.1258 -0.77949,3.4015 -1.77157,6.1648 -3.47264,8.5036 2.19675,-0.9212 4.3935,-2.1967 6.09421,-4.0392 1.98381,-1.8428 3.33021,-4.11 4.25178,-6.5902 z m -6.02335,-6.4486 c 0,1.9133 -0.14173,3.9684 -0.35431,5.7399 7.36974,-1.2046 7.65319,-2.9053 7.65319,-5.9525 0,-1.7715 -0.28345,-3.6848 -0.85,-5.3855 -1.34675,0.5669 -3.75609,1.4172 -6.59061,1.7007 0.14173,1.3464 0.14173,2.4802 0.14173,3.8974 z');
Ui.Icon.register('twitter', 'M 14.461732,39.914886 C 10.071167,38.992913 6.5495922,37.142869 3.2204514,34.009333 2.5838669,33.41015 1.7583132,32.534692 1.385888,32.06387 L 0.70875479,31.207832 1.7474522,31.921654 c 4.8015164,3.299739 10.4033288,3.205609 15.0304198,-0.252563 l 1.176779,-0.879496 -1.144837,-0.257839 c -1.440857,-0.32451 -2.050462,-0.905059 -2.050462,-1.952734 0,-0.60638 0.140455,-0.901263 0.606138,-1.272586 0.696494,-0.555366 0.614812,-0.643571 -0.783672,-0.846293 -1.163736,-0.168693 -2.84796,-1.223604 -3.366458,-2.108575 -0.317047,-0.541138 -0.312391,-0.614582 0.06544,-1.032083 0.223729,-0.247217 0.831039,-0.556314 1.349579,-0.686886 l 0.942799,-0.2374 -1.232884,-0.50108 C 10.833066,21.281534 9.5743131,20.094399 9.091495,18.830153 8.6873491,17.771915 8.8391158,17.511822 9.881572,17.476128 c 0.296768,-0.01013 0.719523,-0.08926 0.939457,-0.175781 0.343847,-0.135264 0.27557,-0.239568 -0.487282,-0.7444 -1.4153354,-0.936624 -2.2533124,-2.27021 -2.7031275,-4.301856 -0.1893921,-0.855408 0.267032,-0.789993 3.5013655,0.501822 5.47833,2.188082 9.395285,4.253136 11.256225,5.934382 l 0.876351,0.791733 0.455458,-1.050976 c 2.032166,-4.68924 3.379403,-6.939615 5.266251,-8.796557 0.632971,-0.6229412 1.209731,-1.1607725 1.889862,-1.4049485 -0.159253,0.2899797 -0.269642,0.4266676 -0.324194,0.5750155 -0.116522,0.3168623 0.07048,0.2955969 1.084398,-0.215832 0.566606,-0.285803 1.728237,-0.5859722 2.661004,-0.6008624 -0.688242,0.3888564 -0.953288,0.5309353 -1.208661,0.7768018 -0.25537,0.2458655 -0.403488,0.5209182 -0.403488,0.5209182 l 1.013725,-0.3454114 c 1.094809,-0.3730375 2.082375,-0.263868 2.082375,0.2301974 0,0.4061483 -0.788209,0.9443134 -1.726648,1.1789034 -0.415475,0.103856 -1.046779,0.260082 -1.4029,0.347159 -0.568836,0.13909 -0.459401,0.191322 0.900833,0.429955 0.85158,0.149398 2.094332,0.521601 2.761668,0.827117 2.278759,1.043251 4.508082,3.821054 5.307768,6.61364 0.152968,0.534182 0.370135,1.092644 0.482593,1.241028 0.28615,0.37756 2.854336,0.345723 4.164145,-0.05163 0.582724,-0.176773 1.086275,-0.322459 1.118999,-0.323745 0.03273,-0.0013 -0.08232,0.271925 -0.255666,0.607132 -0.398861,0.771309 -1.770753,1.686276 -3.035634,2.024581 -0.537298,0.143706 -0.976905,0.326123 -0.976905,0.405369 0,0.239342 1.254235,0.413878 2.97415,0.413878 l 1.625204,0 -0.411155,0.454628 c -0.64857,0.717146 -1.998131,1.307828 -3.607689,1.579032 l -1.483007,0.249877 -0.378928,1.0705 c -2.462943,6.957975 -9.391366,12.328731 -17.794875,13.79418 -2.68789,0.468729 -7.045334,0.415475 -9.581512,-0.117095 z');
Ui.Icon.register('fullscreen', 'M 1.375 1.8125 L 1.375 9.1875 L 3.71875 6.8125 L 6.96875 9.9375 L 9.4375 7.46875 L 6.3125 4.34375 L 8.84375 1.8125 L 1.375 1.8125 z M 39.125 1.84375 L 41.46875 4.1875 L 38.34375 7.4375 L 40.8125 9.90625 L 43.9375 6.78125 L 46.46875 9.3125 L 46.46875 1.84375 L 39.125 1.84375 z M 13.53125 8.6875 C 10.781246 8.6875 8.53125 10.937496 8.53125 13.6875 L 8.53125 34.53125 C 8.53125 37.281254 10.781246 39.53125 13.53125 39.53125 L 34.375 39.53125 C 37.125004 39.53125 39.40625 37.281254 39.40625 34.53125 L 39.40625 13.6875 C 39.40625 10.937496 37.125004 8.6875 34.375 8.6875 L 13.53125 8.6875 z M 13.53125 11.75 L 34.375 11.75 C 35.473033 11.75 36.3125 12.589467 36.3125 13.6875 L 36.3125 34.53125 C 36.3125 35.629283 35.473033 36.46875 34.375 36.46875 L 13.53125 36.46875 C 12.433217 36.46875 11.625 35.629283 11.625 34.53125 L 11.625 13.6875 C 11.625 12.589467 12.433217 11.75 13.53125 11.75 z M 40.90625 38.71875 L 38.4375 41.1875 L 41.5625 44.28125 L 39.03125 46.8125 L 46.5 46.8125 L 46.5 39.46875 L 44.15625 41.8125 L 40.90625 38.71875 z M 7.0625 38.90625 L 3.9375 42 L 1.4375 39.46875 L 1.4375 46.96875 L 8.78125 46.96875 L 6.40625 44.59375 L 9.53125 41.375 L 7.0625 38.90625 z');
Ui.Icon.register('unfullscreen', 'M 6.53125 1.40625 C 3.7812459 1.40625 1.53125 3.6562459 1.53125 6.40625 L 1.53125 41.375 C 1.53125 44.125004 3.781246 46.40625 6.53125 46.40625 L 41.53125 46.40625 C 44.281254 46.40625 46.53125 44.125004 46.53125 41.375 L 46.53125 6.40625 C 46.53125 3.656246 44.281254 1.40625 41.53125 1.40625 L 6.53125 1.40625 z M 6.53125 4.46875 L 41.53125 4.46875 C 42.629284 4.46875 43.46875 5.308217 43.46875 6.40625 L 43.46875 41.375 C 43.46875 42.473032 42.629284 43.3125 41.53125 43.3125 L 6.53125 43.3125 C 5.433217 43.3125 4.625 42.473032 4.625 41.375 L 4.625 6.40625 C 4.625 5.3082171 5.4332171 4.46875 6.53125 4.46875 z M 39.375 5.78125 L 36.25 8.90625 L 33.71875 6.375 L 33.71875 13.84375 L 41.0625 13.84375 L 38.71875 11.5 L 41.84375 8.25 L 39.375 5.78125 z M 9.21875 6.40625 L 6.75 8.875 L 9.84375 12 L 7.3125 14.53125 L 14.8125 14.53125 L 14.8125 7.1875 L 12.4375 9.53125 L 9.21875 6.40625 z M 7.75 33.1875 L 10.09375 35.5625 L 6.96875 38.78125 L 9.4375 41.25 L 12.5625 38.15625 L 15.09375 40.6875 L 15.09375 33.1875 L 7.75 33.1875 z M 33.5 33.625 L 33.5 40.96875 L 35.84375 38.625 L 39.09375 41.71875 L 41.5625 39.25 L 38.4375 36.15625 L 40.96875 33.625 L 33.5 33.625 z');
Ui.Icon.register('thumb', 'M 4.15625 11.84375 L 4.15625 21.84375 L 14.15625 21.84375 L 14.15625 11.84375 L 4.15625 11.84375 z M 19.15625 11.84375 L 19.15625 21.84375 L 29.15625 21.84375 L 29.15625 11.84375 L 19.15625 11.84375 z M 34.15625 11.84375 L 34.15625 21.84375 L 44.15625 21.84375 L 44.15625 11.84375 L 34.15625 11.84375 z M 4.15625 26.84375 L 4.15625 36.84375 L 14.15625 36.84375 L 14.15625 26.84375 L 4.15625 26.84375 z M 19.15625 26.84375 L 19.15625 36.84375 L 29.15625 36.84375 L 29.15625 26.84375 L 19.15625 26.84375 z');
Ui.Icon.register('tools', 'M 10.0625 1.84375 C 9.3364045 1.84375 8.6394735 1.947946 7.96875 2.125 L 11.375 5.53125 C 12.779786 6.9360357 12.666423 9.3335769 11.09375 10.90625 C 9.5210769 12.478923 7.1235357 12.623536 5.71875 11.21875 L 2.1875 7.6875 C 1.9600984 8.4402891 1.84375 9.2358617 1.84375 10.0625 C 1.84375 14.599125 5.5258752 18.28125 10.0625 18.28125 C 10.509115 18.28125 10.947724 18.256096 11.375 18.1875 L 38.15625 44.9375 C 39.561036 46.342286 42.204505 45.951745 44.09375 44.0625 C 45.982995 42.173255 46.373536 39.529786 44.96875 38.125 L 18.1875 11.3125 C 18.249824 10.904613 18.28125 10.487809 18.28125 10.0625 C 18.28125 5.5258752 14.599125 1.84375 10.0625 1.84375 z M 43.625 2.75 L 33.4375 9.8125 L 32.53125 13.5625 L 27.96875 17.90625 L 31.40625 21.21875 L 35.875 16.8125 L 39.40625 15.875 L 46.65625 5.78125 L 43.625 2.75 z M 15.03125 25.90625 C 7.8033753 33.086151 7.2145886 33.648419 2.03125 38.78125 C 0.72083335 40.091667 1.3282724 42.797022 3.375 44.84375 L 3.78125 45.28125 C 5.8279776 47.327978 8.5333334 47.904167 9.84375 46.59375 C 15.445521 41.004056 17.293476 39.184722 22.78125 33.75 L 21.375 32.375 L 9.4375 44.3125 C 8.9976541 44.752346 8.2764647 44.776465 7.84375 44.34375 L 7.8125 44.28125 C 7.3797853 43.848535 7.3726541 43.158596 7.8125 42.71875 L 19.75 30.78125 L 17.96875 28.96875 L 6.09375 40.8125 C 5.6539041 41.252346 4.963964 41.276464 4.53125 40.84375 L 4.5 40.78125 C 4.0672853 40.348535 4.0601541 39.658596 4.5 39.21875 L 16.46875 27.34375 L 15.03125 25.90625 z M 40.53125 36.84375 C 42.405073 36.84375 43.9375 38.376177 43.9375 40.25 C 43.9375 42.123823 42.405073 43.65625 40.53125 43.65625 C 38.657427 43.65625 37.15625 42.123823 37.15625 40.25 C 37.15625 38.376177 38.657427 36.84375 40.53125 36.84375 z');
Ui.Icon.register('play', 'm 8.2857143,3.8571429 34.9999997,20.0000001 -34.9999997,20 z');
Ui.Icon.register('pause', 'm 11.857143,4.1428571 0,39.9999999 10,0 0,-39.9999999 -10,0 z m 15,0 0,39.9999999 10,0 0,-39.9999999 -10,0 z');
Ui.Icon.register('savedisk', 'M 21.40625 4.875 L 21.40625 18.21875 L 18.09375 14.875 L 14.75 18.21875 L 24.75 28.21875 L 34.75 18.21875 L 31.40625 14.875 L 28.09375 18.21875 L 28.09375 4.875 L 21.40625 4.875 z M 14.78125 24.71875 L 6.875 31.71875 L 6.875 41.71875 L 41.875 41.71875 L 41.875 31.71875 L 33.78125 24.71875 L 29.9375 24.71875 L 26.9375 27.71875 L 31.875 27.71875 L 36.875 31.71875 L 11.875 31.71875 L 16.6875 27.71875 L 22.375 27.71875 L 19.375 24.71875 L 14.78125 24.71875 z M 11.875 33.71875 L 36.875 33.71875 L 36.875 38.71875 L 11.875 38.71875 L 11.875 33.71875 z');
Ui.Icon.register('savecloud2', 'M 18.925659,0.85824567 C 18.466137,0.87874855 18.003081,0.91002316 17.536594,0.9650968 13.362924,1.7467762 10.354728,4.6672589 8.5254823,8.3734417 4.0378644,9.813485 0.68973223,13.8927 0.68973223,18.844853 c 0,6.125009 4.99228227,11.127337 11.11251777,11.148135 0.01276,4.3e-5 0.02284,0 0.03562,0 l 4.737067,-4.365632 c -1.582261,0.0085 -3.146117,-0.377948 -4.737067,-0.371435 -3.5744989,0 -6.3754507,-2.836462 -6.3754507,-6.411068 0,-3.132226 2.201163,-5.57977 5.1288547,-6.161749 l 1.282213,-0.284936 0.498639,-1.246597 c 1.233002,-3.2144752 4.272134,-5.5206414 7.942601,-5.5206414 3.23259,0 6.045809,1.7834186 7.515196,4.4165134 l 0.96166,1.709618 c 0.998006,-0.382707 2.139449,-0.642362 3.098683,-0.747958 2.071738,0 3.76846,1.379977 4.202811,3.276768 l 0.391788,1.780852 1.816469,0.106851 c 2.418062,0.128106 4.202812,1.997185 4.202812,4.452131 0,2.539231 -1.948541,4.487748 -4.487748,4.487748 -1.033002,0 -2.035388,-0.0019 -3.063066,0 l 4.630216,4.630215 c 4.364358,-0.748996 7.728899,-4.549598 7.728899,-9.117963 0,-4.362392 -3.120225,-7.864218 -7.194643,-8.833027 -1.389825,-3.245245 -4.507316,-5.5918757 -8.227538,-5.5918757 -0.31137,0 -0.585584,0.1113395 -0.890426,0.1424682 C 28.564553,3.0571996 24.70393,0.85824567 20.314724,0.85824567 c -0.50564,-0.0269379 -0.929544,-0.0205029 -1.389065,0 z M 24.731237,20.80379 13.333783,32.201245 l 3.811024,3.84664 3.775406,-3.84664 0,15.244095 7.622048,0 0,-15.244095 3.775407,3.84664 3.811024,-3.84664 z');
Ui.Icon.register('mask', 'm 3.74,18.99 c 0.44,9.20 4.38,18.61 11.95,24.17 4.08,3.06 9.87,4.52 14.60,2.05 5.97,-3.13 9.76,-9.20 12.197133,-15.293521 3.414999,-8.8245 3.932861,-18.843926 0.950976,-27.8646626 C 38.310743,4.4704945 32.727896,5.9868712 27.03672,5.9943319 19.958912,6.293711 13.019189,4.4574879 6.4266049,2.0478522 4.4742764,7.4565945 3.4616896,13.23241 3.7424481,18.988404 z M 34.535245,15.557069 c 1.987764,-0.989965 5.640663,1.357904 5.475148,4.24902 -1.665611,-0.672877 -3.538893,-1.546511 -5.522954,-0.62016 -1.665542,0.777635 -2.409065,1.901635 -3.562775,2.449806 -1.155929,-2.895182 0.63153,-5.14092 3.610581,-6.078666 z m -6.89125,18.340348 c 4.694403,-0.874832 8.269298,-2.869329 10.344911,-7.136025 -0.714728,7.030404 -7.013746,11.815598 -14.18948,10.881943 -4.488488,-0.470107 -8.281739,-4.204006 -8.955984,-8.645415 2.817723,3.994704 8.050456,5.894049 12.800553,4.899497 z M 12.821029,21.201077 c 0.634185,-4.112248 5.60789,-6.027859 9.134551,-3.621197 2.048586,1.31704 2.499819,3.593051 1.49747,5.801003 -1.325506,-1.072323 -2.122194,-2.448113 -4.184278,-2.56 -2.41,-0.50 -4.36,0.07 -6.22,1.47 -0.61,0.23 -0.23,-0.84 -0.23,-1.093 z');
Ui.Icon.register('share', 'M 35.15625 1.4375 C 31.014114 1.4375 27.65625 4.795364 27.65625 8.9375 C 27.65625 9.2720571 27.676295 9.5832816 27.71875 9.90625 L 14.15625 18.03125 C 12.898871 17.079306 11.354924 16.5 9.65625 16.5 C 5.5141144 16.5 2.15625 19.857864 2.15625 24 C 2.15625 28.142136 5.5141144 31.5 9.65625 31.5 C 11.354924 31.5 12.898871 30.920694 14.15625 29.96875 L 27.78125 38.15625 C 27.738909 38.478794 27.71875 38.82215 27.71875 39.15625 C 27.71875 43.298386 31.076614 46.65625 35.21875 46.65625 C 39.360886 46.65625 42.71875 43.298386 42.71875 39.15625 C 42.71875 35.014114 39.360886 31.65625 35.21875 31.65625 C 33.599996 31.65625 32.10059 32.159189 30.875 33.03125 L 17.09375 24.78125 C 17.119355 24.529122 17.15625 24.258883 17.15625 24 C 17.15625 23.741117 17.119355 23.470878 17.09375 23.21875 L 30.78125 15.03125 C 32.00986 15.910429 33.530263 16.4375 35.15625 16.4375 C 39.298386 16.4375 42.65625 13.079636 42.65625 8.9375 C 42.65625 4.795364 39.298386 1.4375 35.15625 1.4375 z');
Ui.Icon.register('pen', 'm 35.491031,1.9380056 c -0.880041,-0.0019 -1.665618,0.25809 -2.25,0.8125 L 7.2097806,28.719256 c -1.081049,1.081049 -1.081049,2.856993 0,3.9375 1.080507,1.081049 2.8257434,1.081049 3.9062504,0 L 34.397281,9.4067556 c 0.325127,-0.281777 0.847379,-0.277621 1.15625,0.03125 0.308329,0.308871 0.312485,0.7675394 0.03125,1.0937504 l 0,0.03125 -22.03125,22 c -1.833719,1.833719 -1.833719,4.822531 0,6.65625 1.833177,1.833177 4.823073,1.833177 6.65625,0 l 24.5625,-24.5625 c 0.06773,-0.06774 0.1241,-0.147222 0.1875,-0.21875 1.627805,-1.913375 0.470025,-5.6862252 -2.78125,-8.9375002 -2.279584,-2.279956 -4.751409,-3.558416 -6.6875,-3.5625 z M 5.8035306,35.781756 c -0.629799,-0.0038 -1.217236,0.248215 -1.625,0.65625 -0.389069,0.389069 -0.65969,0.915496 -0.8125,1.5625 l -0.96875,4.1875 c -0.258476,1.098931 -1.067342,2.993711 -0.40625,3.625 0.658925,0.631289 2.695866,-0.10063 3.78125,-0.40625 l 4.0625,-1.15625 c 0.5955254,-0.167441 1.1018984,-0.445648 1.4687504,-0.8125 0.442715,-0.442715 0.661127,-0.992264 0.65625,-1.59375 -0.0065,-0.725034 -0.321746,-1.437171 -0.96875,-2.0625 l -3.1875004,-3.0625 c -0.679787,-0.657299 -1.370201,-0.933707 -2,-0.9375 z');
Ui.Icon.register('resource', 'M 12.8125 3.875 C 9.1508311 3.875 6.125 6.9008 6.125 10.5625 L 6.125 37.21875 C 6.125 40.88035 9.1508311 43.875 12.8125 43.875 L 35.46875 43.875 C 39.130419 43.875 42.125 40.88035 42.125 37.21875 L 42.125 10.5625 C 42.125 6.9008 39.130419 3.875 35.46875 3.875 L 12.8125 3.875 z M 10.125 16.46875 L 38.125 16.46875 L 38.125 37.21875 C 38.125 38.73355 36.983608 39.875 35.46875 39.875 L 12.8125 39.875 C 11.297642 39.875 10.125 38.73355 10.125 37.21875 L 10.125 16.46875 z');
Ui.Icon.register('resource-comment', 'M 15 1.96875 C 7.3023577 1.96875 0.78125 7.1875 0.78125 13.9375 C 0.78125 20.6875 7.3023577 25.875 15 25.875 C 16.346252 25.875 17.636341 25.63815 18.875 25.34375 C 23.297706 28.31325 28.03125 27.25 28.03125 27.25 L 30.5625 26.59375 L 28.6875 24.78125 C 28.6875 24.78125 27.986264 24.1144 27.1875 23.25 C 26.650882 22.6693 26.28985 22.1178 25.875 21.5625 C 27.917227 19.5116 29.21875 16.8785 29.21875 13.9375 C 29.21875 7.1875 22.697407 1.96875 15 1.96875 z M 15 4.875 C 21.409475 4.875 26.3125 9.0945 26.3125 13.9375 C 26.3125 16.3945 25.117941 18.6359 23.03125 20.3125 L 22.09375 21.0625 L 22.65625 22.125 C 23.108689 22.9611 23.821875 23.7378 24.5 24.5 C 23.171481 24.3515 21.569059 23.92875 20 22.71875 L 19.4375 22.28125 L 18.71875 22.46875 C 17.55345 22.79525 16.310816 22.96865 15 22.96875 C 8.5902415 22.96875 3.6875 18.7803 3.6875 13.9375 C 3.6875 9.0945 8.5902415 4.875 15 4.875 z M 30.34375 12.125 C 30.446203 12.7438 30.53125 13.3499 30.53125 14 C 30.53125 17.2197 29.120287 20.10555 26.96875 22.34375 C 27.382667 22.77555 27.59375 23 27.59375 23 L 43.71875 23 L 43.71875 40.90625 C 43.71875 42.21385 42.713889 43.1875 41.40625 43.1875 L 21.84375 43.1875 C 20.536111 43.1875 19.53125 42.21385 19.53125 40.90625 L 19.53125 27.53125 C 19.144904 27.30055 18.749593 27.0441 18.375 26.75 C 17.620347 26.8923 16.866022 27.0431 16.09375 27.125 L 16.09375 40.90625 C 16.09375 44.06695 18.682966 46.65625 21.84375 46.65625 L 41.40625 46.65625 C 44.567034 46.65625 47.15625 44.06695 47.15625 40.90625 L 47.15625 17.90625 C 47.15625 14.74545 44.567034 12.125 41.40625 12.125 L 30.34375 12.125 z');
Ui.Icon.register('group','m 23.130121,8.752257 c -1.726597,0.098014 -3.104222,0.7517754 -2.666061,1.454215 -2.467192,-0.4542201 -1.908658,5.120049 -1.908658,5.120049 l 0.545331,1.454215 c -1.051264,0.676063 -0.308371,1.48013 -0.272665,2.423692 0.05151,1.391344 0.878588,1.120958 0.878588,1.120958 0.05326,2.296858 1.211846,2.575172 1.211846,2.575172 0.160674,1.081701 0.118381,1.213218 0.09089,1.211846 l -1.030069,0.121185 c 0.04507,0.364663 -0.09089,0.969476 -0.09089,0.969476 -1.195842,0.527974 -1.450459,0.848231 -2.635765,1.363327 -2.291004,0.997412 -4.768424,2.282745 -5.210937,4.029388 -0.442514,1.746642 -1.757177,8.664698 -1.757177,8.664698 l 26.812091,0 c 0,-1.816297 -2.060138,-9.51299 -2.060138,-9.51299 0,-1.122089 -1.45177,-2.403325 -4.362645,-3.1508 -1.510167,-0.387492 -2.787246,-1.242142 -2.787246,-1.242142 -0.186722,-0.105945 -0.151481,-1.090661 -0.151481,-1.090661 l -0.93918,-0.151481 c 0,-0.08019 -0.09089,-1.242142 -0.09089,-1.242142 1.121504,-0.37403 0.999773,-2.575173 0.999773,-2.575173 0.712354,0.392175 1.18155,-1.363326 1.18155,-1.363326 0.842299,-2.426218 -0.424146,-2.272211 -0.424146,-2.272211 0.400955,-1.815712 0,-4.48383 0,-4.48383 C 28.14682,9.4116558 25.350031,8.6262386 23.130121,8.752257 z M 8.8909315,11.32743 c -1.805176,1.126771 -1.5039686,2.802483 -1.4542151,3.787018 0.033365,0.66143 0.1211846,1.120958 0.1211846,1.120958 -0.7328405,0.31491 -0.3519884,0.740165 -0.3332576,1.817768 0.023414,1.490851 0.7574037,1.242143 0.7574037,1.242143 0.3459335,2.03053 1.4239189,3.271984 1.4239189,3.271984 0,0 -0.3082495,1.748578 -0.424146,1.969249 -0.3324708,0.07434 -1.0849274,0.601644 -2.6963572,1.272438 -2.3747079,0.988047 -1.6421662,0.397523 -3.5749455,1.363327 -3.0548682,1.527727 -2.45398793,7.907295 -2.45398793,7.907295 l 9.63417503,0 0.9694766,-4.48383 0,-0.06059 0.0303,-0.06059 c 0.655577,-2.830685 4.045795,-4.187589 5.907749,-4.998864 -1.130284,-0.516267 -1.72034,-0.875964 -1.999546,-0.939181 -0.11414,-0.228866 -0.363554,-1.969249 -0.363554,-1.969249 0,0 1.361329,-1.21574 1.666288,-3.514354 0,0 0.685549,0.368884 0.727108,-1.030069 0.03102,-1.077603 0.188095,-1.472562 -0.545331,-1.787472 0,0 0.06748,-0.761904 0.09089,-1.423919 0.03629,-0.981024 0.212963,-2.346306 -1.484511,-3.453761 C 14.648415,11.200275 13.413257,10.505926 13.405062,10.509439 12.961377,10.240184 12.405289,10.054996 12.405289,10.054996 10.429138,9.7931513 9.6513809,10.848764 8.8909315,11.32743 z M 37.005757,10.206465 c -1.345103,0.07492 -2.276268,0.636723 -2.908431,1.030069 -0.630991,0.393346 -0.999672,1.196869 -1.272438,1.787473 -0.272181,0.589436 -0.757404,4.15001 -0.757404,4.27176 0,0.120579 -0.152106,1.486407 -0.393849,2.332803 -0.241744,0.846982 -1.060366,2.302507 -1.060366,2.302507 1.136127,0.701936 2.381338,0.97755 3.69613,1.393623 l -0.0303,1.151254 c -0.211306,0.03102 -1.060385,0.57611 -1.18155,0.848292 -0.07902,0.177943 -0.254984,0.476725 -0.424146,0.696811 2.193254,0.884443 3.492555,2.186246 3.54465,3.635538 0.03571,0.258719 1.378122,5.020702 1.454215,6.089526 l 10.118913,0 c 0.0088,-0.0439 -0.300034,-6.194765 -0.302961,-6.241007 0,0 -0.592903,-1.48556 -1.514808,-1.635992 -0.922485,-0.151597 -2.11027,-0.474258 -2.605464,-0.848288 -0.289742,-0.220086 -1.229043,-0.598192 -1.666288,-0.757403 -0.204283,-0.07317 -0.545936,-0.666999 -0.666516,-0.939181 -0.120579,-0.272182 -0.939362,-0.817269 -1.151253,-0.848292 l -0.06059,-1.151254 c 1.282571,-0.333871 2.645628,-0.809405 3.726427,-1.393623 0,0 -0.819207,-1.516703 -1.060366,-2.363099 -0.242329,-0.846982 -0.39385,-2.151632 -0.39385,-2.272211 0,-0.12175 -0.515518,-3.682324 -0.787699,-4.271757 -0.272182,-0.590604 -0.640276,-1.394127 -1.272439,-1.787473 -0.632162,-0.393346 -1.562743,-0.955146 -2.90843,-1.030069 -0.0199,-0.0012 -0.04011,0.0017 -0.06059,0 -0.0199,0.0017 -0.03952,-0.0012 -0.0606,-7e-6 z');
Ui.Icon.register('note','M 44.06787,0.7851872 C 28.491486,0.26722979 15.73318,6.0126519 15.73318,6.0126519 l -0.0093,29.1567271 c -1.585954,-0.629546 -3.514579,-0.778796 -5.473424,-0.302684 -4.223167,1.026151 -6.9887065,4.565837 -6.1768988,7.907453 0.8118076,3.341616 4.8931633,5.219095 9.1158648,4.193409 3.981856,-0.967567 6.666494,-4.170162 6.280118,-7.333236 l 0,0 0,-21.785365 c 0,0 9.021945,-3.15424 20.724342,-3.945124 l 0,16.203141 0,0 c -1.568751,-0.600719 -3.460644,-0.73695 -5.383689,-0.269673 -4.223166,1.025686 -6.988706,4.565372 -6.176898,7.907453 0.811343,3.341616 4.892699,5.218631 9.115865,4.192945 3.687541,-0.895965 6.26338,-3.708929 6.317314,-6.632088 l 0.0014,0.0019 c -4e-6,-11.507441 6e-6,-23.014882 -4e-6,-34.5223228 z');
Ui.Icon.register('radio','m 46.189099,43.018201 0,-25.871376 c 0,-0.737199 -0.629619,-1.335089 -1.404991,-1.335089 l -6.638682,0 -24.631551,-8.7174923 c 0.0352,-0.1799619 0.05453,-0.365873 0.05453,-0.5562458 0,-1.5968517 -1.294437,-2.8917839 -2.891784,-2.8917839 -1.5973475,0 -2.891784,1.2949322 -2.891784,2.8917839 0,1.5968517 1.2944365,2.8917838 2.891784,2.8917838 0.993508,0 1.870016,-0.5017118 2.390567,-1.2651864 l 20.02931,7.6466447 -29.880606,0 c -0.7758687,0 -1.4049915,0.597889 -1.4049915,1.335585 l 0,25.871872 c 0,0.737695 0.6291228,1.335584 1.4049915,1.335089 l 41.568711,0 c 0.775373,0 1.404992,-0.597889 1.404496,-1.335585 z m -5.613026,-5.766215 -21.317796,0 c -0.410987,0 -0.743644,-0.444204 -0.743644,-0.991031 0,-0.547321 0.332657,-0.990533 0.743644,-0.990533 l 21.317796,0 c 0.410492,0 0.743644,0.443212 0.743644,0.990533 0,0.547323 -0.333152,0.991031 -0.743644,0.991031 z m 0,-4.456411 -21.317796,0 c -0.410987,0 -0.743644,-0.444204 -0.743644,-0.991031 0,-0.547321 0.332657,-0.990533 0.743644,-0.990533 l 21.317796,0 c 0.410492,0 0.743644,0.443707 0.743644,0.990533 0,0.546827 -0.333152,0.991031 -0.743644,0.991031 z m 0,-4.454924 -21.317796,0 c -0.410987,0 -0.743644,-0.443708 -0.743644,-0.991526 0,-0.547322 0.332657,-0.990534 0.743644,-0.990534 l 21.317796,0 c 0.410492,-4.95e-4 0.743644,0.443708 0.743644,0.990534 0,0.547818 -0.333152,0.991526 -0.743644,0.991526z');
Ui.Icon.register('book','m 24,9.9639828 c 0,0 -5.614406,-5.6144067 -22.4576276,-5.6144067 l 0,33.6864409 C 18.561212,38.036017 24,43.650424 24,43.650424 c 0,0 5.438789,-5.876576 22.457628,-5.876576 l 0,-33.4242719 C 29.614407,4.3495761 24,9.9639828 24,9.9639828 z m -16.8432207,0 C 14.292916,10.561356 18.670805,12.211991 21.192797,13.549568 l 0,22.611237 C 18.670805,34.828619 14.292916,33.177983 7.1567793,32.57522 z M 40.843221,32.57522 c -7.138831,0.603212 -11.51672,2.253848 -14.036017,3.585585 l 0,-22.611237 c 2.519297,-1.338026 6.897186,-2.988212 14.036017,-3.5855852 z');
Ui.Icon.register('camera', 'M 45,45 3,45 C 1.341,45 0,43.659 0,42 L 0,12 C 0,10.344 1.341,9 3,9 l 9,0 0,-3 c 0,-1.656 1.341,-3 3,-3 l 18,0 c 1.659,0 3,1.344 3,3 l 0,3 9,0 c 1.659,0 3,1.344 3,3 l 0,30 c 0,1.659 -1.341,3 -3,3 z m -3,-30 -9,0 -3,0 0,-6 -12,0 0,6 -3,0 -9,0 0,24 36.40678,0 z M 10.5,18 C 11.328,18 12,18.672 12,19.5 12,20.328 11.328,21 10.5,21 9.672,21 9,20.328 9,19.5 9,18.672 9.672,18 10.5,18 z M 24,18 c 4.971,0 9,4.029 9,9 0,4.968 -4.029,9 -9,9 -4.971,0 -9,-4.032 -9,-9 0,-4.971 4.029,-9 9,-9 z m 0,15 c 3.312,0 6,-2.688 6,-6 0,-3.312 -2.688,-6 -6,-6 -3.312,0 -6,2.688 -6,6 0,3.312 2.688,6 6,6 z');
Ui.Icon.register('stats', 'M 13.1875,2.40625 C 6.8058707,2.40625 1.59375,7.6183707 1.59375,14 c 0,6.381629 5.2121207,11.59375 11.59375,11.59375 6.381629,0 11.59375,-5.212121 11.59375,-11.59375 0,-6.3816293 -5.212121,-11.59375 -11.59375,-11.59375 z m -0.75,4.21875 c 0.0104,-0.00105 0.02084,0.001 0.03125,0 l 0.125,7.40625 6.96875,3.75 c -1.286674,2.170122 -3.652079,3.625 -6.375,3.625 -4.1117809,0 -7.40625,-3.294469 -7.40625,-7.40625 0,-3.854795 2.9063058,-6.998001 6.65625,-7.375 z m 15.25,7.375 0,30 5,0 0,-30 -5,0 z m 10,5 0,24.9375 5.3125,0 L 43,19 37.6875,19 z m -20,10 0,15 5,0 0,-15 -5,0 z');
Ui.Icon.register('picasa', 'm 24.044065,1.2054636 c -3.683387,0 -7.140941,0.8842703 -10.215992,2.4429546 L 34.074984,18.565248 38.257618,6.1654017 C 34.371993,3.0409341 29.418138,1.2054636 24.044065,1.2054636 z M 11.97735,4.6848231 C 5.618278,8.7008337 1.391213,15.781289 1.391213,23.858316 c 0,1.291582 0.1256694,2.54288 0.3331302,3.775475 L 22.304385,12.642933 11.97735,4.6848231 z M 40.071327,7.794038 c -1.150472,3.393746 -5.433262,15.926968 -8.180196,24.133431 l 13.362221,-0.111044 c 0.934433,-2.483233 1.480579,-5.148174 1.480579,-7.958109 0,-6.279417 -2.538197,-11.958518 -6.662604,-16.064278 z M 13.050769,21.859534 2.1685168,29.743615 C 4.4704985,38.302387 11.666595,44.832301 20.564705,46.215051 L 13.050769,21.859534 z M 44.40202,33.815206 c -3.774474,0.0027 -16.828153,0.03701 -25.465952,0.03701 l 4.108606,12.621932 c 0.337346,0.0149 0.658371,0.07403 0.999391,0.07403 8.941546,0 16.667186,-5.213673 20.357955,-12.732976 z');
Ui.Icon.register('newspaper', 'M 7 1.5 C 6.9991798 1.5 6.406959 1.6247011 6.40625 1.625 C 6.405541 1.6252989 5.9380352 1.9369648 5.9375 1.9375 C 5.9369648 1.9380352 5.6252989 2.405541 5.625 2.40625 C 5.6247011 2.406959 5.5 2.9991798 5.5 3 L 5.5 46 C 5.5 46.00082 5.6247011 46.593041 5.625 46.59375 C 5.6252989 46.594459 5.9369648 47.061965 5.9375 47.0625 C 5.9380352 47.063035 6.405541 47.374701 6.40625 47.375 C 6.406959 47.375299 6.9991798 47.5 7 47.5 L 42 47.5 C 42.00082 47.5 42.593041 47.375299 42.59375 47.375 C 42.594459 47.374701 43.061965 47.063035 43.0625 47.0625 C 43.063035 47.061965 43.374701 46.594459 43.375 46.59375 C 43.375299 46.593041 43.5 46.00082 43.5 46 L 43.5 3 C 43.5 2.9991798 43.375299 2.406959 43.375 2.40625 C 43.374701 2.405541 43.063035 1.9380352 43.0625 1.9375 C 43.061965 1.9369648 42.594459 1.6252989 42.59375 1.625 C 42.593041 1.6247011 42.00082 1.5 42 1.5 L 7 1.5 z M 8.5 4.5 L 40.5 4.5 L 40.5 44.5 L 8.5 44.5 L 8.5 4.5 z M 12 8 L 12 17 L 21 17 L 21 8 L 12 8 z M 24 8 L 24 10 L 38 10 L 38 8 L 24 8 z M 24 12 L 24 14 L 38 14 L 38 12 L 24 12 z M 24 16 L 24 18 L 38 18 L 38 16 L 24 16 z M 12 20 L 12 22 L 38 22 L 38 20 L 12 20 z M 12 24 L 12 26 L 38 26 L 38 24 L 12 24 z M 12 28 L 12 30 L 38 30 L 38 28 L 12 28 z M 12 32 L 12 34 L 38 34 L 38 32 L 12 32 z M 12 36 L 12 38 L 38 38 L 38 36 L 12 36 z M 12 40 L 12 42 L 38 42 L 38 40 L 12 40 z');
Ui.Icon.register('files', 'm 18.9375,1.9375 c -6.06e-4,0 -0.436976,0.093529 -0.4375,0.09375 -5.24e-4,2.209e-4 -0.343355,0.2183545 -0.34375,0.21875 -3.95e-4,3.955e-4 -0.249779,0.3432261 -0.25,0.34375 -2.21e-4,5.239e-4 -0.09375,0.4368939 -0.09375,0.4375 l 0,4.21875 c -2.27779,-0.00646 -2.977884,0.018659 -6.1875,0 -6.06e-4,0 -0.436976,0.093529 -0.4375,0.09375 -5.24e-4,2.209e-4 -0.343355,0.2183545 -0.34375,0.21875 -3.95e-4,3.955e-4 -0.249779,0.3432261 -0.25,0.34375 C 10.593529,7.9067739 10.5,8.3431439 10.5,8.34375 l 0,3.6875 2.21875,0 0,-2.5625 7.3125,0 0,-5.3125 16.46875,0 0,5.84375 c 0,6.06e-4 0.09353,0.436976 0.09375,0.4375 2.21e-4,5.24e-4 0.249605,0.343355 0.25,0.34375 3.95e-4,3.95e-4 0.343226,0.218529 0.34375,0.21875 5.24e-4,2.21e-4 0.436894,0.09375 0.4375,0.09375 l 6.0625,0 0,22.625 -5.09375,0 c -1.41e-4,-9.172465 0,-19.53125 0,-19.53125 l -7.125,-6.90625 0,2.6875 4.40625,4.21875 -4.46875,0 0,-6.9375 C 31.38601,7.2502347 27.689866,7.292833 20.0625,7.28125 l 0,2.1875 9.125,0 0,5.84375 c 0,6.06e-4 0.09353,0.436976 0.09375,0.4375 2.21e-4,5.24e-4 0.218355,0.343355 0.21875,0.34375 3.95e-4,3.95e-4 0.374476,0.218529 0.375,0.21875 5.24e-4,2.21e-4 0.436894,0.09375 0.4375,0.09375 l 6.0625,0 0,22.625 -5.6875,0 0,-20.03125 -7.125,-6.875 0,2.65625 L 27.96875,19 23.5,19 l 0,-6.9375 -10.71875,0.03125 0,2.1875 8.5,0 0,5.84375 c 0,6.06e-4 0.09353,0.436976 0.09375,0.4375 2.21e-4,5.24e-4 0.218355,0.343355 0.21875,0.34375 3.95e-4,3.95e-4 0.343226,0.218529 0.34375,0.21875 5.24e-4,2.21e-4 0.436894,0.09375 0.4375,0.09375 l 6.09375,0 0,22.59375 -23.65625,0 0,-29.53125 7.90625,0 0,-2.21875 c -2.9797505,-0.0028 -6.5309745,0.0017 -9,0 -6.061e-4,0 -0.4682261,0.09353 -0.46875,0.09375 -5.239e-4,2.21e-4 -0.3433545,0.218355 -0.34375,0.21875 -3.955e-4,3.95e-4 -0.2185291,0.343226 -0.21875,0.34375 -2.209e-4,5.24e-4 -0.09375,0.436894 -0.09375,0.4375 l 0,31.78125 c 0,6.06e-4 0.093529,0.436976 0.09375,0.4375 2.209e-4,5.24e-4 0.2183545,0.343355 0.21875,0.34375 3.955e-4,3.95e-4 0.3432261,0.218529 0.34375,0.21875 5.239e-4,2.21e-4 0.4681439,0.09375 0.46875,0.09375 l 25.84375,0 c 6.06e-4,0 0.436976,-0.09353 0.4375,-0.09375 5.24e-4,-2.21e-4 0.343355,-0.218355 0.34375,-0.21875 3.95e-4,-3.95e-4 0.249779,-0.343226 0.25,-0.34375 2.21e-4,-5.24e-4 0.09375,-0.436894 0.09375,-0.4375 -7.8e-5,-1.289078 2.4e-5,-2.530694 0,-3.71875 l 6.78125,0 c 6.06e-4,0 0.436976,-0.06228 0.4375,-0.0625 5.24e-4,-2.21e-4 0.374605,-0.249605 0.375,-0.25 3.95e-4,-3.95e-4 0.218529,-0.343226 0.21875,-0.34375 2.21e-4,-5.24e-4 0.09375,-0.436894 0.09375,-0.4375 -1.55e-4,-2.096577 6.7e-5,-2.1471 0,-4.1875 l 6.1875,0 c 6.06e-4,0 0.468226,-0.09353 0.46875,-0.09375 5.24e-4,-2.21e-4 0.343355,-0.249605 0.34375,-0.25 3.95e-4,-3.95e-4 0.218529,-0.343226 0.21875,-0.34375 2.21e-4,-5.24e-4 0.09375,-0.436894 0.09375,-0.4375 -9.61e-4,-12.986263 0,-25.9375 0,-25.9375 L 38.75,1.9375 l 0,2.71875 4.4375,4.21875 -4.46875,0 0,-6.9375 c -0.02606,8.413e-4 -3.028173,0.097394 -19.78125,0 z');
Ui.Icon.register('help', 'M 24 2.375 C 12.051981 2.375 2.375 12.051981 2.375 24 C 2.375 35.94802 12.051981 45.625 24 45.625 C 35.948019 45.625 45.625 35.94802 45.625 24 C 45.625 12.051981 35.948019 2.375 24 2.375 z M 24.46875 5.9375 C 26.596734 5.9375354 28.337399 6.2464518 29.71875 6.84375 C 31.100063 7.403784 32.184728 8.1101166 32.96875 8.96875 C 33.752727 9.8274482 34.29506 10.767198 34.59375 11.8125 C 34.929726 12.820529 35.093725 13.785445 35.09375 14.71875 C 35.093725 15.801443 34.885476 16.791525 34.4375 17.6875 C 34.02681 18.583523 33.484477 19.434772 32.8125 20.21875 C 32.177812 21.002771 31.465396 21.759437 30.71875 22.46875 C 29.972064 23.140769 29.265731 23.796768 28.59375 24.46875 C 27.959066 25.140767 27.416733 25.853183 26.96875 26.5625 C 26.558067 27.271848 26.374984 27.997264 26.375 28.78125 L 20.09375 28.78125 C 20.05641 28.594597 20.03124 28.310847 20.03125 27.9375 C 20.03124 26.444182 20.43474 25.031517 21.21875 23.6875 C 22.002739 22.306186 23.011904 21.107854 24.28125 20.0625 C 25.139902 19.353189 25.940818 18.596523 26.6875 17.8125 C 27.43415 16.991192 27.812483 16.120859 27.8125 15.1875 C 27.812483 14.067528 27.408983 13.216279 26.625 12.65625 C 25.840985 12.058946 24.882152 11.75003 23.6875 11.75 C 22.492821 11.75003 21.307489 11.939197 20.1875 12.3125 C 19.067491 12.648529 17.869159 13.146612 16.5625 13.78125 L 14.65625 8.53125 C 15.962911 7.7099503 17.495326 7.0730343 19.25 6.625 C 21.004656 6.1770352 22.751404 5.9375354 24.46875 5.9375 z M 23.6875 32.8125 C 24.28482 32.812509 24.846236 32.932259 25.40625 33.15625 C 25.966235 33.342925 26.464317 33.651842 26.875 34.0625 C 27.322983 34.435841 27.67615 34.902674 27.9375 35.5 C 28.198816 36.060006 28.312482 36.696922 28.3125 37.40625 C 28.312482 38.862253 27.845649 39.991169 26.875 40.8125 C 25.941651 41.633834 24.882152 42.0625 23.6875 42.0625 C 23.090154 42.0625 22.497488 41.94275 21.9375 41.71875 C 21.377489 41.532084 20.88549 41.223167 20.4375 40.8125 C 19.989491 40.401835 19.636324 39.935002 19.375 39.375 C 19.113658 38.815003 18.968742 38.15292 18.96875 37.40625 C 18.968742 36.696922 19.113658 36.060006 19.375 35.5 C 19.636324 34.902674 19.989491 34.435841 20.4375 34.0625 C 20.88549 33.651842 21.377489 33.342925 21.9375 33.15625 C 22.497488 32.932259 23.090154 32.812509 23.6875 32.8125 z');
Ui.Icon.register('uploadfile', 'M 8.0625 2.21875 C 8.0617248 2.21875 7.4694201 2.3434686 7.46875 2.34375 C 7.4680799 2.3440327 7.0317558 2.6244948 7.03125 2.625 C 7.0307442 2.6255052 6.7502825 3.0618298 6.75 3.0625 C 6.7497175 3.0631702 6.625 3.6242249 6.625 3.625 L 6.625 44.28125 C 6.625 44.282025 6.7497173 44.84308 6.75 44.84375 C 6.7502825 44.84442 7.0307442 45.280745 7.03125 45.28125 C 7.0317558 45.281755 7.4680799 45.562217 7.46875 45.5625 C 7.4694201 45.562783 8.0617248 45.65625 8.0625 45.65625 L 41.125 45.65625 C 41.125775 45.65625 41.68683 45.562781 41.6875 45.5625 C 41.68817 45.562217 42.124495 45.281755 42.125 45.28125 C 42.125505 45.280745 42.437217 44.84442 42.4375 44.84375 C 42.437783 44.84308 42.5625 44.282025 42.5625 44.28125 C 42.767515 33.395948 42.5625 22.367308 42.5625 11.09375 L 33.4375 2.3125 L 33.40625 6.625 L 38.15625 11.09375 L 33.375 11.09375 L 33.375 2.21875 C 24.475085 2.2568748 16.581521 2.22416 8.0625 2.21875 z M 30.25 5.5625 L 30.25 13.03125 C 30.25 13.032025 30.374719 13.59308 30.375 13.59375 C 30.375283 13.59442 30.655745 14.030745 30.65625 14.03125 C 30.656755 14.031755 31.09308 14.312217 31.09375 14.3125 C 31.09442 14.312783 31.655475 14.4375 31.65625 14.4375 L 39.4375 14.4375 L 39.4375 42.125 L 9.90625 42.1875 L 9.8125 5.71875 L 30.25 5.5625 z M 23.21875 17.75 L 23.21875 24.75 L 21.5 22.96875 L 19.78125 24.75 L 25 29.96875 L 30.21875 24.75 L 28.5 22.96875 L 26.75 24.75 L 26.75 17.75 L 23.21875 17.75 z M 14.21875 28.75 L 14.21875 34.84375 L 35.5 34.84375 L 35.5 28.75 L 32.46875 28.75 L 32.46875 31.8125 L 17.25 31.8125 L 17.25 28.75 L 14.21875 28.75 z');
Ui.Icon.register('filetools', 'm 28.842851,0.26562499 c -0.370798,0 -0.743188,0.0215878 -1.085709,0.11071641 l 1.759598,1.7345571 c 0.717389,0.7071772 0.65337,1.9024055 -0.149753,2.6940992 -0.803124,0.7916938 -2.015608,0.8548002 -2.732994,0.1476219 L 24.799517,3.181157 c -0.116124,0.3789583 -0.149754,0.8017462 -0.149754,1.2178806 0,2.2837643 1.876352,4.1334132 4.193088,4.1334132 0.228075,0 0.455691,-0.00232 0.673889,-0.036902 L 43.181713,21.92914 c 0.717388,0.707178 2.067712,0.508192 3.032501,-0.442866 0.964788,-0.951058 1.166647,-2.282164 0.44926,-2.989343 L 32.998501,5.0264304 c 0.03183,-0.2053325 0.03745,-0.4132892 0.03745,-0.6273928 0,-2.2837648 -1.876351,-4.13341261 -4.193088,-4.13341261 z M 45.989584,0.70849073 40.785663,4.2514157 40.298965,6.1335946 37.977792,8.3479225 39.737391,10.008669 42.021127,7.7943407 43.818163,7.3145695 47.524554,2.2216149 z M 8.2892342,5.8752562 c -7.414e-4,0 -0.5609331,0.1104449 -0.5615747,0.1107165 -6.406e-4,2.669e-4 -0.4487753,0.2578611 -0.4492593,0.2583382 -4.839e-4,4.772e-4 -0.2617973,0.442233 -0.2620679,0.4428659 -2.708e-4,6.33e-4 -0.1123149,0.515945 -0.1123149,0.516676 l 0,38.3447832 c 0,7.31e-4 0.1120392,0.55295 0.1123149,0.553581 2.706e-4,6.32e-4 0.261584,0.405483 0.2620679,0.405961 4.84e-4,4.77e-4 0.4486187,0.258071 0.4492593,0.258338 6.416e-4,2.67e-4 0.5608333,0.110717 0.5615747,0.110717 l 31.6353478,0 c 7.42e-4,0 0.523495,-0.110458 0.524137,-0.110717 6.4e-4,-2.67e-4 0.448775,-0.257861 0.449259,-0.258338 4.83e-4,-4.78e-4 0.299235,-0.405329 0.299506,-0.405961 2.71e-4,-6.31e-4 0.112315,-0.55285 0.112315,-0.553581 0.150406,-7.872165 0.08309,-15.840553 0.03745,-23.914745 l -4.032501,-4.095294 0,24.837379 -25.551617,0.07382 -0.112322,-31.861382 18.381218,0.03214 c -4.317916,-0.8330858 -5.894232,-3.2962736 -6.43053,-4.7452988 -5.071425,-4.251e-4 -10.156912,0.00319 -15.3122628,1e-6 z M 31.388654,12.370619 c -3.691087,3.614407 -4.017018,3.874558 -6.664014,6.458457 -0.669195,0.659673 -0.333884,2.032818 0.711327,3.063153 l 0.187192,0.221434 c 1.045211,1.030335 2.438182,1.323971 3.107377,0.664298 2.860679,-2.813887 3.786674,-3.722584 6.589139,-6.458457 l -0.711328,-0.701203 -6.102441,6.01559 c -0.224617,0.221421 -0.565227,0.217831 -0.786203,0 l -0.03745,-0.0369 c -0.220976,-0.217831 -0.224617,-0.553594 0,-0.775015 l 6.10244,-6.015592 -0.898519,-0.88573 -6.065001,5.94178 c -0.224619,0.221421 -0.602667,0.254737 -0.823642,0.0369 l 0,-0.0369 c -0.220976,-0.217831 -0.224619,-0.590499 0,-0.81192 l 6.102445,-5.97869 z m 13.028523,5.498915 c 0.956912,0 1.722161,0.754357 1.722161,1.697652 0,0.943293 -0.765249,1.734555 -1.722161,1.734555 -0.956913,0 -1.7596,-0.791262 -1.7596,-1.734555 0,-0.943295 0.802687,-1.697652 1.7596,-1.697652 z');
Ui.Icon.register('rfidtag', 'M 12.5625 2.4375 C 9.037028 2.4375 6.15625 5.3182785 6.15625 8.84375 L 6.15625 38.28125 C 6.15625 41.806721 9.0370277 44.71875 12.5625 44.71875 L 35.5625 44.71875 C 39.087972 44.71875 42 41.806722 42 38.28125 L 42 8.84375 C 42 5.318278 39.087971 2.4375 35.5625 2.4375 L 12.5625 2.4375 z M 12.5625 6.125 L 35.5625 6.125 C 37.102171 6.125 38.28125 7.304079 38.28125 8.84375 L 38.28125 38.28125 C 38.28125 39.82092 37.10217 41 35.5625 41 L 12.5625 41 C 11.022828 41 9.84375 39.820921 9.84375 38.28125 L 9.84375 8.84375 C 9.84375 7.3040785 11.022828 6.125 12.5625 6.125 z M 24.21875 11.84375 C 19.573065 11.846643 14.910493 13.647585 11.375 17.1875 L 13.0625 18.84375 C 19.231188 12.667346 29.198595 12.643787 35.375 18.8125 C 35.39567 18.833137 35.416945 18.885493 35.4375 18.90625 L 37.09375 17.21875 C 37.070119 17.194883 37.055011 17.179982 37.03125 17.15625 C 33.491335 13.620756 28.864435 11.840847 24.21875 11.84375 z M 24.21875 16.59375 C 20.807024 16.595679 17.375852 17.902152 14.78125 20.5 L 16.46875 22.15625 C 20.755657 17.86398 27.67648 17.869341 31.96875 22.15625 C 31.983104 22.17057 31.985728 22.173132 32 22.1875 L 33.6875 20.53125 C 33.670147 20.513748 33.642449 20.486156 33.625 20.46875 C 31.027152 17.874147 27.630476 16.591619 24.21875 16.59375 z M 24.21875 21.5 C 22.040983 21.501446 19.872462 22.344218 18.21875 24 L 19.875 25.65625 C 22.280126 23.248113 26.154365 23.251098 28.5625 25.65625 C 28.570538 25.664254 28.554506 25.679448 28.5625 25.6875 L 30.25 24.03125 C 30.23893 24.020064 30.229883 23.97984 30.21875 23.96875 C 28.562969 22.315037 26.396517 21.49864 24.21875 21.5 z M 24.21875 25.78125 C 21.746052 25.78125 19.75 27.777303 19.75 30.25 C 19.75 32.722698 21.746052 34.71875 24.21875 34.71875 C 26.691447 34.71875 28.6875 32.722698 28.6875 30.25 C 28.6875 27.777303 26.691447 25.78125 24.21875 25.78125 z');
Ui.Icon.register('facebook', 'M 7.15625 2.15625 C 4.94025 2.15625 3.15625 3.94025 3.15625 6.15625 L 3.15625 42.15625 C 3.15625 44.37225 4.94025 46.15625 7.15625 46.15625 L 42.15625 46.15625 C 44.37225 46.15625 46.15625 44.37225 46.15625 42.15625 L 46.15625 6.15625 C 46.15625 3.94025 44.37225 2.15625 42.15625 2.15625 L 7.15625 2.15625 z M 37.03125 9.1875 C 37.68801 9.1927408 38.391498 9.1964286 39.15625 9.21875 L 39.15625 13.6875 C 37.567149 13.6875 35.637808 13.576474 34.90625 14.59375 C 34.174693 15.611021 34.15625 16.46148 34.15625 21.15625 L 39.15625 21.15625 L 39.15625 26.15625 L 34.15625 26.15625 L 34.15625 43.15625 L 28.15625 43.15625 L 28.15625 26.15625 L 23.15625 26.15625 L 23.15625 21.15625 L 28.15625 21.15625 C 28.15625 14.805452 28.130229 13.408331 29.3125 11.375 C 30.346992 9.5958355 32.433931 9.1508144 37.03125 9.1875 z');
Ui.Icon.register('google', 'M 7.03125 2 C 4.81525 2 3.03125 3.784 3.03125 6 L 3.03125 12.25 C 3.1302477 11.866836 3.238964 11.490393 3.40625 11.125 C 3.912429 10.019382 4.587611 9.094808 5.34375 8.25 C 6.099889 7.405191 7.044629 6.642653 7.9375 6 C 8.830372 5.357348 9.325384 5.078791 10.65625 4.6875 C 11.6544 4.394032 13.184548 4.16305 14.65625 4.15625 C 15.146817 4.154 15.631404 4.20302 16.09375 4.25 C 17.94313 4.437959 19.823803 5.200897 21.125 5.9375 C 22.426196 6.674105 23.360273 7.363239 24.125 8.375 C 24.889727 9.38676 25.411077 10.762961 25.71875 11.96875 C 26.026426 13.17454 25.974063 14.30012 25.8125 15.53125 C 25.650937 16.762381 24.857498 18.352498 24.15625 19.46875 C 23.455001 20.585001 22.13826 21.559565 21.28125 22.40625 C 20.424239 23.252936 20.314504 23.389945 19.90625 24.09375 C 19.498062 24.797557 19.41406 25.233687 19.5 25.75 C 19.585938 26.266313 19.891888 26.531749 20.34375 27.03125 C 20.795611 27.530752 21.107652 27.715 21.9375 28.46875 C 22.767347 29.222501 24.495602 30.176141 25.53125 31.34375 C 26.566897 32.511358 27.371051 33.75443 27.84375 35.28125 C 28.316442 36.808068 28.29653 38.631069 27.90625 40.0625 C 27.515971 41.49393 26.699792 43.22593 25.9375 44.0625 C 25.280282 44.78376 24.578382 45.425825 23.8125 46 L 42.03125 46 C 44.24725 46 46.03125 44.216 46.03125 42 L 46.03125 6 C 46.03125 3.784 44.24725 2 42.03125 2 L 7.03125 2 z M 12.46875 6.1875 C 12.101083 6.206124 11.717862 6.280756 11.28125 6.4375 C 10.408027 6.750991 9.724957 7.132817 9.0625 7.9375 C 8.400044 8.742184 7.928805 9.809566 7.6875 11 C 7.446197 12.190436 7.590794 13.622757 7.875 14.90625 C 8.159205 16.189743 8.613326 17.286769 9.3125 18.4375 C 10.011674 19.588229 11.119377 20.968676 12.0625 21.6875 C 13.005624 22.406325 13.734674 22.715243 14.65625 22.875 C 15.577826 23.034757 16.58934 22.955681 17.4375 22.625 C 18.28566 22.294319 18.981405 21.915834 19.53125 21.34375 C 20.081095 20.771666 20.405645 20.275214 20.75 19.1875 C 21.094356 18.099787 20.95477 15.934293 20.75 14.53125 C 20.545232 13.128206 20.245037 12.116328 19.6875 10.96875 C 19.129962 9.821173 18.340739 8.515394 17.59375 7.78125 C 16.846761 7.047108 16.282709 6.756004 15.65625 6.5625 C 15.02979 6.368997 14.023783 6.17364 13.46875 6.1875 C 13.191234 6.1945 12.836418 6.16888 12.46875 6.1875 z M 3.03125 17.65625 L 3.03125 35.0625 C 3.5490608 34.410928 4.1847785 33.90628 4.8125 33.46875 C 5.703009 32.848054 6.895613 32.151116 8.09375 31.71875 C 9.291886 31.286385 9.990597 30.955339 11.375 30.65625 C 12.759402 30.357152 16.09375 30.34375 16.09375 30.34375 C 16.09375 30.34375 15.695985 30.051675 15.375 29.71875 C 15.054016 29.385827 14.474793 28.954401 14.21875 28.3125 C 13.962705 27.6706 14.02848 26.625972 14.0625 26 C 14.096515 25.374027 14.28125 24.59375 14.28125 24.59375 C 14.28125 24.59375 12.264623 24.766414 10.84375 24.5 C 9.422876 24.233586 8.515258 23.885412 7.5 23.34375 C 6.484743 22.802088 5.628774 21.920741 4.8125 21.0625 C 3.996227 20.204259 3.621516 19.682342 3.1875 18.25 C 3.1209161 18.030258 3.0810785 17.854931 3.03125 17.65625 z M 14.65625 32.34375 C 13.604496 32.387205 12.182232 32.405853 10.875 32.84375 C 9.567768 33.281652 8.016124 34.118997 7 35.0625 C 5.983877 36.006002 5.131522 37.029519 4.875 38.25 C 4.618478 39.47048 4.799362 40.853463 5.3125 41.9375 C 5.825634 43.021536 6.646935 43.89795 7.59375 44.59375 C 8.540566 45.28955 9.282534 45.642071 10.78125 45.96875 C 10.845188 45.982687 10.932438 45.987169 11 46 L 18.15625 46 C 19.273668 45.842863 20.347335 45.592306 21.0625 45.28125 C 22.13198 44.816088 22.595862 44.476174 23.21875 43.6875 C 23.841639 42.898826 24.240608 41.703023 24.375 40.75 C 24.509392 39.796977 24.396703 38.696229 24.21875 38.03125 C 24.040799 37.366272 23.270015 36.297243 22.5 35.4375 C 21.729984 34.577757 20.542988 33.721469 19.625 33.25 C 18.707014 32.778531 18.020888 32.646687 17.1875 32.5 C 16.354112 32.353337 15.708004 32.3003 14.65625 32.34375 z');
Ui.Icon.register('rfidreader', 'm 5.125,4.9375 c 0,12.414096 0,24.157202 0,35 l 3.125,3.15625 c 12.072033,0 24.512164,0 34.875,0 0,-12.126444 0,-24.621857 0,-35.03125 L 40,4.9375 l -1.5,0 c -11.125,0 -22.25,0 -33.375,0 z M 36.84375,7.84375 C 37.028224,17.742761 37.007516,28.002562 37,36.9375 27.341523,36.9811 17.621811,36.91937 8.0625,36.875 8.11322,27.008331 8.12731,16.54436 8.125,7.9375 18.624437,7.98052 26.931042,7.84375 36.84375,7.84375 z m -13.65625,3.375 c -4.645685,0.0029 -9.308257,1.803835 -12.84375,5.34375 l 1.6875,1.65625 c 6.168688,-6.176404 16.136095,-6.199963 22.3125,-0.03125 0.02067,0.02064 0.04194,0.07299 0.0625,0.09375 l 1.65625,-1.6875 C 36.03887,16.56988 36.02376,16.55498 36,16.53125 32.460085,12.995756 27.833185,11.215847 23.1875,11.21875 z m 0,4.75 c -3.411726,0.0019 -6.842898,1.308402 -9.4375,3.90625 l 1.6875,1.65625 c 4.286907,-4.29227 11.20773,-4.286909 15.5,0 0.01435,0.01432 0.01698,0.01688 0.03125,0.03125 l 1.6875,-1.65625 c -0.01735,-0.0175 -0.04505,-0.04509 -0.0625,-0.0625 -2.597848,-2.594603 -5.994524,-3.877131 -9.40625,-3.875 z m 0,4.90625 c -2.177767,0.0014 -4.346288,0.844218 -6,2.5 l 1.65625,1.65625 c 2.405126,-2.408137 6.279365,-2.405152 8.6875,0 0.008,0.008 -0.008,0.0232 0,0.03125 l 1.6875,-1.65625 c -0.01107,-0.01119 -0.02012,-0.05141 -0.03125,-0.0625 -1.655781,-1.653713 -3.822233,-2.47011 -6,-2.46875 z m 0,4.28125 c -2.472698,0 -4.46875,1.996053 -4.46875,4.46875 0,2.472698 1.996052,4.46875 4.46875,4.46875 2.472697,0 4.46875,-1.996052 4.46875,-4.46875 0,-2.472697 -1.996053,-4.46875 -4.46875,-4.46875 z');
Ui.Icon.register('screen', 'M 6 7.5 C 4.0869362 7.5 2.5 9.0869 2.5 11 L 2.5 32 C 2.5 33.9131 4.0869362 35.5 6 35.5 L 14.25 35.5 C 13.294006 35.941056 12.75 36.453943 12.75 37 C 12.75 38.656854 17.786797 40 24 40 C 30.213203 40 35.25 38.656854 35.25 37 C 35.25 36.453943 34.705994 35.941056 33.75 35.5 L 42 35.5 C 43.913064 35.5 45.5 33.9131 45.5 32 L 45.5 11 C 45.5 9.0869 43.913064 7.5 42 7.5 L 6 7.5 z M 6 10.5 L 42 10.5 C 42.302955 10.5 42.5 10.697 42.5 11 L 42.5 32 C 42.5 32.303 42.302955 32.5 42 32.5 L 6 32.5 C 5.6970445 32.5 5.5 32.303 5.5 32 L 5.5 11 C 5.5 10.697 5.6970445 10.5 6 10.5 z');
Ui.Icon.override('plus', 'M 21.5 4 L 21.5 21.5 L 4 21.5 L 4 26.5 L 21.5 26.5 L 21.5 44 L 26.5 44 L 26.5 26.5 L 44 26.5 L 44 21.5 L 26.5 21.5 L 26.5 4 L 21.5 4 z');
Ui.Icon.register('chronoplay', 'M 40.125 0.5 C 38.635277 0.5 37.40625 1.2501296 37.40625 2.15625 C 37.40625 2.8131873 38.051922 3.3629636 38.96875 3.625 L 38.96875 4.03125 C 35.432247 4.5826204 32.71875 7.6247822 32.71875 11.3125 C 32.71875 15.388498 36.049001 18.71875 40.125 18.71875 C 44.200998 18.71875 47.5 15.388498 47.5 11.3125 C 47.5 7.6247822 44.786502 4.5826204 41.25 4.03125 L 41.25 3.625 C 42.166828 3.3629636 42.8125 2.8131873 42.8125 2.15625 C 42.8125 1.2501296 41.614723 0.5 40.125 0.5 z M 40.125 5.46875 C 43.359397 5.46875 45.9375 8.0781029 45.9375 11.3125 C 45.9375 14.546897 43.359397 17.15625 40.125 17.15625 C 36.890603 17.15625 34.28125 14.546897 34.28125 11.3125 C 34.28125 8.0781029 36.890603 5.46875 40.125 5.46875 z M 10.375 6.65625 L 10.375 41.34375 L 40.75 24 L 10.375 6.65625 z M 42.84375 6.71875 L 40.03125 10.71875 L 41 11.40625 L 43.8125 7.40625 L 42.84375 6.71875 z');
Ui.Icon.register('menu', 'm 29,4 -10,0 0,10 10,0 z m 0,15 -10,0 0,10 10,0 z m 0,15 -10,0 0,10 10,0 z');
Ui.Icon.override('trash', 'M 22.125 1.90625 C 21.497549 1.90625 21 2.435049 21 3.0625 L 21 4.0625 C 12.485248 4.335055 7.1085409 6.95393 7 9.875 L 7 11.03125 C 7 11.658701 7.435049 12.1875 8.0625 12.1875 L 39.78125 12.1875 C 40.408701 12.1875 41 11.658701 41 11.03125 C 41.0034 10.284715 41.0023 10.585192 41 9.875 C 40.893471 6.994604 35.364149 4.392504 27 4.0625 L 27 3.0625 C 27 2.435049 26.471201 1.90625 25.84375 1.90625 L 22.125 1.90625 z M 7 14.375 C 6.372549 14.375 5.875 14.872549 5.875 15.5 L 5.875 17.8125 C 5.875 18.439951 6.372549 18.9375 7 18.9375 L 10.40625 18.9375 L 10.40625 21.5625 C 10.785413 21.926045 11 22.430799 11 23 L 11 40 C 11 40.569201 10.785413 41.073955 10.40625 41.4375 L 10.40625 41.5625 C 10.40625 44.072303 12.427697 46.125 14.9375 46.125 L 33.0625 46.125 C 35.572302 46.125 37.59375 44.072303 37.59375 41.5625 L 37.59375 41.375 C 37.292632 41.025106 37.09375 40.593701 37.09375 40.09375 L 37.09375 23.09375 C 37.09375 22.593799 37.292632 22.131144 37.59375 21.78125 L 37.59375 18.9375 L 41 18.9375 C 41.627451 18.9375 42.125 18.439951 42.125 17.8125 L 42.125 15.5 C 42.125 14.872549 41.627451 14.375 41 14.375 L 33.0625 14.375 L 14.9375 14.375 L 7 14.375 z M 24.0625 21.40625 C 25.003676 21.40625 25.78125 22.152574 25.78125 23.09375 L 25.78125 40.09375 C 25.78125 41.034926 25.003676 41.78125 24.0625 41.78125 C 23.121324 41.78125 22.375 41.034926 22.375 40.09375 L 22.375 23.09375 C 22.375 22.152574 23.121324 21.40625 24.0625 21.40625 z M 16.625 21.46875 C 17.795708 21.46875 18.411699 22.320019 18.4375 23.1875 L 18.4375 40.09375 C 18.4375 41.180955 17.575274 41.757074 16.625 41.78125 C 15.683824 41.78125 14.9375 41.034926 14.9375 40.09375 L 14.9375 23.1875 C 14.9375 22.246324 15.683824 21.46875 16.625 21.46875 z M 31.375 21.46875 C 32.316176 21.46875 33.0625 22.246324 33.0625 23.1875 L 33.0625 40.15625 C 33.0625 41.097426 32.316176 41.875 31.375 41.875 C 30.433824 41.875 29.65625 41.097426 29.65625 40.15625 L 29.65625 23.1875 C 29.65625 22.246324 30.433824 21.46875 31.375 21.46875 z');
Ui.Icon.register('localaccount', 'M 16.453336,46.016255 C 9.1766794,44.556739 4.6121591,40.58043 2.8358757,34.153628 2.073397,31.394889 1.5160004,26.079143 1.9442961,25.650847 c 0.2388648,-0.238865 1.0953516,-0.238857 3.5269672,3.6e-5 8.8983167,0.874211 14.2188537,4.825066 16.4073387,12.183545 0.537405,1.806948 1.111257,5.767056 1.116143,7.702415 l 0.0022,0.886118 -2.385703,-0.02563 c -1.312183,-0.01409 -3.183256,-0.185576 -4.157987,-0.381084 z m 9.079708,-2.483651 c 0.494665,-8.740486 4.328938,-14.339041 11.425467,-16.682721 2.26622,-0.748438 6.364371,-1.421116 8.657831,-1.421116 l 0.828701,0 0,1.872848 c 0,2.48441 -0.6566,6.138229 -1.510936,8.407988 -2.501298,6.645335 -8.026972,10.187514 -16.595243,10.638219 l -2.973997,0.156439 z M 1.8848631,20.629014 C 2.384716,12.112354 5.2422657,6.9434079 11.088435,3.9809302 13.003182,3.0106554 16.935025,2.0829762 20.068158,1.8622565 22.363093,1.7005847 22.751603,1.7345267 22.895397,2.1092517 23.123246,2.703011 22.561949,7.7436138 22.04442,9.7512827 19.975884,17.775821 14.182563,22.100132 4.8116557,22.614348 L 1.7585082,22.781884 z M 40.992005,22.435088 C 35.980149,21.781148 31.198405,19.075329 28.739943,15.502079 26.946556,12.89548 25.78615,8.918572 25.530489,4.5027342 l -0.161802,-2.7946817 0.927199,0.00215 c 1.629395,0.00391 5.782036,0.5502579 7.433649,0.9779778 7.686403,1.9905634 12.09008,7.9928777 12.633167,17.2193007 l 0.164501,2.794681 -2.017806,-0.03575 c -1.109794,-0.01966 -2.69262,-0.123795 -3.517392,-0.231407 z');
Ui.Icon.register('chathistory', 'M 35.875 1.5625 C 33.742651 1.5625 32 2.6092541 32 3.90625 C 32 4.8488881 32.932455 5.6886603 34.25 6.0625 L 34.25 6.625 C 29.184312 7.4110617 25.28125 11.78141 25.28125 17.0625 C 25.28125 22.896772 30.040728 27.65625 35.875 27.65625 C 41.709272 27.65625 46.46875 22.896772 46.46875 17.0625 C 46.46875 11.786461 42.558604 7.4172046 37.5 6.625 L 37.5 6.0625 C 38.817545 5.6886603 39.75 4.8488881 39.75 3.90625 C 39.75 2.6092541 38.007349 1.5625 35.875 1.5625 z M 35.875 8.6875 C 40.504627 8.6875 44.21875 12.432873 44.21875 17.0625 C 44.21875 21.692127 40.504627 25.40625 35.875 25.40625 C 31.245373 25.40625 27.5 21.692127 27.5 17.0625 C 27.5 12.432873 31.245373 8.6875 35.875 8.6875 z M 39.78125 10.46875 L 35.75 16.21875 L 37.125 17.1875 L 41.15625 11.46875 L 39.78125 10.46875 z M 20.8125 15.625 C 11.591715 15.625 3.78125 21.88315 3.78125 29.96875 C 3.78125 38.05435 11.591715 44.25 20.8125 44.25 C 22.425137 44.25 23.953746 43.9777 25.4375 43.625 C 30.735333 47.1821 36.40625 45.90625 36.40625 45.90625 L 39.4375 45.125 L 37.1875 42.9375 C 37.1875 42.9375 36.363067 42.1604 35.40625 41.125 C 34.763451 40.4294 34.340687 39.75885 33.84375 39.09375 C 36.290075 36.63695 37.84375 33.49165 37.84375 29.96875 C 37.84375 29.56885 37.81868 29.17155 37.78125 28.78125 C 36.944621 28.98335 36.086212 29.09375 35.1875 29.09375 C 34.879419 29.09375 34.582967 29.05525 34.28125 29.03125 C 34.31437 29.33725 34.34375 29.65775 34.34375 29.96875 C 34.34375 32.91195 32.937088 35.58545 30.4375 37.59375 L 29.3125 38.5 L 29.96875 39.75 C 30.510713 40.7515 31.375193 41.68075 32.1875 42.59375 C 30.596105 42.41585 28.660781 41.91825 26.78125 40.46875 L 26.125 39.9375 L 25.25 40.1875 C 23.85412 40.5786 22.382689 40.78115 20.8125 40.78125 C 13.134435 40.78125 7.25 35.76975 7.25 29.96875 C 7.25 24.16745 13.134435 19.09375 20.8125 19.09375 C 22.000051 19.09375 23.1326 19.2116 24.21875 19.4375 C 24.15919 18.9724 24.125 18.4813 24.125 18 C 24.125 17.2905 24.18497 16.6099 24.3125 15.9375 C 23.176783 15.7364 22.009737 15.625 20.8125 15.625 z');
Ui.Icon.register('file', 'm 6,2 0,44 L 42,46 42,11 33,2 l -27,0 z M 10,6 l 19,0 L 29,15 l 9,0 0,27 -28,0 0,-36 z M 33,7 37,11 33,11 33,7 z');
Ui.Icon.register('folder', 'm 4,7 0,35 40,0 0,-25 -34,0 0,21 -2,0 0,-23 32,0 0,-4 -21,0 0,-4 z');

var app = new Wn.App({
webApp: false,
style: {
	"Ui.Element": {
		fontFamily: 'Ubuntu,Sans-Serif',
		fontWeight: 100,
		fontSize: 16
	},
	"Ui.Text": {	
		interLine: 1.4
	},
	"Ui.Separator": {
		color: '#999999'
	},
	"Ui.CheckBox": {
		checkColor: '#222222'
	},
	"Ui.ScrollingArea": {
		color: '#999999',
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.ButtonGraphic": {
		background: 'rgba(250,250,250,1)',
		iconSize: 30,
		spacing: 6
	},
	"Ui.ActionButton": {
		"Ui.ButtonGraphic": {
			background: 'rgba(250,250,250,0)',
			iconSize: 30,
			spacing: 6
		}
	},
	"Ui.MenuToolBarButton": {
		"Ui.ButtonGraphic": {
			background: 'rgba(250,250,250,0)',
			iconSize: 28,
			spacing: 0
		}
	},
	"Ui.Slider": {
		color: 'rgba(204,204,204,1)'
	},
	"Ui.ToggleButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		toggleColor: '#dc6c36',
		iconSize: 30,
		spacing: 6,
		fontWeight: 700
	},
	"Wn.ResourceTitle": {
		fontWeight: 400,
		fontSize: 24,
		color: "#e1e1e1"
	},
	"Wn.ResourceViewerTitle": {
		fontWeight: 400,
		fontSize: 24,
		color: "#111111"
	},
	"Wn.UserTitle": {
		fontWeight: 400,
		fontSize: 24,
		color: "#111111"
	}
}});
app.requireFont('Ubuntu', '100');
app.requireFont('Ubuntu', '400');
app.requireFont('Ubuntu', '700');