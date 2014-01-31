
Wn.ResourceCreator.extend('News.Creator', {

	constructor: function(config) {
		Ui.App.current.getUser().createResource({
			type: 'news',
			name: this.getData().name,
			url: this.getData().url,
			fullcontent: this.getData().fullcontent
		});
		this.done();
	}
});


