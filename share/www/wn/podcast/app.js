
Storage.BaseViewer.extend('Podcast.Viewer', {
	loadText: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		this.loadText = new Ui.Text({ text: 'Chargement en cours... Veuillez patienter', textAlign: 'center' });
		vbox.append(this.loadText);
		this.setContent(vbox);
	}
}, {
	canAddFile: function() {
		return false;
	},
	
	canDeleteFile: function() {
		return false;
	},

	onResourceChange: function() {
		Podcast.Viewer.base.onResourceChange.apply(this, arguments);

		if(this.getStorage() === undefined) {
			var json = this.getResource().getData();
			if((json.utime == 0) && (json.failcount == 0))
				this.loadText.setText('Synchronisation Podcast en cours... Veuillez patienter');
			else if((json.utime == 0) && (json.failcount > 0))
				this.setContent(new Ui.Text({ text: 'Echec de la synchronisation du Podcast (nombre d\'échec: '+json.failcount+'). Il y a sûrement un problème sur cet album.', textAlign: 'center', verticalAlign: 'center' }));
			else if((json.utime > 0) && (json.failcount > 0) && (json.delta > 60*60*24*7))
				this.setContent(new Ui.Text({ text: 'Echec de la synchronisation du Podcast depuis une semaine. L\'album a peut être été supprimé...', textAlign: 'center', verticalAlign: 'center' }));
			else		
				this.setStorage(this.getResource().getStorageId());
		}
	},

	onLoad: function() {
		Podcast.Viewer.base.onLoad.call(this);
		if(this.resource.getIsReady())
			this.onResourceChange();
	}
}, {
	constructor: function() {
		Wn.ResourceViewer.register('podcast', this);
	}
});
