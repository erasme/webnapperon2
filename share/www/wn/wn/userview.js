
Wn.SFlowDropBox.extend('Wn.UserResourcesFlow', {
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
		this.resources = new Wn.UserResourcesFlow({
			verticalAlign: 'top', margin: 40, spacing: 40
		});
		this.resources.addMimetype(Wn.ResourceView);
		this.setContent(this.resources);
		this.connect(this.resources, 'dropat', this.onResourceDropAt);

		this.resources.append(new Wn.ResourceNew({ user: this.user, width: 180, height: 220 }));
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
		var share = new viewConst({ user: this.user, resource: resource, width: 180, height: 220 });
		this.resources.insertAt(share, this.resources.getLogicalChildren().length-1);
	},
	
	onResourceDropAt: function(flowbox, mimetype, data, pos) {
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
//	messages: undefined,
	menuBackground: undefined,
	menuvbox: undefined,
	userface: undefined,
//	messagesScroll: undefined,
	contentBox: undefined,
	selection: undefined,
//	menuBox: undefined,
//	actionBox: undefined,
	actions: undefined,
//	contextBox: undefined,
	historyButton: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.user = config.user;
		delete(config.user);

		this.actions = [];

		var vbox = new Ui.VBox();
		this.setContent(vbox);

//		this.selection = new Ui.Selection();
//		this.connect(this.selection, 'change', this.onSelectionChange);

//		this.menuBox = new Ui.LBox();
//		vbox.append(this.menuBox);

		// user partthis.selection
		this.actionBox = new Wn.MenuToolBar({ margin: 5, spacing: 5 });
//		this.menuBox.append(this.actionBox);

		this.userface = new Wn.UserFace({ user: this.user });
		this.actionBox.append(this.userface);

		this.userlabel = new Wn.UserTitle({ text: '', marginLeft: 10, marginRight: 10, textAlign: 'left', verticalAlign: 'center' });
		this.actionBox.append(this.userlabel, true);

		if(Ui.App.current.getUser().isAdmin()) {
			var button = new Ui.Button({ icon: 'tools', text: 'Administation' });
			this.connect(button, 'press', this.onGlobalStatsPress);
			this.actions.push(button);
//			this.actionBox.append(button);
		}

//		this.historyButton = new Ui.Button({ icon: 'chathistory', text: 'Historique' });
//		this.connect(this.historyButton, 'press', this.onChatHistoryPress);
//		this.actionBox.append(this.historyButton);

//		var button = new Ui.Button({ icon: 'person', text: 'Profil' });
//		this.connect(button, 'press', this.onProfilPress);
//		this.actionBox.append(button);

//		var button = new Ui.Button({ icon: 'exit', text: 'Déconnexion' });
//		this.connect(button, 'press', this.onExitPress);
//		this.actionBox.append(button);

//		this.contextBox = new Ui.ContextBar({ selection: this.selection });
//		this.contextBox.hide();
//		this.menuBox.append(this.contextBox);

		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false });
		vbox.append(scroll, true);

		var vbox2 = new Ui.VBox();
		scroll.setContent(vbox2);

		// messages part
//		this.messagesScroll = new Ui.ScrollingArea({ scrollVertical: false });
//		vbox2.append(this.messagesScroll);
//		this.messages = new Ui.HBox({ uniform: true, horizontalAlign: 'left' });
//		this.messagesScroll.setContent(this.messages);
		// resources part
		vbox2.append(new Wn.UserResourcesView({ user: this.user }));
		
		// for poor connection networks, check if
		// we miss some updates
		this.user.updateUser();
		this.user.updateMessages();
	},

	getTitle: function() {
		return this.user.getName();
	},

	getActions: function() {
		return this.actions;
	},

	// implement a selection handler for Selectionable elements
//	getSelectionHandler: function() {
//		return this.selection;
//	},

	onUserChange: function() {
		this.userlabel.setText(this.user.getUser().firstname+' '+this.user.getUser().lastname);
	},

/*	onUserMessagesChange: function() {
//		while(this.messages.getFirstChild() != undefined)
//			this.messages.remove(this.messages.getFirstChild());

		var count = 0;
		for(var i = 0; i < this.user.getMessages().length; i++) {
			var message = this.user.getMessages()[i];

			if((message.getDestination() == this.user.getId()) && !message.getSeen()) {
//				var messageView = new Wn.MessageView({ user: this.user, message: message, width: 210, height: 54, margin: 5 });
//				this.messages.append(messageView);
				count++;
			}
		}
		if(count === 0)
			this.historyButton.setBadge(undefined);
		else
			this.historyButton.setBadge(count);
	},*/
	
	onGlobalStatsPress: function() {
		var dialog = new Wn.UserStatsDialog();
		dialog.open();
	},
	
	onChatHistoryPress: function(button) {
		var popup = new Wn.HistoryMessagesPopup({ user: this.user });
		popup.show(button, 'bottom');


//		var dialog = new Wn.HistoryMessagesDialog({ user: this.user });
//		dialog.open();
	},

	onProfilPress: function() {
		var dialog = new Wn.UserProfil({ user: this.user });
		dialog.open();
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
				cancelButton: new Ui.Button({ text: 'Annuler' }),
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

//		this.connect(this.user, 'messageschange', this.onUserMessagesChange);
//		this.onUserMessagesChange();
	},
	
	onUnload: function() {
		Wn.UserResourcesView.base.onUnload.call(this);

//		this.disconnect(this.user, 'change', this.onUserChange);
//		this.disconnect(this.user, 'messageschange', this.onUserMessagesChange);
	}
});

