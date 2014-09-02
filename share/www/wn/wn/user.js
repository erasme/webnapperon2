
Core.Object.extend('Wn.User', {
	id: undefined,
	user: undefined,
	resources: undefined,
	contacts: undefined,
	bookmarks: undefined,
	userRequest: undefined,
	userSocket: undefined,
	userSocketAlive: false,
	userRetryTask: undefined,
	monitor: true,
	serverVersion: undefined,
	watchedResource: undefined,

	isReady: false,
	messages: undefined,
	messagesRequest: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'delete', 'change', 'messageschange', 'serverchange', 'order', 'call');

		this.user = config.user;
		delete(config.user);
		
		this.id = this.user.id;

		if('monitor' in config) {
			this.monitor = config.monitor;
			delete(config.monitor);
		}
		this.resources = [];
		this.contacts = [];
		this.bookmarks = [];

		// monitor user changes
		if(this.monitor) {
			this.startUserMonitoring();
			this.updateUserData(this.user);
		}
		else {
			this.updateUser();
		}

		// handle messages
		this.messages = [];
		this.updateMessages();
	},

	getName: function() {	
		if(!this.getIsReady())
			return '';
		else if((this.getData().firstname === null) && (this.getData().lastname === null) && (this.getData().login === null))
			return '';
		else if((this.getData().firstname === null) && (this.getData().lastname === null))
			return this.getData().login;
		else if(this.getData().firstname === null)
			return this.getData().lastname;
		else if(this.getData().lastname === null)
			return this.getData().firstname; 
		else
			return this.getData().firstname+' '+this.getData().lastname;
	},

	getIsReady: function() {
		return this.isReady;
	},

	getUser: function() {
		return this.user;
	},

	getData: function() {
		return this.user;
	},

	getId: function() {
		return this.id;
	},

	getLogin: function() {
		return this.user.login;
	},

	getFaceUrl: function() {
		return '/cloud/user/'+this.id+'/face?rev='+this.user.face_rev;
	},

	isAdmin: function() {
		return this.user.admin;
	},

	getBookmarks: function() {
		return this.bookmarks;
	},

	getResources: function() {
		return this.resources;
	},

	getRfidsFromPath: function(path) {
		var rfids = [];
		if(this.user.rfids !== undefined) {
			for(var i = 0; i < this.user.rfids.length; i++) {
				var item = this.user.rfids[i];
				if(item.path == path)
					rfids.push(item.id);
			}
		}
		return rfids;
	},

	getRfidPath: function(id) {
		if(this.user.rfids !== undefined) {
			for(var i = 0; i < this.user.rfids.length; i++) {
				var item = this.user.rfids[i];
				if(item.id == id)
					return item.path;
			}
		}
		return undefined;
	},

	watchResource: function(resource) {
		this.watchedContact = undefined;
		this.watchedResource = resource;
		if(this.userSocketAlive)
			this.userSocket.send(JSON.stringify({ type: 'watch', resource: this.watchedResource.getId() }));
	},

	watchContact: function(contact) {
		this.watchedResource = undefined;
		this.watchedContact = contact;
		if(this.userSocketAlive)
			this.userSocket.send(JSON.stringify({ type: 'watch', resource: this.watchedContact.getId() }));
	},

	getResource: function(id) {
		for(var i = 0; i < this.resources.length; i++)
			if(this.resources[i].getId() === id)
				return this.resources[i];
		return undefined;
	},

	getResourceAndPathFromData: function(content) {
		var resource = undefined;
		var path = undefined;
		var sepPos = content.indexOf(':');
		if(sepPos !== -1) {
			var type = content.substring(0, sepPos);
			var data = content.substring(sepPos+1);
			var foundResource = undefined;
			var foundPath = undefined;
			for(var i = 0; (foundResource === undefined) && (i < this.resources.length); i++) {
				var resource = this.resources[i];
				if((resource.getType() == type) && (data.search(resource.getData()) == 0)) {
					foundResource = resource;
					if(data.length != resource.getData().length) {
						foundPath = data.substring(resource.getData().length);
					}
				}
			}
			resource = foundResource;
			path = foundPath;
		}
		return { resource: resource, path: path };
	},

	getContacts: function() {
		return this.contacts;
	},

	getContact: function(id) {
		var contact = undefined;
		for(var i = 0; (contact === undefined) && (i < this.contacts.length); i++) {
			if(this.contacts[i].getId() === id)
				contact = this.contacts[i];
		}
		return contact;
	},

	addContacts: function(contacts) {
		var contactsList = [];
		for(var i = 0; i < contacts.length; i++) {
			contactsList.push({ id: contacts[i].getId() });
		}
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user/'+this.id+'/contacts',
			content: JSON.stringify(contactsList)
		});
		request.send();		
		if(!this.userSocketAlive)
			this.updateUser();
	},
	
	prependContacts: function(contacts) {
		var contactsList = [];
		for(var i = 0; i < contacts.length; i++) {
			contactsList.push({ id: contacts[i].getId(), position: i });
		}
		var request = new Core.HttpRequest({ method: 'POST', url: '/cloud/user/'+this.id+'/contacts',
			content: JSON.stringify(contactsList)
		});
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();
	},
	
	prependContact: function(contact) {
		this.prependContacts([contact]);
	},

	addContact: function(contact) {
		this.addContacts([contact]);
	},

	removeContacts: function(contacts) {
		for(var i = 0; i < contacts.length; i++) {
			var request = new Core.HttpRequest({
				method: 'DELETE',
				url: '/cloud/user/'+this.id+'/contacts/'+contacts[i].getId()
			});
			request.send();
		}
		if(!this.userSocketAlive)
			this.updateUser();
	},

	removeContact: function(contact) {
		this.removeContacts([contact]);
	},

	removeResource: function(resource) {
		resource.deleteResource();
		if(!this.userSocketAlive)
			this.updateUser();
	},

	createResource: function(resource) {
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/user/'+this.id+'/resources',
			content: JSON.stringify(resource)
		});
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();
	},
	
	bookmarkResource: function(resource) {
		var resourceId;
		if(Wn.Resource.hasInstance(resource))
			resourceId = resource.getId();
		else if('id' in resource)
			resourceId = resource.id;
		else
			resourceId = resource;
	
		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/user/'+this.id+'/bookmarks',
			content: JSON.stringify({ "resource": resourceId })
		});
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();	
	},
	
	unbookmarkResource: function(resource) {
		var resourceId;
		if(Wn.Resource.hasInstance(resource))
			resourceId = resource.getId();
		else if('id' in resource)
			resourceId = resource.id;
		else
			resourceId = resource;
	
		var request = new Core.HttpRequest({
			method: 'DELETE',
			url: '/cloud/user/'+this.id+'/bookmarks/'+resourceId
		});
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();	
	},
	
	setBookmarkPosition: function(resource, position) {
		var resourceId;
		if(Wn.Resource.hasInstance(resource))
			resourceId = resource.getId();
		else if('id' in resource) {
			resourceId = resource.id;
			if((position == undefined) && ('position' in resource))
				position = resource.position;
		}
		else
			resourceId = resource;
	
		var request = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/user/'+this.id+'/bookmarks/'+resourceId,
			content: JSON.stringify({ "position": position })
		});
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();
	},
	
	setContactPosition: function(contact, position) {
		var contactId;
		if(Wn.Contact.hasInstance(contact))
			contactId = contact.getId();
		else if('id' in contact) {
			contactId = contact.id;
			if((position == undefined) && ('position' in contact))
				position = contact.position;
		}
		else
			contactId = contact;

		var request = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/user/'+this.id+'/contacts/'+contactId,
			content: JSON.stringify({ "position": position }) });
		request.send();
		if(!this.userSocketAlive)
			this.updateUser();
  	},

  	getWallpaper: function() {
  		if((this.user.data !== null) && (this.user.data !== undefined) && (this.user.data.wallpaper !== undefined) && (this.user.data.wallpaper !== null))
  			return this.user.data.wallpaper;
  		else {
			var wallpaper = Ui.App.current.getThemeWallpaper(this.getTheme());
			if(wallpaper !== undefined)
				return wallpaper;
			else
  				return "default.jpeg";
  		}
	},

	setWallpaper: function(wallpaper) {
		this.changeData({ wallpaper: wallpaper });
	},

	getTheme: function() {
  		if((this.user.data !== null) && (this.user.data !== undefined) && (this.user.data.theme !== undefined))
  			return this.user.data.theme;
  		else
  			return "default";
	},

	setTheme: function(theme) {
		this.changeData({ theme: theme });
	},

	getCustomTheme: function() {
  		if((this.user.data !== null) && (this.user.data !== undefined) && (this.user.data.theme !== undefined))
  			return this.user.data.customTheme;
  		else
  			return undefined;
	},

	setCustomTheme: function(customTheme) {
		this.changeData({ customTheme: customTheme });
	},

	changeData: function(diff) {
		var data;
		if((this.user.data !== null) && (this.user.data !== undefined))
			data = this.user.data;
		else
			data = {};
		for(var key in diff)
			data[key] = diff[key];
		this.data = data;
		var request = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/user/'+this.id,
			content: JSON.stringify({ data: data })
		});
		request.send();
	},

	updateUser: function() {
		// this is not the best idea because we can loose some updates
		//  but with low perf network the update might never succeed if
		// we abort the previous request.
		if(this.userRequest !== undefined)
			return;	
		this.userRequest = new Core.HttpRequest({ url: '/cloud/user/'+this.id });
		this.connect(this.userRequest, 'done', this.onGetUserDone);
		this.connect(this.userRequest, 'error', this.onGetUserError);
		this.userRequest.send();
	},

	startUserMonitoring: function() {
		if(this.userSocket === undefined) {		
			this.userSocket = new Core.Socket({ service: '/cloud/user/'+this.id });
			this.connect(this.userSocket, 'message', this.onUserMessageReceived);
			this.connect(this.userSocket, 'open', this.onUserSocketOpen);
			this.connect(this.userSocket, 'error', this.onUserSocketError);
			this.connect(this.userSocket, 'close', this.onUserSocketClose);
		}
	},

	onUserSocketOpen: function() {
		this.userSocketAlive = true;
		// update the user is case thing has changed since our last
		// update before the user service WebSocket connection
		this.updateUser();
		if(this.watchedResource !== undefined)
			this.userSocket.send(JSON.stringify({ type: 'watch', resource: this.watchedResource.getId() }));
	},

	onUserSocketError: function() {
		this.userSocketAlive = false;
		this.userSocket.close();
	},

	onUserSocketClose: function() {
		this.userSocketAlive = false;
		this.disconnect(this.userSocket, 'open', this.onUserSocketOpen);
		this.disconnect(this.userSocket, 'message', this.onUserMessageReceived);
		this.disconnect(this.userSocket, 'error', this.onUserSocketError);
		this.disconnect(this.userSocket, 'close', this.onUserSocketClose);
		this.userSocket = undefined;
		this.userRetryTask = new Core.DelayedTask({
			delay: 5, scope: this,
			callback: this.startUserMonitoring
		});
	},

	onUserMessageReceived: function(socket, msg) {
		msg = JSON.parse(msg);
		if(msg.event === 'userchanged') {		
			// current user changed
			if(msg.user == this.getId()) {
				this.updateUser();
			}
			// a contact user changed
			else {
				if((this.watchedContact !== null) && (this.watchedContact !== undefined) &&
			   	   (this.watchedContact.getId() === msg.user))
			   		this.watchedContact.update();
			   	else {
					var contact = Wn.Contact.getContact(msg.user, true);
					if(contact !== undefined)
						contact.update();
				}
			}
		}
		else if(msg.event === 'resourcechanged') {
			if((this.watchedResource !== null) && (this.watchedResource !== undefined) &&
			   (this.watchedResource.getId() === msg.resource))
			   this.watchedResource.update();
			else {
				// a known ressource changed
				var resource = Wn.Resource.getResource(msg.resource, this, true);
				if(resource !== undefined)
					resource.update();
			}
		}
		else if(msg.event === 'userdisconnected') {
			// a known user has disconnected
			var contact = Wn.Contact.getContact(msg.user, true);
			if(contact !== undefined)
				contact.setIsOnline(false);
		}
		else if(msg.event === 'userconnected') {
			// a known user has connected
			var contact = Wn.Contact.getContact(msg.user, true);
			if(contact !== undefined)
				contact.setIsOnline(true);
		}
		else if(msg.event === 'messagereceived') {
			// we received a message
			this.onMessagesMessageReceived(msg.message);
		}
		else if (msg.event === 'messagechanged') {
			this.updateMessage(msg.message);
		}
		// unknown event, update everything
		else
			this.updateUser();
	},

	onGetUserError: function(request) {	
		if(request.getStatus() == 404)
			this.fireEvent('delete', this);
		this.userRequest = undefined;
	},

	onGetUserDone: function(request) {
		if(this.serverVersion === undefined)
			this.serverVersion = request.getResponseHeader('Server');
		else {
			if(this.serverVersion != request.getResponseHeader('Server')) {
				this.serverVersion = request.getResponseHeader('Server');
				this.fireEvent('serverchange', this);
			}
		}		
		var newUser = request.getResponseJSON();
		this.updateUserData(newUser);
		this.userRequest = undefined;
	},

	updateUserData: function(user) {
		// update resources
		var newResources = [];
		for(var i = 0; i < user.resources.length; i++) {
			var foundResource = undefined;
			for(var i2 = 0; (foundResource === undefined) && (i2 < this.resources.length); i2++) {
				if(this.resources[i2].getId() === user.resources[i].id)
					foundResource = this.resources[i2];
			}
			if(foundResource !== undefined)
				foundResource.updateData(user.resources[i]);
			else
				foundResource = new Wn.Resource({ resource: user.resources[i], user: this });
			newResources.push(foundResource);
		}
		this.resources = newResources;
		// update contacts
		var newContacts = [];
		for(var i = 0; i < user.contacts.length; i++) {
			var foundContact = undefined;
			for(var i2 = 0; (foundContact === undefined) && (i2 < this.contacts.length); i2++) {
				if(this.contacts[i2].getId() === user.contacts[i].id)
					foundContact = this.contacts[i2];
			}
			if(foundContact !== undefined)
				foundContact.updateData(user.contacts[i]);
			else
				foundContact = new Wn.Contact({ contact: user.contacts[i], user: this });
			newContacts.push(foundContact);
		}
		this.contacts = newContacts;
		// update user data
		this.user = user;
		// update the bookmarks
		this.bookmarks = [];
		for(var i = 0; i < user.bookmarks.length; i++)
			this.bookmarks.push(Wn.Resource.getResource(user.bookmarks[i].resource, this));
			
		if(this.isReady === false) {
			this.isReady = true;
			this.fireEvent('ready', this);
		}
		this.fireEvent('change', this);
	},

	///////////////////////////////////////////////////////
	/// Handle message
	///////////////////////////////////////////////////////

	sendMessage: function(destination, text, type) {
		if(type === undefined)
			type = 'message';
		if(Wn.Contact.hasInstance(destination))
			destination = destination.getId();
		var persist = (type === 'message');

		var request = new Core.HttpRequest({
			method: 'POST',	url: '/cloud/message',
			content: JSON.stringify({ content: text, type: type, origin: this.getId(), destination: destination })
		});
		if(type === 'message') {
			this.connect(request, 'done', function(request) {
				this.prependMessage(request.getResponseJSON());
			});
		}
		request.send();
		return request;
	},
	
	getMessages: function() {
		return this.messages;
	},

	updateMessages: function() {
		// this is not the best idea because we can loose some updates
		//  but with low perf network the update might never succeed if
		// we abort the previous request.
		if(this.messagesRequest !== undefined)
			return;
		this.messagesRequest = new Core.HttpRequest({ url: '/cloud/message?limit=50&user='+this.id });
		this.connect(this.messagesRequest, 'done', this.onGetMessagesDone);
		this.connect(this.messagesRequest, 'error', this.onGetMessagesError);
		this.messagesRequest.send();
	},

	updateMessage: function(message) {
		// search if we known this message
		var found = undefined;
		for(var i2 = 0; (found === undefined) && (i2 < this.messages.length); i2++) {
			if(message.id == this.messages[i2].getMessage().id)
				found = this.messages[i2];
		}
		if(found !== undefined) {
			found.updateData(message);
			this.fireEvent('messageschange', this);
		}
	},

	prependMessage: function(message) {
		// search if we already known this message
		var found = undefined;
		for(var i2 = 0; (found == undefined) && (i2 < this.messages.length); i2++) {
			if(message.id == this.messages[i2].getMessage().id)
				found = this.messages[i2];
		}
		if(found !== undefined)
			found.updateData(message);
		else
			this.messages.unshift(new Wn.Message({ message: message }));
		this.fireEvent('messageschange', this);
	},
	
	onMessagesMessageReceived: function(message) {
		if(message.type == 'order')
			this.fireEvent('order', this, message);
		else if(message.type == 'rfid')
			Ui.App.current.getRfidReader().fireEnter(message.content);
		else if((message.type == 'call') && (message.origin !== this.getId()))
			this.fireEvent('call', this, Wn.Contact.getContact(message.origin), message);
		else
			this.prependMessage(message);
	},

	onGetMessagesError: function(request) {
		this.messagesRequest = undefined;
	},

	onGetMessagesDone: function(request) {
		var newMessages = [];
		var messages = request.getResponseJSON();
		for(var i = 0; i < messages.length; i++) {
			var found = undefined;
			for(var i2 = 0; (found == undefined) && (i2 < this.messages.length); i2++) {
				if(messages[i].id == this.messages[i2].getMessage().id)
					found = this.messages[i2];
			}
			if(found === undefined)
				found = new Wn.Message({ message: messages[i] });
			else
				found.updateData(messages[i]);
			newMessages.push(found);
		}
		this.messages = newMessages;
		this.fireEvent('messageschange', this);
		this.messagesRequest = undefined;
	}
});

