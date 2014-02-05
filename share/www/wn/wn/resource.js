
Core.Object.extend('Wn.Resource', {
	id: undefined,
	ready: false,
	data: undefined,
	deleted: false,
	request: undefined,
	user: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'change', 'delete', 'error');

		this.user = config.user;
		delete(config.user);
		
		if('resource' in config) {
			this.id = config.resource.id;
			this.updateData(config.resource);
			delete(config.resource);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.data = {};
			this.update();
		}
	},
		
	getIsReady: function() {
		return this.ready;
	},

	getIsDeleted: function() {
		return this.deleted;
	},

	getIsMonitored: function() {
		if(!('owner_id' in this.data))
			return false;
		var contact = Ui.App.current.getUser().getContact(this.data.owner_id);
		if(contact === undefined)
			return false;
		return(contact.getResource(this.id) === this);
	},

	getId: function() {
		return this.id;
	},

	getType: function() {
		return this.data.type;
	},

	getOwnerId: function() {
		return this.data.owner_id;
	},
	
	getStorageId: function() {
		return this.data.storage_id;
	},

	getRights: function() {
		return this.data.rights;
	},

	getRev: function() {
		return this.data.rev;
	},
	
	getSeenByMeRev: function() {
		return this.data.seenByMeRev;
	},

	addRights: function(rights) {	
		var request = new Core.HttpRequest({ method: 'POST',
			url: '/cloud/resource/'+this.id+'/rights',
			content: JSON.stringify(rights)
		});
		request.send();
	},

	getPublicRights: function() {
		return { read: this.data.public_read, write: this.data.public_write, share: this.data.public_share };
	},

	addPublicRights: function(rights) {
		var publicRights = { public_read: rights.read, public_write: rights.write, public_share: rights.share };
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.id,
			content: JSON.stringify(publicRights)
		});
		request.send();
	},

	changeData: function(diff) {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/resource/'+this.id,
			content: JSON.stringify(diff)
		});
		this.connect(request, 'done', this.onChangeDataDone);
		request.send();
	},

	markSeenByMe: function() {
		if(this.data.rev != this.data.seenByMeRev) {
			var request = new Core.HttpRequest({ method: 'PUT',
				url: '/cloud/resource/'+this.id+'?seenBy='+this.user.getId(),
				content: JSON.stringify({ seenByMeRev: this.data.rev })
			});
			this.connect(request, 'done', this.onMarkSeenByMeDone);
			request.send();
		}
	},
	
	onMarkSeenByMeDone: function(req) {
		this.updateData(req.getResponseJSON());
	},
	
	onChangeDataDone: function(req) {
		this.updateData(req.getResponseJSON());
	},

	canShare: function() {
		var userId = this.user.getId();
		if(this.data.public_share || (this.data.owner_id == userId))
			return true;
		for(var i = 0; i < this.data.rights.length; i++) {
			var right = this.data.rights[i];
			if(right.user_id == userId)
				return right.share;
		}
		return false;
	},

	canWrite: function() {
		var userId = this.user.getId();
		if(this.data.public_write || (this.data.owner_id == userId))
			return true;
		for(var i = 0; i < this.data.rights.length; i++) {
			var right = this.data.rights[i];
			if(right.user_id == userId)
				return right.write;
		}
		return false;
	},

	getData: function() {
		return this.data;
	},
	
	getName: function() {
		return this.data.name;
	},

	getBookmark: function() {
		for(var i = 0; i < this.user.getBookmarks().length; i++) {
			if(this.user.getBookmarks()[i].getId() == this.getId())
				return true;
		}
		return false;
	},

	deleteResource: function() {
		var request = new Core.HttpRequest({ method: 'DELETE',
			url: '/cloud/resource/'+this.id
		});
		this.connect(request, 'done', function() {
			this.fireEvent('delete', this);
		});
		request.send();
	},

	update: function() {
		// this is not the best idea because we can loose some updates
		//  but with low perf network the update might never succeed if
		// we abort the previous request.
		if(this.request !== undefined)
			return;	
		this.request = new Core.HttpRequest({ url: '/cloud/resource/'+this.id+'?seenBy='+this.user.getId() });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		if((this.data === undefined) || (JSON.stringify(this.data) != JSON.stringify(data))) {
			this.data = data;
			if(!this.ready) {
				this.ready = true;
				this.fireEvent('ready', this);
			}
			this.fireEvent('change', this);
		}
	},

	onGetDataError: function(request) {
		this.ready = true;
		// if resource not found or insufficient rights
		if((request.getStatus() == 404) || (request.getStatus() == 403)) {
			this.fireEvent('delete', this);
			this.deleted = true;
			// auto remove the bookmark if the access is no more possible
			if(this.getBookmark())
				this.user.unbookmarkResource(this);
		}
		else
			this.fireEvent('error', this);
		this.request = undefined;
	},

	onGetDataDone: function(request) {
		var data = request.getResponseJSON();
		this.updateData(data);
		this.request = undefined;
	}

}, {}, {
	getResource: function(id, user, nonew) {
		var resource = undefined;
		if(user === undefined)
			user = Ui.App.current.getUser();
		// search in the current user resource
		resource = user.getResource(id);
		// search in the current user contacts resources
		if(resource === undefined) {
			for(var i = 0; (resource === undefined) && (i < user.getContacts().length); i++)
				resource = user.getContacts()[i].getResource(id);
		}
		// load from the server
		if((resource === undefined) && !nonew)
			resource = new Wn.Resource({ id: id, user: user });
		return resource;
	}
});

