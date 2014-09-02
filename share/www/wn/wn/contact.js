
Core.Object.extend('Wn.Contact', {
	id: undefined,
	data: undefined,
	ready: false,
	resourcesReady: false,
	request: undefined,
	resources: undefined,
	user: undefined,

	constructor: function(config) {
		this.addEvents('ready', 'error', 'change', 'delete', 'resourcechange');

		this.resources = [];
		this.user = config.user;
		delete(config.user);

		if('contact' in config) {
			this.data = config.contact;
			delete(config.contact);
			this.id = this.data.id;
			this.updateData(this.data);
		}
		else if('id' in config) {
			this.id = config.id;
			delete(config.id);
			this.update();
		}
		if(this.id === undefined)
			throw('Wn.Contact id not set');
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
		return this.ready;
	},

	getIsMonitored: function() {
		return(Ui.App.current.getUser().getContact(this.id) === this);
	},

	setIsOnline: function(isOnline) {
		this.data.online = isOnline;
		this.fireEvent('change', this);
	},

	getIsOnline: function() {
		return this.data.online;
	},

	getIsResourcesLoaded: function() {
		return this.resourcesReady;
	},

	getFirstname: function() {
		return this.data.firstname;
	},

	getLastname: function() {
		return this.data.lastname;
	},

	update: function() {
		// this is not the best idea because we can loose some updates
		//  but with low perf network the update might never succeed if
		// we abort the previous request.
		if(this.request !== undefined)
			return;
		this.request = new Core.HttpRequest({ url: '/cloud/user/'+this.id+'?seenBy='+this.user.getId() });
		this.connect(this.request, 'done', this.onGetDataDone);
		this.connect(this.request, 'error', this.onGetDataError);
		this.request.send();
	},

	updateData: function(data) {
		// update if resources are known
		if(data.resources !== undefined) {
			this.resourcesReady = true;
			var newResources = [];
			for(var i = 0; i < this.resources.length; i++)
				delete(this.resources[i].wnContactSeen);

			for(var i = 0; i < data.resources.length; i++) {
				var foundResource = undefined;
				for(var i2 = 0; (foundResource === undefined) && (i2 < this.resources.length); i2++) {
					if(this.resources[i2].getId() === data.resources[i].id)
						foundResource = this.resources[i2];
				}
				if(foundResource !== undefined)
					foundResource.updateData(data.resources[i]);
				else {
					foundResource = new Wn.Resource({ resource: data.resources[i], user: this.user });
					this.connect(foundResource, 'change', this.onResourceChange);
				}
				foundResource.wnContactSeen = true;
				newResources.push(foundResource);
			}
			for(var i = 0; i < this.resources.length; i++) {
				if(this.resources[i].wnContactSeen !== true) {
					this.disconnect(this.resources[i], 'change', this.onResourceChange);
				}
			}
			this.resources = newResources;
		}

		this.data = data;
		if(!this.ready) {
			this.ready = true;
			this.fireEvent('ready', this);
		}
		this.fireEvent('change', this);
	},

	getId: function() {
		return this.id;
	},

	getData: function() {
		return this.data;
	},

	getFaceUrl: function() {
		if((this.data !== undefined) && (this.data.face_rev !== undefined))
			return '/cloud/user/'+this.id+'/face?rev='+this.data.face_rev;
		else
			return '/cloud/user/'+this.id+'/face';
	},

	getPosition: function() {
		return this.data.position;
	},

	getResources: function() {
		return this.resources;
	},

	getResource: function(id) {
		for(var i = 0; i < this.resources.length; i++)
			if(this.resources[i].getId() === id)
				return this.resources[i];
		return undefined;
	},
	
	onGetDataError: function(request) {
		if(request.getStatus() == 404)
			this.fireEvent('delete', this);
		else
			this.fireEvent('error', this);
		this.request = undefined;
	},

	onGetDataDone: function(request) {
		var data = request.getResponseJSON();
		this.updateData(data);
		this.request = undefined;
	},
	
	onResourceChange: function(resource) {
		this.fireEvent('resourcechange', this, resource);
	}

}, {}, {
	getContact: function(id, nonew) {
		var contact = Ui.App.current.getUser().getContact(id);
		if((contact === undefined) && !nonew)
			contact = new Wn.Contact({ id: id, user: Ui.App.current.getUser() });
		return contact;
	}
});

