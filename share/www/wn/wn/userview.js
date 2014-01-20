
Wn.FlowDropBox.extend('Wn.UserResourcesFlow', {
}, {
	checkPosition: function(position) {
		if(position == this.getLogicalChildren().length)
			return false;
		else
			return true;
	}
});

Ui.LBox.extend('Wn.UserResourcesView', {
	user: undefined,
	resources: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		// resources part
		//this.resources = new Ui.Flow({ uniform: true, verticalAlign: 'top' });
		this.resources = new Wn.UserResourcesFlow({ verticalAlign: 'top' });
		this.resources.addMimetype('Wn.ResourceView');
//		this.resources.addMimetype('application/x-wn2-resource');
		this.setContent(this.resources);
		this.connect(this.resources, 'dropat', this.onResourceDropAt);

		this.resources.append(new Wn.ResourceNew({ user: this.user, margin: 5, width: 210, height: 244 }));
	},

	onUserChange: function() {
		// find the bookmark diff
		var remove = [];
		var add = [];

		for(var i2 = 0; i2 < this.resources.getLogicalChildren().length; i2++)
			this.resources.getLogicalChildren()[i2].userViewFound = false;

		for(var i = 0; i < this.user.getBookmarks().length; i++) {
			var resourceData = this.user.getBookmarks()[i];
			var found = undefined;
			for(var i2 = 0; (found == undefined) && (i2 < this.resources.getLogicalChildren().length); i2++) {
				if(!Wn.ResourceView.hasInstance(this.resources.getLogicalChildren()[i2]))
					continue;
				if(this.resources.getLogicalChildren()[i2].getResource().getId() == resourceData.getId())
					found = this.resources.getLogicalChildren()[i2];
			}
			if(found == undefined)
				add.push(resourceData);
			else
				found.userViewFound = true;
		}

		for(var i2 = 0; i2 < this.resources.getLogicalChildren().length; i2++) {
			if(!Wn.ResourceView.hasInstance(this.resources.getLogicalChildren()[i2]))
				continue;
			if(!this.resources.getLogicalChildren()[i2].userViewFound)
				remove.push(this.resources.getLogicalChildren()[i2]);
		}

		// remove old
		for(var i = 0; i < remove.length; i++)
			this.resources.remove(remove[i]);

		// add new
		if(add.length > 0) {
			for(var i = 0; i < add.length; i++) {
				if(add[i].getIsReady())
					this.onAddNewResourceReady(add[i]);
				else
					this.connect(add[i], 'ready', this.onAddNewResourceReady);
			}
		}
	},
	
	onAddNewResourceReady: function(resource) {
		var viewConst = Wn.ResourceView.getView(resource.getType());
		if(viewConst === undefined)
			viewConst = Wn.ResourceView;
		var share = new viewConst({ user: this.user, resource: resource, margin: 5, width: 210, height: 244 });
		this.resources.insertAt(share, this.resources.getLogicalChildren().length-1);
	},
	
	onResourceDropAt: function(flowbox, mimetype, data, pos) {
//		console.log('onResourceDropAt');
//		console.log(data);
		// check if we already display this resource
		var found = undefined;
		var foundAt = -1;
		for(var i = 0; (i < this.resources.getLogicalChildren().length) && (found === undefined); i++) {
			var resource = this.resources.getLogicalChildren()[i];
			if(Wn.ResourceView.hasInstance(resource) && (resource === data)) {
				found = resource;
				foundAt = i;
			}
		}
		if(found !== undefined) {
			if((foundAt != pos) && (foundAt+1 != pos)) {
				if(foundAt < pos)
					pos--;
				this.resources.moveAt(found, pos);
				this.user.setBookmarkPosition(found.getResource(), pos);
			}
		}
	}
	
}, {
	onLoad: function() {
		Wn.UserResourcesView.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		Wn.UserResourcesView.base.onUnload.call(this);

		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.CompactLabel.extend('Wn.UserTitle', {
	constructor: function(config) {
		this.setMaxLine(2);
		this.setWidth(100);
	}
});

Ui.LBox.extend('Wn.UserView', {
	user: undefined,
	messages: undefined,
	menuBackground: undefined,
	menuvbox: undefined,
	userface: undefined,
	messagesScroll: undefined,
	contentBox: undefined,
	selection: undefined,
	menuBox: undefined,
	actionBox: undefined,
	contextBox: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		var vbox = new Ui.VBox();
		this.setContent(vbox);

		this.selection = new Ui.Selection();
		this.connect(this.selection, 'change', this.onSelectionChange);

		this.menuBox = new Ui.LBox();
		vbox.append(this.menuBox);

		// user part
		this.actionBox = new Ui.MenuToolBar({ margin: 5, spacing: 5 });
		this.menuBox.append(this.actionBox);

		this.userface = new Wn.UserFace({ user: this.user });
		this.actionBox.append(this.userface);

		this.userlabel = new Wn.UserTitle({ text: '', marginLeft: 10, marginRight: 10, textAlign: 'left', verticalAlign: 'center' });
		this.actionBox.append(this.userlabel, true);

		if(Ui.App.current.getUser().isAdmin()) {
			var button = new Ui.Button({ icon: 'stats' });
			this.connect(button, 'press', this.onGlobalStatsPress);
			this.actionBox.append(button);
		}

		var button = new Ui.Button({ icon: 'chathistory' });
		this.connect(button, 'press', this.onChatHistoryPress);
		this.actionBox.append(button);

		var button = new Ui.Button({ icon: 'person' });
		this.connect(button, 'press', this.onProfilPress);
		this.actionBox.append(button);

		var button = new Ui.Button({ icon: 'exit' });
		this.connect(button, 'press', this.onExitPress);
		this.actionBox.append(button);

		this.contextBox = new Ui.ContextBar({ selection: this.selection });
		this.contextBox.hide();
		this.menuBox.append(this.contextBox);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
		vbox.append(scroll, true);

		var vbox2 = new Ui.VBox();
		scroll.setContent(vbox2);

		// messages part
		this.messagesScroll = new Ui.ScrollingArea({ scrollVertical: false,  directionRelease: true });
		vbox2.append(this.messagesScroll);
		this.messages = new Ui.HBox({ uniform: true, horizontalAlign: 'left' });
		// resources part
		this.messagesScroll.setContent(this.messages);
		vbox2.append(new Wn.UserResourcesView({ user: this.user }));
		
		// for poor connection networks, check if
		// we miss some updates
		this.user.updateUser();
		this.user.updateMessages();
	},

	// implement a selection handler for Selectionable elements
	getSelectionHandler: function() {
		return this.selection;
	},

	onUserChange: function() {
//		if(this.user.getFaceUrl() != undefined)
//			this.userface.setSrc(this.user.getFaceUrl());
		this.userlabel.setText(this.user.getUser().firstname+' '+this.user.getUser().lastname);
	},

	onUserMessagesChange: function() {
		while(this.messages.getFirstChild() != undefined)
			this.messages.remove(this.messages.getFirstChild());

		var count = 0;
		for(var i = 0; i < this.user.getMessages().length; i++) {
			var message = this.user.getMessages()[i];

			if((message.getDestination() == this.user.getId()) && !message.getSeen()) {
				var messageView = new Wn.MessageView({ user: this.user, message: message, width: 210, height: 54, margin: 5 });
				this.messages.append(messageView);
				count++;
			}
		}
	},
	
	onGlobalStatsPress: function() {
		var dialog = new Wn.UserStatsDialog();
		dialog.open();
	},
	
	onChatHistoryPress: function() {
		var dialog = new Wn.HistoryMessagesDialog({ user: this.user });
		dialog.open();
	},

	onProfilPress: function() {
		var dialog = new Wn.UserProfil({ user: this.user });
		dialog.open();
	},

	onExitPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Déconnexion',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300,
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous vraiment vous déconnecter ?'})
		});
		var logoutButton = new Ui.Button({ text: 'Déconnecter', style: { "Ui.Button": { color: '#fa4141' } } });
		this.connect(logoutButton, 'press', function() {
			if('localStorage' in window) {
				// remove login
				localStorage.removeItem('login');
				// remove password
				localStorage.removeItem('password');
				// remove currentPath
				localStorage.removeItem('currentPath');
				// remove the authsession
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
	},

	onAuthSessionDelete: function() {
		// reload everything without hash
		var loca = window.location.href;
		if(loca.lastIndexOf('#') != -1)
			loca = loca.substring(0, loca.lastIndexOf('#'));
		window.location.replace(loca);
	},

	onDeletePress: function() {
		var dialog = new Ui.Dialog({ preferedWidth: 300, title: 'Suppression de compte' });
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment supprimer votre compte ? ATTENTION, vous ne pourrez plus connecter '+
			'et toutes vos ressources seront supprimées.' }))
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));
		var deleteButton = new Ui.Button({ text: 'Supprimer' });
		deleteButton.setStyle({ 'Ui.Button': { color: '#d04040' }});
		dialog.setActionButtons([deleteButton]);

		this.connect(deleteButton, 'press', function() {
			dialog.disable();
			var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/user?cmd=delete&user='+this.user.getId() });
			this.connect(request, 'done', function() {
				dialog.close();
				window.location.reload();
			});
			this.connect(request, 'error', function() {
				dialog.close();
				window.location.reload();
			});
			request.send();
		});
		dialog.open();
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
	}
}, {
	onLoad: function() {
		Wn.UserResourcesView.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();

		this.connect(this.user, 'messageschange', this.onUserMessagesChange);
		this.onUserMessagesChange();
	},
	
	onUnload: function() {
		Wn.UserResourcesView.base.onUnload.call(this);

		this.disconnect(this.user, 'change', this.onUserChange);
		this.disconnect(this.user, 'messageschange', this.onUserMessagesChange);
	}
});

