
Wn.ResourceView.extend('Storage.Preview', {
	storage: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('files');		
		this.storage = this.getResource().getStorageId();
		var request = new Core.HttpRequest({ url: '/cloud/storage/'+this.storage+'/0?depth=1' });
		this.connect(request, 'done', this.onInfoFileDone);
		request.send();
	},

	onInfoFileDone: function(req) {
		var res = req.getResponseJSON();
		if(('children' in res) && (res.children.length > 0)) {
			var child = res.children[0];
			this.getGraphic().setPreviewImage('/cloud/previewhigh/'+this.storage+'/'+child.id+'?rev='+child.rev);
		}
	}
}, {}, {
	constructor: function() {
		this.register('storage', this);
	}
});

