
Ui.Button.extend('Wn.InfoButton');

Ui.Button.extend('Wn.AlertButton');

Ui.LBox.extend('Wn.Error', {
	clock: undefined,
	progressbar: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center' });
		this.setContent(vbox);

		vbox.append(new Ui.Text({
			text: 'La ressource recherchée n\'a pas été trouvée',
			margin: 20, fontSize: 20,
			textAlign: 'center'
		}));

		this.progressbar = new Ui.ProgressBar({ value: 1, horizontalAlign: 'center', width: 100 });
		vbox.append(this.progressbar);
	},

	onProgressComplete: function() {
		Ui.App.current.setMainPath('');
	}
}, {
	onLoad: function() {
		Wn.Error.base.onLoad.apply(this, arguments);
		this.clock = new Anim.Clock({ duration: 5.0, scope: this,
			onTimeupdate: function(clock, progress) {
				this.progressbar.setValue(1-progress);
			}
		});
		this.connect(this.clock, 'complete', this.onProgressComplete);
		this.clock.begin();
	},

	onUnload: function() {
		Wn.Error.base.onUnload.apply(this, arguments);
		if(this.clock !== undefined) {
			this.disconnect(this.clock, 'complete', this.onProgressComplete);
			this.clock.stop();
			this.clock = undefined;
		}
	}
});

Ui.LBox.extend('Wn.MenuUser', {
	app: undefined,
	user: undefined,
	image: undefined,
	msglabel: undefined,
	uploaders: undefined,
	progressbar: undefined,
	button: undefined,

	constructor: function(config) {
		this.app = config.app;
		delete(config.app);

		this.uploaders = [];

		this.button = new Ui.Button({ icon: 'home', text: 'Accueil' });
		this.connect(this.button, 'press', this.onPress);
		this.append(this.button);

		this.progressbar = new Ui.ProgressBar({ margin: 10, marginBottom: 2, verticalAlign: 'bottom', horizontalAlign: 'center', width: 40 });
		this.progressbar.hide(true);
		this.append(this.progressbar);
	},

	onPress: function() {
		app.setMainPath('user:'+this.user.getId());
	},

	setCurrent: function(isCurrent) {
		this.button.setIsActive(isCurrent);
	},

	setUser: function(user) {
		this.user = user;
		this.connect(this.user, 'order', this.onUserOrder);
		this.connect(this.user, 'call', this.onUserCall);
		this.onUserMessagesChange();
	},

	getUploaders: function() {
		return this.uploaders;
	},

	addUploader: function(uploader) {
		this.uploaders.push(uploader);

		if(this.uploaders.length === 1)
			this.progressbar.show();
		
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
				loadedOctet += uploader.getIsCompleted() ? uploader.getTotal() : uploader.getLoaded();
				countKnown++;
			}
			count++;
		}
		this.progressbar.setValue(loadedOctet / totalOctet);
	},

	onUploaderCompleteError: function(uploader) {
		// check if all uploaders have completed
		var allCompleted = true;
		for(var i = 0; allCompleted && (i < this.uploaders.length); i++) {
			allCompleted = this.uploaders[i].getIsCompleted();
		}
		this.updateUploaders();
		if(allCompleted) {
			this.uploaders = [];
			this.progressbar.hide(true);
		}
	},

	onUserOrder: function(user, message) {
		Ui.App.current.setMainPath(message.content);
	},
	
	onUserCall: function(user, contact, message) {
		var dialog = new Wn.ContactMessagesDialog({ user: this.user, contact: contact, message: message });
//		var dialog = new Wn.VideoConfDialog({ user: this.user, contact: contact, message: message });
		dialog.open();
	},
		
	onUserMessagesChange: function() {
		var count = Ui.App.current.updateMessagesSeen();
	}
});


Ui.CanvasElement.extend('Wn.ContactArrow', {}, {
	updateCanvas: function(ctx) {
		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('color')).getCssRgba();
		ctx.fillRect(0, 0, this.getLayoutWidth(), this.getLayoutHeight());
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}

}, {
	style: {
		color: '#e20045'
	}
});

