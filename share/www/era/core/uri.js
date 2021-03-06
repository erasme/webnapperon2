Core.Object.extend('Core.Uri', 
/**@lends Core.Uri#*/
{
	scheme: undefined,
	user: undefined,
	password: undefined,
	host: undefined,
	port: undefined,
	path: undefined,
	query: undefined,
	fragment: undefined,

	/**
	*	@constructs
	*	@class
	*	@extends Core.Object
	*/
	constructor: function(config) {
		var fullpath = true;
		var baseURI;
		if('baseURI' in document)
			baseURI = document.baseURI;
		else
			baseURI = document.location.href;
		var uri;
		if('uri' in config) {
			uri = config.uri;
			delete(config.uri);
		}
		else
			uri = baseURI;
		var res = uri.match(/^([^:\/]+):\/\/([^\/]+)(\/.*)$/);
		if(res === null) {
			fullpath = false;
			res = baseURI.match(/^([^:\/]+):\/\/([^\/]+)(\/.*)$/);
		}
		this.scheme = res[1];
		var authority = res[2];
		var path = res[3];
		res = authority.match(/^(.+):(.+)@(.*)$/);
		if(res !== null) {
			this.user = res[1];
			this.password = res[2];
			authority = res[3];
		}
		res = authority.match(/^(.+):(.+)$/);
		if(res !== null) {
			authority = res[1];
			this.port = res[2];
		}
		else {
			if(this.scheme == 'https')
				this.port = 443;
			else
				this.port = 80;
		}
		this.host = authority;
		if(fullpath)
			this.path = path;
		else {
			if(uri.indexOf('/') === 0)
				this.path = Core.Uri.cleanPath(uri);
			else
				this.path = Core.Uri.mergePath(path, uri);
		}
		// TODO: handle query and fragment
	},

	getScheme: function() {
		return this.scheme;
	},

	getUser: function() {
		return this.user;
	},
	
	getPassword: function() {
		return this.password;
	},

	getHost: function() {
		return this.host;
	},

	getPort: function() {
		return this.port;
	},

	getPath: function() {
		return this.path;
	},

	getQuery: function() {
		return this.query;
	},

	getFragment: function() {
		return this.fragment;
	}
}, 
/**@lends Core.Uri#*/
{
	toString: function() {
		var str = this.scheme+'://';
		if((this.user !== undefined) && (this.password !== undefined))
			str += this.user+':'+this.password+'@';
		str += this.host;
		if(this.port !== undefined)
			str += ':'+this.port;
		str += this.path;
		return str;
	}
}, 
/**@lends Core.Uri*/
{
	cleanPath: function(path) {
		while(path.match(/\/([^\/]*)\/\.\.\//))
			path = path.replace(/\/([^\/]*)\/\.\.\//, '/');
		while(path.match(/\/\//, '/'))
			path = path.replace(/\/\//, '/');
		while(path.match(/\/\.\//))
			path = path.replace(/\/\.\//, '/');
		return path;
	},

	mergePath: function(base, relative) {
		var dir = base.match(/^(.*)\//)[0];
		dir += relative;
		return Core.Uri.cleanPath(dir);
	}
});

