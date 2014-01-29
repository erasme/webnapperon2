
Storage.BaseViewer.extend('Picasa.Viewer', {
	loadText: undefined,
	infoTask: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		this.loadText = new Ui.Text({ text: 'Chargement en cours... Veuillez patienter', textAlign: 'center' });
		vbox.append(this.loadText);
		this.setContent(vbox);
	},
	
	onInfoTask: function() {
		this.resource.update();
		this.infoTask = undefined;
	}
}, {
	canAddFile: function() {
		return false;
	},
	
	canDeleteFile: function() {
		return false;
	},

	onResourceChange: function() {
		Picasa.Viewer.base.onResourceChange.apply(this, arguments);

		if(this.getStorage() === undefined) {
			var json = this.getResource().getData();
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
		}
	},

	onLoad: function() {
		Picasa.Viewer.base.onLoad.call(this);
		if(this.resource.getIsReady())
			this.onResourceChange();
	},
	
	onUnload: function() {
		Picasa.Viewer.base.onUnload.call(this);
		if(this.infoTask !== undefined) {
			this.infoTask.abort();
			this.infoTask = undefined;
		}
	}
}, {
	constructor: function() {
		Wn.ResourceViewer.register('picasa', this);
	}
});

//var album = "http://picasaweb.google.com/data/feed/base/user/105594821032709413419/albumid/5699360355504575473?alt=rss&kind=photo&hl=fr";
//var album = "http://picasaweb.google.com/data/feed/base/user/113923431266629338678/albumid/5698580895432528161?alt=rss&kind=photo&authkey=Gv1sRgCJ-J9MjRku7R5QE&hl=fr";
//var album = 'http://daniel.erasme.lan:4444/testclient/applications/picasa/picasa.rss';


