/*
Ui.LBox.extend('News.PreviewItem', {
	item: undefined,

	constructor: function(config) {
		this.item = config.item;
		delete(config.item);

		hbox = new Ui.HBox({ spacing: 10 });
		this.setContent(hbox);

		var imageUrl = undefined;
		if(this.item.querySelector('enclosure') != undefined)
			imageUrl = this.item.querySelector('enclosure').getAttribute('url');
		if((imageUrl === undefined) && (this.item.querySelector('content') != undefined))
			imageUrl = this.item.querySelector('content').getAttribute('url');

		if(imageUrl != undefined) {
			var image = new Wn.CroppedImage({ width: 50, height: 190, src: imageUrl });
			hbox.append(image);
		}
		hbox.append(new Ui.CompactLabel({ maxLine: 12, width: 130, text: this.item.querySelector('title').textContent, fontWeight: 'bold', fontSize: 15 }));
	}
});*/

Wn.ResourceView.extend('News.Preview', {
	request: undefined,

	constructor: function(config) {
		this.getGraphic().setIcon('newspaper');
		var news = this.getResource().getData();
		// ask news to update its content
		var request = new Core.HttpRequest({ url: '/cloud/news/'+news+'/update' });
		request.send();
//		this.request = new Core.HttpRequest({ url: '/cloud/proxy?url='+encodeURIComponent(this.getResource().getData()) });
//		this.connect(this.request, 'done', this.onGetNewsDone);
//		this.connect(this.request, 'error', this.onGetNewsError);
//		this.request.send();
	}/*,

	onGetNewsDone: function(request) {
		var rss = request.getResponseText();
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(rss, "text/xml");
		var items = xmlDoc.querySelectorAll('item');
		if(items.length > 0)
			this.setContent(new News.PreviewItem({ item: items[0] }));
	},

	onGetNewsError: function(request) {
	}*/

}, {}, {
	constructor: function() {
		this.register('news', this);
	}
});

