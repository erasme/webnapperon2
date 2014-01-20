
Storage.BaseViewer.extend('Picasa.Viewer', {
	loadText: undefined,
	infoRequest: undefined,
	infoTask: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		this.loadText = new Ui.Text({ text: 'Chargement en cours... Veuillez patienter', textAlign: 'center' });
		vbox.append(this.loadText);
		this.setContent(vbox);
		
		this.connect(this, 'load', this.onViewerLoad);
		this.connect(this, 'unload', this.onViewerUnload);
		
		if(this.getIsLoaded())
			this.onViewerLoad();
	},
	
	onViewerLoad: function() {
		if(this.infoRequest !== undefined)
			return;
		if(this.getStorage() === undefined) {
			this.infoRequest = new Core.HttpRequest({ url: '/cloud/picasa/'+this.getResource().getData() });
			this.connect(this.infoRequest, 'done', this.onGetPicasaDone);
			this.connect(this.infoRequest, 'error', this.onGetPicasaError);
			this.infoRequest.send();
		}
	},
	
	onViewerUnload: function() {
		if(this.infoTask !== undefined) {
			this.infoTask.abort();
			this.infoTask = undefined;
		}
	},
	
	onInfoTask: function() {
		this.onViewerLoad();
		this.infoTask = undefined;
	},
	
	onGetPicasaDone: function() {
		var json = this.infoRequest.getResponseJSON();
		this.infoRequest = undefined;
		if((json.utime == 0) && (json.failcount == 0)) {
			this.loadText.setText('Synchronisation Picasa en cours... Veuillez patienter');
			if(this.getIsLoaded())
				this.infoTask = new Core.DelayedTask({ delay: 2, callback: this.onInfoTask, scope: this });
		}
		else if((json.utime == 0) && (json.failcount > 0))
			this.setContent(new Ui.Text({ text: 'Echec de la synchronisation Picasa (nombre d\'échec: '+json.failcount+'). Il y a sûrement un problème sur cet album.', textAlign: 'center', verticalAlign: 'center' }));
		else if((json.utime > 0) && (json.failcount > 0) && (json.delta > 60*60*24*7))
			this.setContent(new Ui.Text({ text: 'Echec de la synchronisation Picasa depuis une semaine. L\'album a peut être été supprimé...', textAlign: 'center', verticalAlign: 'center' }));
		else		
			this.setStorage(json.storage);
	},
	
	onGetPicasaError: function() {
		this.setContent(new Ui.Text({ text: 'Impossible de récupérer l\'album. Il n\'est peut être plus accessible.', textAlign: 'center', verticalAlign: 'center' }));
		this.infoRequest = undefined;
	}
}, {
	canAddFile: function() {
		return false;
	},
	
	canDeleteFile: function() {
		return false;
	}
}, {
	constructor: function() {
		Wn.ResourceViewer.register('picasa', this);
	}
});

//var album = "http://picasaweb.google.com/data/feed/base/user/105594821032709413419/albumid/5699360355504575473?alt=rss&kind=photo&hl=fr";
//var album = "http://picasaweb.google.com/data/feed/base/user/113923431266629338678/albumid/5698580895432528161?alt=rss&kind=photo&authkey=Gv1sRgCJ-J9MjRku7R5QE&hl=fr";
//var album = 'http://daniel.erasme.lan:4444/testclient/applications/picasa/picasa.rss';