Ui.LBox.extend('Wn.MenuContactIcon', {
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
		
//		this.append(new Ui.Rectangle({ fill: '#9b9c9c', margin: 2 }));
		this.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 2 }));

		this.image = new Ui.Image({ width: 64, height: 64, margin: 2 });
		this.append(this.image);
		
		this.statusRect = new Ui.Rectangle({ fill: '#13d774', width: 10, height: 10, radius: 5, marginTop: 5, marginRight: 5, horizontalAlign: 'right', verticalAlign: 'top' });
		this.append(this.statusRect);
		
		this.newicon = new Wn.NewRibbon({ width: 32, height: 32, verticalAlign: 'top', horizontalAlign: 'left', margin: 1 });
		this.append(this.newicon);
	},
	
	getContact: function() {
		return this.contact;
	},
	
	onContactChange: function() {
		if(this.contact.getIsOnline())
			this.statusRect.show();
		else
			this.statusRect.hide();
//		this.statusRect.setFill(this.contact.getIsOnline()?'#13d774':'#d71354');
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
	}
}, {
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
/*
Ui.Selectionable.extend('Wn.MenuContact', {
	user: undefined,
	contact: undefined,
	dropbox: undefined,
	label: undefined,
	arrow: undefined,
	isCurrent: false,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);

		this.dropbox = new Ui.DropBox({ marginTop: 5, marginBottom: 5 });
		this.dropbox.addMimetype(Wn.ResourceView);
		this.connect(this.dropbox, 'drop', this.onDrop);
		this.setContent(this.dropbox);

		var vbox = new Ui.VBox();
		this.dropbox.setContent(vbox);

		var lbox = new Ui.LBox();
		vbox.append(lbox);

		this.arrow = new Wn.ContactArrow({ width: 4, horizontalAlign: 'right' });
		this.arrow.hide();
		this.dropbox.append(this.arrow);

		var icon = new Wn.MenuContactIcon({ horizontalAlign: 'center', contact: this.contact, user: this.user });
		lbox.append(icon);

		this.label = new Ui.CompactLabel({
			fontSize: 14, margin: 3, marginBottom: 5, maxLine: 2,
			textAlign: 'center'
		});
		vbox.append(this.label);
		
		if(Ui.App.current.getMainPath() === 'user:'+this.contact.getId())
			this.setCurrent(true);
	},

	setCurrent: function(isCurrent) {
		this.isCurrent = isCurrent;
		if(isCurrent) {
			this.arrow.show();
			this.label.setColor(this.getStyleProperty('active'));
		}
		else {
			this.arrow.hide();
			this.label.setColor(this.getStyleProperty('color'));
		}
	},

	getContact: function() {
		return this.contact;
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
	},

	onContactDelete: function() {
		var dialog = new Ui.Dialog({
			title: 'Enlever un contact',
			fullScrolling: true,
			preferredWidth: 300,
			preferredHeight: 300,
			cancelButton: new Ui.DialogCloseButton({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous supprimer ce contact de votre liste de contact ?\n\nCela ne vous empêchera pas de le remettre plus tard si vous changez d\'avis.' })
		});
		var removeButton = new Ui.DefaultButton({ text: 'Enlever' });
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
	updateColors: function() {
		Wn.MenuContact.base.updateColors.apply(this, arguments);
		var fg = this.getForeground();
		this.label.setColor(fg);
	},

	onPress: function() {
		app.setMainPath('user:'+this.contact.getId());
	},

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

	onStyleChange: function() {
		Wn.MenuContact.base.onStyleChange.apply(this, arguments);
		this.setCurrent(this.isCurrent);
	},

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
}, {
	style: {
		active: 'red',
		color: 'black'
	}
});*/

Wn.SelectionButton.extend('Wn.MenuContact', {
	user: undefined,
	contact: undefined,
	arrow: undefined,
	isCurrent: false,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		this.contact = config.contact;
		delete(config.contact);

		this.setDraggableData(this);

		this.getDropBox().addMimetype(Wn.ResourceView);
		this.connect(this.getDropBox(), 'drop', this.onDrop);

		this.arrow = new Wn.ContactArrow({ width: 4, horizontalAlign: 'right' });
		this.arrow.hide();
		this.getDropBox().append(this.arrow);

		var icon = new Wn.MenuContactIcon({ horizontalAlign: 'center', contact: this.contact, user: this.user });
		this.setIcon(icon);

//		this.label = new Ui.CompactLabel({
//			fontSize: 14, margin: 3, marginBottom: 5, maxLine: 2,
//			textAlign: 'center'
//		});
//		this.setText(this.label);

		if(Ui.App.current.getMainPath() === 'user:'+this.contact.getId())
			this.setCurrent(true);
	},

	setCurrent: function(isCurrent) {
		this.isCurrent = isCurrent;
		if(isCurrent) {
			this.arrow.show();
//			this.label.setColor(this.getStyleProperty('active'));
		}
		else {
			this.arrow.hide();
//			this.label.setColor(this.getStyleProperty('color'));
		}
	},

	getContact: function() {
		return this.contact;
	},

	onContactChange: function() {
		this.setText(this.contact.getName());
		//this.label.setText(this.contact.getFirstname()+' '+this.contact.getLastname());
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
	},

	onContactDelete: function() {
		var dialog = new Ui.Dialog({
			title: 'Enlever un contact',
			fullScrolling: true,
			preferredWidth: 300,
			preferredHeight: 300,
			cancelButton: new Ui.DialogCloseButton({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous supprimer ce contact de votre liste de contact ?\n\nCela ne vous empêchera pas de le remettre plus tard si vous changez d\'avis.' })
		});
		var removeButton = new Ui.DefaultButton({ text: 'Enlever' });
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
	updateColors: function() {
		Wn.MenuContact.base.updateColors.apply(this, arguments);
//		var fg = this.getForeground();
//		this.label.setColor(fg);
	},

	onPress: function() {
		app.setMainPath('user:'+this.contact.getId());
	},

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

	onStyleChange: function() {
		Wn.MenuContact.base.onStyleChange.apply(this, arguments);
		this.setCurrent(this.isCurrent);
	},

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
}, {
	style: {
		active: 'red',
		color: 'black'
	}
});

Ui.Button.extend('Wn.MenuNewContact', {
	user: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.setIcon('plus');
	}
}, {
	onPress: function() {
		Wn.MenuNewContact.base.onPress.apply(this, arguments);

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
	bg: undefined,

	resources: undefined,
	contacts: undefined,

	constructor: function(config) {
		this.addEvents('launch');

		this.user = config.user;
		delete(config.user);

		this.bg = new Ui.Rectangle();
		this.append(this.bg);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
		this.append(scroll);

//		var vbox = new Ui.VBox({ spacing: 5 });
//		this.append(vbox);

//		this.menuUser = new Wn.MenuUser({ margin: 0, user: this.user });
//		vbox.append(this.menuUser);

//		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
//		vbox.append(scroll, true);

		var vbox = new Ui.VBox({ marginTop: 20, spacing: 5 });
		scroll.setContent(vbox);

		vbox.append(new Wn.MenuNewContact({ user: this.user }));

		// this.contacts = new Ui.VBox({ spacing: 5 });
		this.contacts = new Wn.VDropBox({ spacing: 5 });
		this.contacts.addMimetype(Wn.MenuContact);
		this.connect(this.contacts, 'dropat', this.onUserDropAt);
		vbox.append(this.contacts);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
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
//		this.menuUser.setCurrent(this.user.getId() == userId);
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
				this.contacts.insertAt(new Wn.MenuContact({ user: this.user, contact: add[i], width: 98 }), add[i].getPosition());
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
}, {
	onStyleChange: function() {
		Wn.Menu.base.onStyleChange.apply(this, arguments);
		this.bg.setFill(this.getStyleProperty('background'));
	}
}, {
	style: {
		background: '#f1f1f1'
	}
});

Ui.Dialog.extend('Wn.ReloadDialog', {
	constructor: function(config) {
		this.setTitle('Mise à jour de l\'application');
		this.setFullScrolling(true);
		this.setPreferredWidth(300);
		this.setPreferredHeight(300);
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
	
Ui.Button.extend('Wn.ProfilButton', 
{
	user: undefined,
	image: undefined,
	userFace: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.userFace = new Ui.LBox({ verticalAlign: 'center' });
//		this.border = new Ui.Frame({ frameWidth: 1 });
//		this.userFace.append(this.border);
		this.image = new Ui.Image({ margin: 1, src: this.user.getFaceUrl() });
		this.userFace.append(this.image);

		this.setIcon(this.userFace);
	},
	
	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	}
},
{
	updateColors: function() {
		Wn.ProfilButton.base.updateColors.apply(this, arguments);
//		this.border.setFill(this.getForeground());
	},

	onStyleChange: function() {
		Wn.ProfilButton.base.onStyleChange.apply(this, arguments);
//		this.border.setFill(this.getForeground());
		var size = this.getStyleProperty('iconSize');
		this.image.setWidth(size-2);
		this.image.setHeight(size-2);
	},

	onLoad: function() {
		Wn.ProfilButton.base.onLoad.call(this);
		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		Wn.ProfilButton.base.onUnload.call(this);
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.CompactLabel.extend('Wn.MenuTitle', {});

Ui.Button.extend('Wn.BackButton', {
	constructor: function() {
		this.setIcon('arrowleft');
	}
});

Wn.MenuToolBar.extend('Wn.AppMenuToolBar', {
	app: undefined,
	user: undefined,
	homeButton: undefined,
	backbutton: undefined,
	titleLabel: undefined,
	viewButton: undefined,
	historyButton: undefined,
	profilButton: undefined,

	constructor: function(config) {
		this.app = config.app;
		delete(config.app);
		this.user = config.user;
		delete(config.user);

		this.homeButton = new Wn.MenuUser({ user: this.user, app: this.app, width: 98 });
		this.append(this.homeButton);

		this.backButton = new Wn.BackButton();
		this.connect(this.backButton, 'press', this.onBackPress);
		this.append(this.backButton);

		this.titleLabel = new Wn.MenuTitle({ width: 100, verticalAlign: 'center', maxLine: 2 });
		this.append(this.titleLabel, true);

		this.viewButton = new Ui.Button({ icon: 'eye', text: 'Affichage' });
		this.connect(this.viewButton, 'press', this.onViewPress);
		this.append(this.viewButton);

		this.historyButton = new Ui.Button({ icon: 'chathistory', text: 'Historique' });
		this.connect(this.historyButton, 'press', this.onChatHistoryPress);
		this.append(this.historyButton);

		this.profilButton = new Wn.ProfilButton({ user: this.user, horizontalAlign: 'center' });
		this.connect(this.profilButton, 'press', this.onProfilPress);
		this.append(this.profilButton);
	},

	setCurrent: function(isUserCurrent) {
		this.homeButton.setCurrent(isUserCurrent);
	},

	setTitle: function(title) {
		this.titleLabel.setText(title);
	},

	setActions: function(buttons) {
		// remove old actions
		var titlePos = 0;
		var remove = [];
		for(titlePos = 0; (titlePos < this.getLogicalChildren().length) && (this.getLogicalChildren()[titlePos] !== this.titleLabel); titlePos++) {}
		var i;
		for(i = titlePos+1; (i < this.getLogicalChildren().length) && (this.getLogicalChildren()[i] !== this.viewButton); i++) {
			remove.push(this.getLogicalChildren()[i]);
		}
		for(i = 0; i < remove.length; i++)
			this.remove(remove[i]);
		// insert new actions
		for(i = buttons.length-1; i >= 0; i--)
			this.insertAt(buttons[i], titlePos+1, false);
	},

	getUploaders: function() {
		return this.homeButton.getUploaders();
	},

	addUploader: function(uploader) {
		this.homeButton.addUploader(uploader);
	},

	onBackPress: function() {
		this.app.backHistory();
	},

	onViewPress: function(button) {
		var popup = new Ui.MenuPopup();

		var vbox = new Ui.VBox();
		popup.setContent(vbox);

		var contactsButton = new Ui.ToggleButton({ icon: 'menu', text: 'Contacts' });
		if(localStorage.getItem('showContactBar') !== 'false')
			contactsButton.toggle();
		this.connect(contactsButton, 'toggle', function() {
			localStorage.setItem('showContactBar', 'true');
			this.app.getMenu().show();
		});
		this.connect(contactsButton, 'untoggle', function() {
			localStorage.setItem('showContactBar', 'false');
			this.app.getMenu().hide(true);
		});
		vbox.append(contactsButton);

		var detailsButton = new Ui.ToggleButton({ icon: 'bubble', text: 'Détails' });
		if(localStorage.getItem('showDetails') !== 'false')
			detailsButton.toggle();
		this.connect(detailsButton, 'toggle', function() {
			localStorage.setItem('showDetails', 'true');
			this.app.showDetails();
		});
		this.connect(detailsButton, 'untoggle', function() {
			localStorage.setItem('showDetails', 'false');
			this.app.hideDetails();
		});
		vbox.append(detailsButton);

		var thumbButton = new Ui.ToggleButton({ icon: 'thumb', text: 'Vignettes' });
		if(localStorage.getItem('thumbsVisible') !== 'false')
			thumbButton.toggle();
		this.connect(thumbButton, 'toggle', function() {
			this.app.showThumbs();
		});
		this.connect(thumbButton, 'untoggle', function() {
			this.app.hideThumbs();
		});
		vbox.append(thumbButton);

		var autoplayButton = new Ui.ToggleButton({ icon: 'chronoplay', text: 'Diaporama' });
		vbox.append(autoplayButton);
		if(localStorage.getItem('autoPlay') === 'true')
			autoplayButton.toggle();
		this.connect(autoplayButton, 'toggle', function() {
			this.app.setAutoPlay(true);
		});
		this.connect(autoplayButton, 'untoggle', function() {
			this.app.setAutoPlay(false);
		});

		var fullscreenButton = new Ui.ToggleButton({ icon: 'fullscreen', text: 'Plein écran' });
		if(localStorage.getItem('fullscreen') === 'true')
			fullscreenButton.toggle();
		vbox.append(fullscreenButton);
		this.connect(fullscreenButton, 'toggle', function() {
			this.app.fullscreen();
		});
		this.connect(thumbButton, 'untoggle', function() {
			this.app.unfullscreen();
		});

		popup.show(button, 'bottom');
	},

	onChatHistoryPress: function(button) {
		var popup = new Wn.HistoryMessagesPopup({ user: this.user });
		popup.show(button, 'bottom');
	},

	onProfilPress: function(button) {
		var popup = new Ui.MenuPopup();

		var vbox = new Ui.VBox();
		popup.setContent(vbox);

		var profilButton = new Ui.Button({ icon: 'person', text: 'Profil' });
		this.connect(profilButton, 'press', function() {
			(new Wn.UserProfil({ user: this.user })).open();
		});
		vbox.append(profilButton);

		vbox.append(new Ui.MenuPopupSeparator());

		var exitButton = new Ui.Button({ icon: 'exit', text: 'Déconnexion' });
		this.connect(exitButton, 'press', this.onExitPress);
		vbox.append(exitButton);

		popup.show(button, 'bottom');	
	},

	onExitPress: function() {
		// if we are an admin connected on a user account, just close the window
		if(Ui.App.current.getArguments()['user'] !== undefined) {
			var dialog = new Ui.Dialog({
				title: 'Déconnexion',
				fullScrolling: false,
				preferredWidth: 350,
				cancelButton: new Ui.Button({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Voulez vous vraiment vous fermer votre session sur ce compte utilisateur ?'})
			});
			var logoutButton = new Wn.AlertButton({ text: 'Fermer' });
			this.connect(logoutButton, 'press', function() {
				window.close();
			});
			dialog.setActionButtons([ logoutButton ]);
			dialog.open();
		}
		else {
			var dialog = new Ui.Dialog({
				title: 'Déconnexion',
				fullScrolling: false,
				preferredWidth: 300,
				cancelButton: new Ui.DialogCloseButton({ text: 'Annuler' }),
				content: new Ui.Text({ text: 'Voulez vous vraiment vous déconnecter ?'})
			});
			var logoutButton = new Ui.DefaultButton({ text: 'Déconnecter' });
			this.connect(logoutButton, 'press', function() {
				if('localStorage' in window) {
					// remove login
					localStorage.removeItem('login');
					// remove password
					localStorage.removeItem('password');
					// remove currentPath
					localStorage.removeItem('currentPath');
					// remove session
					localStorage.removeItem('authsession');
				}
				// delete the cookie
				document.cookie = 'HOST_AUTH=; expires=Thu, 01-Jan-1970 00:00:01 GMT';
				// delete the authsession on the server
				var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/authsession/current' });
				this.connect(request, 'done', this.onAuthSessionDelete);
				this.connect(request, 'error', this.onAuthSessionDelete);
				request.send();
			});
			dialog.setActionButtons([ logoutButton ]);
			dialog.open();
		}
	},

	onAuthSessionDelete: function() {
		// reload everything without hash
		var loca = window.location.href;
		if(loca.lastIndexOf('#') != -1)
			loca = loca.substring(0, loca.lastIndexOf('#'));
		window.location.replace(loca);
	},
	
	onUserMessagesChange: function() {
		var count = 0;
		for(var i = 0; i < this.user.getMessages().length; i++) {
			var message = this.user.getMessages()[i];
			if((message.getDestination() == this.user.getId()) && !message.getSeen())
				count++;
		}
		if(count === 0)
			this.historyButton.setBadge(undefined);
		else
			this.historyButton.setBadge(count);
	}
}, {
	onLoad: function() {
		Wn.AppMenuToolBar.base.onLoad.call(this);
		this.connect(this.user, 'messageschange', this.onUserMessagesChange);
		this.onUserMessagesChange();
	},
	
	onUnload: function() {
		Wn.AppMenuToolBar.base.onUnload.call(this);
		this.disconnect(this.user, 'messageschange', this.onUserMessagesChange);
	}
});

Ui.App.extend('Wn.App', {
	loginDialog: undefined,
	user: undefined,
	deviceQueue: undefined,
	contentswitch: undefined,
	hbox: undefined,
	menu: undefined,
	mainbox: undefined,
	main: undefined,
	isFullscreen: false,
	isThumbsVisible: false,
	currentPath: undefined,
	resource: undefined,
	contact: undefined,
	rfidReader: undefined,
	reloadDialog: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,
	pathHistory: undefined,
	backgroundBox: undefined,
	backgroundImage: undefined,
	unfullscreenButton: undefined,
	setup: undefined,

	constructor: function(config) {
		this.pathHistory = [];

		this.backgroundBox = new Ui.LBox();
		this.setContent(this.backgroundBox);
		this.backgroundImage = new Wn.ScaledImage2({ mode: 'crop' });
		this.backgroundBox.append(this.backgroundImage);

		this.backgroundBox.append(new Ui.VBox());
		this.connect(window, 'hashchange', this.onHashChange);
		
		this.rfidReader = new Wn.RfidReader();
		this.connect(this.rfidReader, 'enter', this.onRfidEnter);

		// get the server setup
		var request = new Core.HttpRequest({ url: '/cloud/setup' });
		this.connect(request, 'done', function(req) {
			this.setup = req.getResponseJSON();
			if('icons' in this.setup) {
				for(var iconKey in this.setup.icons)
					Ui.Icon.override(iconKey, this.setup.icons[iconKey]);
			}

			// set the default theme
			this.setTheme('default');

			// we are an admin and want to connect to as a given user
			if(this.getArguments()['user'] != undefined) {
				var request = new Core.HttpRequest({ url: '/cloud/user/'+this.getArguments()['user'] });
				this.connect(request, 'done', this.onGetUserDone);
				this.connect(request, 'error', this.onGetUserError);
				request.send();
			}
			else
				this.sendGetAuthSession();
		});
		request.send();

		// handle the keyboard
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);
	},

	getSetup: function() {
		return this.setup;
	},
	
	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {	
		return this.selection;
	},

	getRfidReader: function() {
		return this.rfidReader;
	},

	sendGetAuthSession: function() {
		var oldSession;
		// look in the localStorage
		if('localStorage' in window)
			oldSession = localStorage.getItem('authsession');
		var url = '/cloud/authsession/';
		if((oldSession !== undefined) && (oldSession !== null))
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
		if('localStorage' in window)
			localStorage.removeItem('authsession');
		this.basicLogin();
	},

	onGetAuthSessionDone: function(req) {
		var res = req.getResponseJSON();
		if('localStorage' in window)
			localStorage.setItem('authsession', res.id);
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
		this.basicLogin();
	},

	getUser: function() {
		return this.user;
	},

	basicLogin: function() {
		this.loginDialog = new Wn.LoginWizard({ setup: this.setup });
		this.connect(this.loginDialog, 'done', this.onBasicLoginDone);
		this.loginDialog.open();
	},

	onBasicLoginDone: function(dialog) {
		dialog.close();
		this.sendGetAuthSession();
	},

	setBackgroundImage: function(url) {
		this.backgroundImage.setSrc(url);
	},

	onLoginDone: function(user) {
		this.user = new Wn.User({ user: user });
		this.connect(this.user, 'delete', this.onUserDelete);
		this.connect(this.user, 'change', this.onUserChange);
		this.connect(this.user, 'serverchange', this.onServerChange);

		this.setTheme(this.user.getTheme());

		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.backgroundBox.remove(this.backgroundBox.getLastChild());
		var vbox = new Ui.VBox();
		this.backgroundBox.append(vbox);

		this.menu = new Wn.Menu({ user: this.user, width: 98 });
		if(localStorage.getItem('showContactBar') === 'false')
			this.menu.hide(true);

		this.menuBox = new Ui.LBox();
		this.menuBox.append(new Ui.Rectangle({ fill: '#f1f1f1' }));
		vbox.append(this.menuBox);

		this.actionBox = new Wn.AppMenuToolBar({ user: this.user, app: this });
		this.menuBox.append(this.actionBox);

		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);

		var hbox = new Ui.HBox();
		vbox.append(hbox, true);

		hbox.append(this.menu);

		this.contentswitch = new Ui.TransitionBox();
		hbox.append(this.contentswitch, true);

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

		if(localStorage.getItem('fullscreen') === 'true')
			this.fullscreen();
	},

	getMenu: function() {
		return this.menu;
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
		//console.log('notifyMainPath '+path+', '+this.currentPath+', test: '+(path == this.currentPath));
		if(path === this.currentPath)
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

	backHistory: function() {
		if(this.pathHistory.length > 1) {
			this.pathHistory.pop();
			this.setMainPath(this.pathHistory.pop());
		}
		else {
			this.pathHistory = [];
			this.setMainPath('user:'+this.user.getId());
		}
	},	

	setMainPath: function(path) {
		//console.log(this+'.setMainPath: '+path);

		if(!this.notifyMainPath(path))
			return;
		
		this.pathHistory.push(path);
		if(this.pathHistory.length > 20)
			this.pathHistory.shift();

		if(this.resource !== undefined) {
			this.disconnect(this.resource, 'error', this.onResourceError);
			this.disconnect(this.resource, 'delete', this.onResourceError);
			this.disconnect(this.resource, 'ready', this.onResourceReady);
			this.resource = undefined;
		}
		if(this.contact !== undefined) {
			this.disconnect(this.contact, 'error', this.onContactError);
			this.disconnect(this.contact, 'delete', this.onContactError);
			this.disconnect(this.contact, 'ready', this.onContactReady);
			this.contact = undefined;
		}
			
		if(path === '') {
			app.setMain(new Wn.UserView({ user: this.user }));
			this.menu.setCurrentUser(this.user.getId());
			this.actionBox.setCurrent(true);
		}
		else {
			var pos = path.indexOf(':');
			if(pos === -1) {
				this.setMain(new Wn.Error());
				return;
			}
			var type = path.substring(0,pos);
			var subpath = path.substring(pos+1);
			switch(type) {
				case 'rfid':
					var rfidPath = this.user.getRfidPath(subpath);
					//console.log('setMainPath rfid: '+rfidPath);
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
							this.setMain(new Wn.Error());
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
					if(contactId === this.user.getId()) {
						app.setMain(new Wn.UserView({ user: this.user }));
						this.actionBox.setCurrent(true);
					}
					else {
						this.actionBox.setCurrent(false);
						this.contact = Wn.Contact.getContact(contactId);
						if(this.contact === undefined) {
							this.setMain(new Wn.Error());
							return;
						}
						if(this.contact.getIsReady())
							this.onContactReady();
						else {
							this.connect(this.contact, 'ready', this.onContactReady);
							this.connect(this.contact, 'error', this.onContactError);
							this.connect(this.contact, 'delete', this.onContactError);
						}
					}
					break;
				case 'resource':
					var pos = subpath.indexOf(':');
					var resourceId;
					var resourceSubpath;
					// resource with subpath
					if(pos !== -1) {
						var resourceId = subpath.substring(0, pos);
						var resourceSubpath = subpath.substring(pos+1);
						this.resourceSubpath = resourceSubpath;
					}
					// resource only
					else {
						var resourceId = subpath;
						this.resourceSubpath = undefined;
					}

					//console.log('setMainPath resource subpath: '+this.resourceSubpath);


					this.resource = Wn.Resource.getResource(resourceId, this.user);
					if(this.resource === undefined) {
						this.setMain(new Wn.Error());
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
					this.setMain(new Wn.Error());
					break;
			}
		}
		if((this.isFullscreen) && ('fullscreen' in this.getMain()))
			this.getMain().fullscreen();
	},

	onSelectionChange: function(selection) {
		if(selection.getElements().length === 0) {
			this.contextBox.hide();
			this.actionBox.show();
		}
		else {
			this.contextBox.show();
			this.actionBox.hide();
		}
	},

	onContactError: function() {
		this.disconnect(this.contact, 'error', this.onContactError);
		this.disconnect(this.contact, 'delete', this.onContactError);
		this.disconnect(this.contact, 'ready', this.onContactReady);
		this.contact = undefined;
		this.setMain(new Wn.Error());
	},

	onContactReady: function() {
		this.disconnect(this.contact, 'error', this.onContactError);
		this.disconnect(this.contact, 'delete', this.onContactError);
		this.disconnect(this.contact, 'ready', this.onContactReady);
		this.setMain(new Wn.ContactView({ user: this.user, contact: this.contact }));
		this.contact = undefined;
	},

	onResourceError: function() {
		this.disconnect(this.resource, 'error', this.onResourceError);
		this.disconnect(this.resource, 'delete', this.onResourceError);
		this.disconnect(this.resource, 'ready', this.onResourceReady);
		this.resource = undefined;
		this.setMain(new Wn.Error());
	},
	
	onResourceReady: function() {
		this.disconnect(this.resource, 'error', this.onResourceError);
		this.disconnect(this.resource, 'delete', this.onResourceError);
		this.disconnect(this.resource, 'ready', this.onResourceReady);
	
		// check if the resource is not already loaded
		if(Wn.ResourceViewer.hasInstance(this.main) && (this.main.getResource() === this.resource)) {
			console.log('onResourceReady resource is current');

			// change the subpath if needed
			if(this.resourceSubpath !== undefined)
				this.main.setPath(this.resourceSubpath);
			return;
		}
		var viewconst = Wn.ResourceViewer.getApplication(this.resource.getType());		
		if(viewconst === undefined) {
			this.setMain(new Wn.Error());
			return;
		}
		this.menu.setCurrentUser(this.resource.getOwnerId());
		this.actionBox.setCurrent(this.resource.getOwnerId() === this.user.getId());
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
		if(this.main !== undefined) {
			this.main.disable();
			this.mainbox.append(new Ui.Rectangle({ fill: 'white', opacity: 0.5 }));
			this.mainbox.append(new Ui.Loading({ width: 50, height: 50, verticalAlign: 'center', horizontalAlign: 'center' }));
		}
		this.mainbox = new Ui.LBox();
		this.main = main;
		this.mainbox.setContent(this.main);
		this.contentswitch.replaceContent(this.mainbox);

		// update the menu bar
		if('getTitle' in this.main)
			this.actionBox.setTitle(this.main.getTitle());
		if('getActions' in this.main)
			this.actionBox.setActions(this.main.getActions());
		if((localStorage.getItem('thumbsVisible') !== 'false') && ('showThumbs' in this.main))
			this.main.showThumbs();
		if((localStorage.getItem('showDetails') === 'false') && ('hideDetails' in this.main))
			this.main.hideDetails();
		if((localStorage.getItem('fullscreen') === 'true') && ('fullscreen' in this.main))
			this.main.fullscreen();
		if(this.getAutoPlay() && ('play' in this.main))
			this.main.play();
	},

	setDefaultMain: function() {
		this.setMainPath('');
	},

	getUploaders: function() {
		return this.menu.getUploaders();
	},

	addUploader: function(uploader) {
		this.actionBox.addUploader(uploader);
	},

	showThumbs: function() {
		localStorage.setItem('thumbsVisible', 'true');
		if('showThumbs' in this.main)
			this.main.showThumbs();
	},

	hideThumbs: function() {
		localStorage.setItem('thumbsVisible', 'false');
		if('hideThumbs' in this.main)
			this.main.hideThumbs();
	},

	showDetails: function() {
		localStorage.setItem('showDetails', 'true');
		if('showDetails' in this.main)
			this.main.showDetails();
	},

	hideDetails: function() {
		localStorage.setItem('showDetails', 'false');
		if('hideDetails' in this.main)
			this.main.hideDetails();
	},

	fullscreen: function() {
		localStorage.setItem('fullscreen', 'true');

		console.log(this+'.fullscreen');
//		return;

		this.menuBox.hide(true);
		this.menu.hide(true);

		if((this.main !== undefined) && ('fullscreen' in this.main))
			this.main.fullscreen();

		this.unfullscreenButton = new Ui.Button({
			verticalAlign: 'top', horizontalAlign: 'right', icon: 'unfullscreen'
		});
		this.connect(this.unfullscreenButton, 'press', this.unfullscreen);
		this.backgroundBox.append(this.unfullscreenButton);


		// request browser fullscreen
		var el = document.body;
		if('requestFullscreen' in el)
			el.requestFullscreen();
		else if('mozRequestFullScreen' in el)
			el.mozRequestFullScreen();
		else if('webkitRequestFullScreen' in el) 
			el.webkitRequestFullScreen();
	},

	unfullscreen: function() {
		localStorage.setItem('fullscreen', 'false');

		console.log(this+'.unfullscreen');

		this.menuBox.show();
		this.menu.show();

		if((this.main !== undefined) && ('fullscreen' in this.main))
			this.main.unfullscreen();

		if(this.unfullscreenButton !== undefined) {			
			this.disconnect(this.unfullscreenButton, 'press', this.unfullscreen);
			this.backgroundBox.remove(this.unfullscreenButton);
			this.unfullscreenButton = undefined;
		}

		if('exitFullscreen' in document)
			document.exitFullscreen();
		else if('mozCancelFullScreen' in document)
			document.mozCancelFullScreen();
		else if('webkitCancelFullScreen' in document)
			document.webkitCancelFullScreen();
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

	getAutoPlay: function() {
		return localStorage.getItem('autoPlay') === 'true';
	},

	setAutoPlay: function(autoPlay) {
		localStorage.setItem('autoPlay', autoPlay?'true':'false');
		if(autoPlay && ('play' in this.main))
			this.main.play();
	},

	onHashChange: function(event) {
		if(location.hash.substring(1) !== this.currentPath)
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

	onUserChange: function() {
		this.setBackgroundImage('/cloud/wallpaper/'+this.user.getWallpaper());
	},

	onUserDelete: function() {
		var dialog = new Ui.Dialog({
			title: 'Compte supprimé',
			fullScrolling: true,
			preferredWidth: 300, 
			preferredHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 'Il semble que votre compte a été supprimé.' }));
		var exitButton = new Ui.DefaultButton({ text: 'Quitter' });
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
	},

	onKeyUp: function(event) {
		// handle the delete action for the selection
		if((this.selection !== undefined) && (this.selection.getElements().length > 0)) {
			// delete
			if(event.which === 46) {
				event.stopPropagation();
				event.preventDefault();
				this.selection.executeDeleteAction();

			}
		}
	},
	
	setTheme: function(themeName) {
		var theme;
		// choose the user defined theme
		if(themeName === 'custom') {
			theme = this.user.getCustomTheme();
		}
		// look for an admin defined theme
		else {
			for(var i = 0; i < this.setup.style.themes.length; i++) {
				if(this.setup.style.themes[i].key === themeName) {
					theme = this.setup.style.themes[i];
					break;
				}
			}
		}
		// still no theme, take the first admin defined theme
		if(theme === undefined) {
			theme = this.setup.style.themes[0];
		}

		var palette = theme.palette;

		var style = {
			"Ui.Element": {
				fontFamily: "Avenir,Segoe UI Semilight,Sans-Serif",
				fontWeight: 100,
				fontSize: 16,
				linkColor: palette["default"]
			},
			"Ui.Shape": {
				color: palette.foreground
			},
			"Ui.Html": {
				color: palette.foreground
			},
			"Ui.ContentEditable": {
				fontSize: 20,
				interLine: 1.4,
				color: palette.foreground
			},
			"Ui.Text": {
				interLine: 1.4,
				color: palette.foreground
			},
			"Ui.Label": {
				color: palette.foreground
			},
			"Ui.CompactLabel": {
				color: palette.foreground
			},
			"Ui.Entry": {
				color: palette.foreground
			},
			"Ui.TextArea": {
				color: palette.foreground
			},
			"Ui.Separator": {
				color: palette.foreground
			},
			"Ui.CheckBox": {
				borderWidth: theme.thickness,
				color: palette.foreground,
				focusColor: palette.focus,
				checkColor: palette["default"]
			},
			"Ui.ProgressBar": {
				color: palette.foreground
			},
			"Ui.ScrollingArea": {
				color: palette.foreground,
				showScrollbar: false,
				overScroll: true,
				radius: theme.roundness
			},
			"Ui.TextBgGraphic": {
				borderWidth: theme.thickness,
				background: palette.foreground,
				focusBackground: palette.focus
			},
			"Ui.Button": {
				radius: theme.roundness,
				borderWidth: theme.thickness,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: palette.foreground,
				foreground: palette.foreground,
				activeForeground: palette.active,
				focusBackground: palette.focus,
				focusBackgroundBorder: palette.focus,
				focusForeground: palette.focusInv,
				focusActiveBackground: palette.focus,
				focusActiveBackgroundBorder: 'rgba(250,250,250,0)',
				focusActiveForeground: palette.active,
				orientation: 'horizontal',
				badgeColor: palette.focus,
				badgeTextColor: palette.focusInv,
				fontSize: 16,
				iconSize: 22,
				textWidth: 60,
				textHeight: 22,
				padding: theme.spacing,
				spacing: 5
			},
			"Ui.DefaultButton": {
				radius: theme.roundness,
				background: palette["default"],
				backgroundBorder: 'rgba(250,250,250,0)',
				foreground: palette.defaultInv,
				focusForeground: palette.focusInv,
				badgeColor: palette.focus
			},
			"Ui.DragEffectIcon": {
				stroke: palette.focusInv,
				strokeWidth: theme.thickness*2,
				fill: palette.focus
			},
			"Wn.SelectionButton": {
				iconSize: 48,
				orientation: 'vertical',
				textWidth: 80,
				maxTextWidth: 80,
				fontSize: 14,
				whiteSpace: 'pre-line',

				background: 'rgba(250,250,250,0)',
				backgroundBorder: 'rgba(250,250,250,0)',
				foreground: palette.foreground,

				activeBackground: palette.active,
				activeBackgroundBorder: 'rgba(250,250,250,0)',
				activeForeground: palette.focusInv,

				focusBackground: 'rgba(250,250,250,0)',
				focusBackgroundBorder: palette.focus,
				focusForeground: palette.focus,

				focusActiveBackground: palette.active,
				focusActiveBackgroundBorder: palette.focus,
				focusActiveForeground: palette.focusInv
			},
			"Wn.OptionOpenButton": {
				borderWidth: 0,
				iconSize: 16,
				whiteSpace: 'pre-line',
				background: 'rgba(250,250,250,0)',
				foreground: palette.foreground,
				activeForeground: palette.active,
				focusBackground: 'rgba(250,250,250,0)',
				focusForeground: palette.focus,
				focusActiveBackground: 'rgba(250,250,250,0)',
				focusActiveForeground: palette.active
			},
			"Ui.SegmentBar": {
				radius: theme.roundness,
				borderWidth: theme.thickness,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: palette.foreground,
				foreground: palette.foreground,
				focusBackgroundBorder: palette.focus,
				focusBackground: 'rgba(250,250,250,0)',
				focusForeground: palette.foreground,
				activeBackground: palette.focus,
				activeForeground: palette.focusInv
			},
			"Ui.Slider": {
				radius: theme.roundness,
				borderWidth: theme.thickness,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: palette.foreground,
				foreground: palette.foreground
			},
			"Wn.ImprovedText": {
				color: palette.foreground
			},
			"Wn.UserNotifyView": {
				background: Ui.Color.create(palette.focus).addA(-0.7)
			},
			"Ui.ActionButton": {
				background: 'rgba(250,250,250,0)',
				iconSize: 30,
				spacing: 5
			},
			"Wn.BarGraph": {
				foreground: palette.foreground,
				barColor: palette["default"]
			},
			"Wn.MenuToolBar": {
				"Ui.Button": {
					showText: true,
					background: 'rgba(250,250,250,0)',
					backgroundBorder: 'rgba(250,250,250,0)',
					foreground: palette.foreground,
					activeBackground: 'rgba(250,250,250,0)',
					activeBackgroundBorder: 'rgba(250,250,250,0)',
					activeForeground: palette.active,
					focusBackground: 'rgba(250,250,250,0)',
					focusBackgroundBorder: palette.focus,
					focusForeground: palette.foreground,
					focusActiveBackground: 'rgba(250,250,250,0)',
					focusActiveBackgroundBorder: palette.focus,
					focusActiveForeground: palette.active,
					orientation: 'horizontal',
					fontSize: 14,
					iconSize: 32,
					spacing: 5,
					radius: 0
				}
			},
			"Ui.MenuPopup": {
				"Ui.Button": {
					borderWidth: 0,
					showText: true,
					background: Ui.Color.create(palette.foreground).addA(-1).addY(0.3),//'rgba(250,250,250,0)',
					foreground: palette.foreground,
					activeBackground: Ui.Color.create(palette.foreground).addA(-1).addY(0.3),//'rgba(250,250,250,0)',
					activeForeground: palette.active,
					orientation: 'horizontal',
					iconSize: 32,
					textHeight: 32,
					spacing: 10,
					radius: 0
				}
			},
			"Ui.ComboPopup": {
				"Ui.Button": {
					borderWidth: 0,
					showText: true,
					background: Ui.Color.create(palette.foreground).addA(-1).addY(0.3),//'rgba(250,250,250,0)',
					foreground: palette.foreground,
					activeBackground: Ui.Color.create(palette.foreground).addA(-1).addY(0.3),//'rgba(250,250,250,0)',
					activeForeground: palette.active,
					orientation: 'horizontal',
					iconSize: 32,
					textHeight: 32,
					spacing: 10,
					radius: 0
				}
			},
			"Ui.MenuToolBarButton": {
				"Ui.Button": {
					borderWidth: 0,
					background: 'rgba(250,250,250,0)',
					foreground: palette.menuInv,
					spacing: 0
				}
			},
			"Ui.MenuPopupSeparator": {
				color: Ui.Color.create(palette.foreground).addA(-0.85)
			},
			"Wn.BackButton": {
				showText: false,
				spacing: 0
			},
			"Wn.DetailsBox": {
				background: Ui.Color.create(palette.background).addA(-0.7),
				"Ui.Button": {
					showText: true,
					iconSize: 22,
					spacing: 5
				},
				"Wn.OptionOpenButton": {
					iconSize: 16
				},
				"Ui.Text": {
					wordWrap: 'break-word'
				}
			},
			"Wn.NavigationBox": {
				background: Ui.Color.create(palette.background).addA(-0.7)
			},
			"Wn.ResourceViewer": {
				background: Ui.Color.create(palette.background).addA(-0.7)
			},
			"Wn.ResourceTitle": {
				fontWeight: 400,
				fontSize: 24,
				color: "#e1e1e1"
			},
			"Wn.ResourceView": {
				fontSize: 14,
				color: palette.files,
				padding: 0,
				backgroundBorder: 'rgba(250,250,250,0)',
				background: palette.background,
				foreground: palette.foreground
			},
			"Calendar.Preview": {
				color: palette.calendar
			},
			"News.Preview": {
				color: palette.news
			},
			"Podcast.Preview": {
				color: palette.podcast
			},
			"Wn.ResourceViewerTitle": {
				fontWeight: 400,
				fontSize: 24,
				color: palette.foreground
			},
			"Wn.AppView": {
				iconSize: 96,
				backgroundBorder: 'rgba(250,250,250,0)',
				background: palette.background,
				foreground: palette.foreground
			},
			"Wn.MenuTitle": {
				fontWeight: 400,
				fontSize: 20,
				color: palette.menuInv
			},
			"Wn.NewRibbon": {
				background: palette.focus
			},
			"Ui.ContextBar": {
				background: palette.focus,
				"Ui.Element": {
					color: palette.focusInv
				},
				"Ui.Button": {
					iconSize: 32
				}
			},
			"Ui.ContextBarCloseButton": {
				borderWidth: 0,
				background: 'rgba(250,250,250,0)',
				foreground: palette.focusInv,
				iconSize: 22,
				fontSize: 16,
				textWidth: 5,
				spacing: 5
			},
			"Ui.DialogTitle": {
				color: palette.menuInv,
				fontWeight: 'bold',
				fontSize: 18
			},
			"Ui.DialogButtonBox": {
				background: palette.menu,
				"Ui.Button": {
					borderWidth: theme.thickness,
					backgroundBorder: palette.menuInv,
					foreground: palette.menuInv
				},
				"Ui.DefaultButton": {
					borderWidth: theme.thickness,
					backgroundBorder: palette.menuInv,
					background: palette.menuInv,
					foreground: palette.menu
				},
				"Ui.SegmentBar": {
					background: 'rgba(250,250,250,0)',
					backgroundBorder: palette.menuInv,
					foreground: palette.menuInv,
					focusBackground: 'rgba(250,250,250,0)',
					focusBackgroundBorder: palette.focus,
					focusForeground: palette.menuInv,
					activeBackground: palette.menuInv,
					activeForeground: palette.menu
				}
			},
			"Ui.DialogCloseButton": {
				showText: false,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: 'rgba(250,250,250,0)'
			},
			"Ui.Dialog": {
				background: palette.background,
				shadow: Ui.Color.create(palette.foreground).addA(-0.8)
			},
			"Ui.Popup": {
				background: palette.background,
				shadow: Ui.Color.create(palette.foreground).addA(-0.8)
			},
			"Ui.Selectionable": {
				borderWidth: theme.thickness,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: 'rgba(250,250,250,0)',
				foreground: palette.foreground,
				activeForeground: palette.active,
				focusBackground: 'rgba(250,250,250,0)',
				focusBackgroundBorder: palette.focus,
				focusForeground: palette.focus,
				focusActiveBackground: palette.focus,
				focusActiveBackgroundBorder: 'rgba(250,250,250,0)',
				focusActiveForeground: palette.active,
				padding: theme.spacing
			},
			"Ui.ActionButton": {
				backgroundBorder: 'rgba(250,250,250,0)',
				background: 'rgba(250,250,250,0)',
				foreground: palette.focusInv
			},
			"Ui.Carousel": {
				focusColor: palette.focus
			},
			"Storage.PageBackgroundGraphic": {
				background: palette.background
			},
			"Wn.FlowDropBox": {
				markerColor: palette.focus
			},
			"Wn.SFlowDropBox": {
				markerColor: palette.focus
			},
			"Wn.HDropBox": {
				markerColor: palette.focus
			},
			"Wn.VDropBox": {
				markerColor: palette.focus
			},
			"Wn.ListAddButton": {
				radius: theme.roundness,
				iconSize: 48,
				orientation: 'vertical',
				borderWidth: theme.thickness,
				background: 'rgba(250,250,250,0)',
				backgroundBorder: 'rgba(250,250,250,0)',
				foreground: palette.foreground,
				focusBackground: 'rgba(250,250,250,0)',
				focusBackgroundBorder: palette.focus,
				focusForeground: palette.focus
			},
			"Wn.UploadFaceButton": {
				iconSize: 64
			},
			"Wn.MediaPlayBar": {
				background: Ui.Color.create(palette.background).addA(-0.5),
				foreground: palette.foreground
			},
			"Wn.PlayButton": {
				background: Ui.Color.create(palette.background).addA(-0.5),
				foreground: palette.foreground
			},
			"Wn.Menu": {
				background: Ui.Color.create(palette.background).addA(-0.7),
				"Ui.Button": {
					radius: 0,
					iconSize: 48,
					orientation: 'vertical',
					borderWidth: theme.thickness,
					background: 'rgba(250,250,250,0)',
					backgroundBorder: 'rgba(250,250,250,0)',
					foreground: palette.foreground,
					focusBackground: 'rgba(250,250,250,0)',
					focusBackgroundBorder: palette.focus,
					focusForeground: palette.foreground
				}
			},
			"Wn.AppMenuToolBar": {
				background: palette.menu,
				"Ui.ProgressBar": {
					color: palette.menuInv
				},
				"Ui.Button": {
					borderWidth: 0,
					background: Ui.Color.create(palette.menuInv).addA(-1).addY(0.4).addS(-1),//'rgba(250,250,250,0)',
					foreground: palette.menuInv,
					activeBackground: 'rgba(250,250,250,0)',
					activeForeground: palette.active,
					activeBackgroundBorder: 'rgba(250,250,250,0)',
					badgeTextColor: palette.focusInv,
					iconSize: 32,
					radius: 0
				},
				"Ui.MenuToolBarButton": {
					"Ui.Button": {
						background: 'rgba(250,250,250,0)',
						foreground: palette.menuInv,
						iconSize: 28,
						spacing: 0
					}
				}
			},
			"Wn.MenuUser": {
				"Ui.Button": {
					borderWidth: 0,
					showText: false,
					background: Ui.Color.create(palette.menu).addL(-0.2),
					foreground: palette.menuInv,
					activeForeground: palette.menuInv,
					activeBackground: Ui.Color.create(palette.menu).addL(-0.2),
					focusForeground: palette.focusInv,
					focusActiveForeground: palette.focusInv,
					focusActiveBackground: palette.focus
				}
			},
			"Wn.MenuContact": {
				fontSize: 14
			},
			"Wn.ContactArrow": {
				color: palette.focus
			},
			"Storage.CurrentArrow": {
				color: palette.focus
			},
			"Wn.PosButton": {
				borderWidth: theme.thickness,
				backgroundBorder: palette.foreground,
				foreground: palette.background
			},
			"Wn.PosBar": {
				radius: theme.roundness,
				current: palette.focus,
				load: Ui.Color.create(palette.background).addA(-0.5),
				background: palette.foreground
			},
			"Wn.StyleWallpaper": {
				backgroundBorder: 'rgba(250,250,250,0)',
				padding: theme.spacing,
				activeBackground: 'rgba(250,250,250,0)',//Ui.Color.create(palette.focus).addA(-0.5),
				activeBackgroundBorder: palette.active,// 'rgba(250,250,250,0)',
				focusActiveBackgroundBorder: palette.focus,
				focusActiveBackground: Ui.Color.create(palette.focus).addA(-0.5),
				radius: 0,
				background: 'rgba(250,250,250,0)',
				iconSize: 64
			},
			"Storage.UploadView": {
				radius: Number.MAX_VALUE,
				background: palette["default"],
				backgroundBorder: 'rgba(250,250,250,0)',
				foreground: palette.defaultInv,
				focusForeground: palette.focusInv,
				badgeColor: palette.focus,
				orientation: 'vertical',
				whiteSpace: 'pre-line',
				iconSize: 140,
				interLine: 1.4,
				padding: 20,
				textWidth: 160
			},
			"Storage.FilePreview": {
				orientation: 'vertical',
				whiteSpace: 'pre-line',
				textWidth: 80,
				iconSize: 64,
				backgroundBorder: 'rgba(250,250,250,0)'
			},
			"Wn.CommentView": {
				orientation: 'horizontal',
				iconSize: 32,
				maxTextWidth: Number.MAX_VALUE
			},
			"Wn.ResourceContactRight": {
				orientation: 'vertical',
				whiteSpace: 'pre-line',
				textWidth: 80
			},
			"Wn.AddContactIcon": {
				whiteSpace: 'pre-line',
				textWidth: 80,
				maxLine: 2
			}
		};
		this.setStyle(style);
	}
});
	
var themes = [
	{
		"title": "Elise",
		"key": "elise",
		"thickness": 1,
		"roundness": 0,
		"spacing": 10,
		"palette": {
			"menu": "rgb(0,160,160)",
			"menuInv": "rgb(255,255,255)",
			"background": "rgb(241,241,241)",
			"foreground": "rgb(102,102,102)",
			"focus": "rgb(226,0,69)",
			"focusInv": "rgb(255,255,255)",
			"active": "rgb(33,211,255)",
			"default": "rgb(0,160,160)",
			"defaultInv": "rgb(255,255,255)",
			"files": "rgb(102,102,102)",
			"calendar": "#7A6FAB",
			"news": "#FABB00",
			"podcast": "#85B500"
		}
	},
	{
		"title": "Pink World",
		"key": "pink",
		"thickness": 1,
		"roundness": 0,
		"spacing": 10,
		"palette": {
			"menu": "rgb(220,220,220)",
			"menuInv": "rgb(80,80,80)",
			"background": "rgb(241,241,241)",
			"foreground": "rgb(102,102,102)",
			"focus": "#ff80b0",
			"focusInv": "rgb(255,255,255)",
			"active": "#0288c9",
			"default": "rgb(102,102,102)",
			"defaultInv": "#ffe3ee",
			"files": "#02a8fc",
			"calendar": "#f7d30f",
			"news": "#f94e81",
			"podcast": "#99cb36"
		}
	},
	{
		"title": "Forêt",
		"key": "forest",
		"thickness": 1,
		"roundness": 0,
		"spacing": 10,
		"palette": {
			"menu": "#C2FFB3",
			"menuInv": "#5b5756",
			"background": "#dad9d4",
			"foreground": "#5b5756",
			"focus": "#8FCC48",
			"focusInv": "rgb(255,255,255)",
			"active": "#FF739A",
			"default": "#998782",
			"defaultInv": "#C2FFB3",
			"files": "#02a8fc",
			"calendar": "#f7d30f",
			"news": "#f94e81",
			"podcast": "#99cb36"
		}
	},
	{
		"title": "Dark Orange",
		"key": "darkorange",
		"thickness": 2,
		"roundness": 0,
		"spacing": 10,
		"palette": {
			"menu": "#5a5a5a",
			"menuInv": "#e4ba77",
			"background": "#525250",
			"foreground": "#dbd3ce",
			"focus": "#ffa500",
			"focusInv": "#ffffff",
			"active": "#ff739a",
			"default": "#ffc355",
			"defaultInv": "#342200",
			"files": "#02a8fc",
			"calendar": "#f7d30f",
			"news": "#f94e81",
			"podcast": "#99cb36"
		}
	},
	{
		"title": "Personnalisée",
		"key": "custom",
		"thickness": 1,
		"roundness": 0,
		"spacing": 10,
		"palette": {
			"menu": "#C2FFB3",
			"menuInv": "#5b5756",
			"background": "#dad9d4",
			"foreground": "#5b5756",
			"focus": "#8FCC48",
			"focusInv": "rgb(255,255,255)",
			"active": "#FF739A",
			"default": "#998782",
			"defaultInv": "#C2FFB3",
			"files": "#02a8fc",
			"calendar": "#f7d30f",
			"news": "#f94e81",
			"podcast": "#99cb36"
		}
	}
];

var app = new Wn.App({ webApp: true });

//app.requireFont('Ubuntu', '100');
//app.requireFont('Ubuntu', '400');
//app.requireFont('Ubuntu', '700');
