
Wn.ResourceView.extend('Storage.Preview', {
	storage: undefined,
	progressBar: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('files');
		this.storage = this.getResource().getStorageId();
		if(this.getResource().getPreviewImageUrl() !== undefined)
			this.getGraphic().setPreviewImage(this.getResource().getPreviewImageUrl());
		else {
			var request = new Core.HttpRequest({ url: '/cloud/storage/'+this.storage+'/0?depth=1' });
			this.connect(request, 'done', this.onInfoFileDone);
			request.send();
		}

		if(this.getResource().canWrite()) {
			this.getDropBox().addMimetype('files');
			this.connect(this.getDropBox(), 'dropfile', this.onUploadFile);

			this.progressBar = new Ui.ProgressBar({ verticalAlign: 'bottom', margin: 5 });
			this.progressBar.setStyleProperty('color', 'white');
			this.progressBar.hide();
			this.getIconBox().append(this.progressBar);

			this.connect(this.resource, 'uploadstart', function() {
				this.progressBar.setValue(0);
				this.progressBar.show();
			});
			this.connect(this.resource, 'uploadprogress', function(resource, progress) {
				this.progressBar.setValue(progress);
			});
			this.connect(this.resource, 'uploadcomplete', function() {
				this.progressBar.hide();
			});
		}
	},

	onUploadFile: function(element, file) {
		var uploader = new Wn.FilePostUploader({ file: file, service: '/cloud/storage/'+this.storage+'/0', resource: this.getResource() });
		uploader.setField('define', JSON.stringify({ position: 0 }));
		uploader.hostStorage = this.storage;
		// register the uploader in the App
		Ui.App.current.addUploader(uploader);
		uploader.send();
	},

	onInfoFileDone: function(req) {
		var res = req.getResponseJSON();
		if(('children' in res) && (res.children.length > 0)) {
			var child = res.children[0];
			this.getGraphic().setPreviewImage('/cloud/previewhigh/'+this.storage+'/'+child.id+'?rev='+child.rev);
		}
	}
}, {
	onResourceChange: function() {
		Storage.Preview.base.onResourceChange.apply(this, arguments);
		if((this.getResource().getPreviewImageUrl() !== undefined) && 
		   (this.getResource().getPreviewImageUrl() !== this.getGraphic().getPreviewImage()))
			this.getGraphic().setPreviewImage(this.getResource().getPreviewImageUrl());
	}
}, {
	constructor: function() {
		this.register('storage', this);
	}
});

