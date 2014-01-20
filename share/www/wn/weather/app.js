Wn.ResourceViewer.extend('Meteo.App', {
	request: undefined,
	text: undefined,

	constructor: function(config) {
		this.text = new Ui.Text();
		this.setContent(this.text);
		this.request = new Core.HttpRequest({ url: '/cloud/proxy?session='+this.getUser().getUser().getSession().getSessionId()+'&url='+encodeURIComponent('http://www.google.com/ig/api?weather='+encodeURIComponent(this.getSrc().value)+'&hl=fr') });
		this.connect(this.request, 'done', this.onGetMeteoDone);
		this.connect(this.request, 'error', this.onGeMeteoError);
		this.request.send();
	},

	onGetMeteoDone: function(request) {
		console.log('onGetMeteoDone');
		var text = request.getResponseText();
		console.log(text);

		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(text, "text/xml");
		
		var desc = 
			xmlDoc.querySelector('current_conditions>condition').getAttribute('data')+'\n'+
			'Temp: '+xmlDoc.querySelector('current_conditions>temp_c').getAttribute('data')+'\n'+
			'Humidité: '+xmlDoc.querySelector('current_conditions>humidity').getAttribute('data')+'\n'+
			'Vent: '+xmlDoc.querySelector('current_conditions>wind_condition').getAttribute('data')+'\n';

		this.text.setText(desc);

	},

	onGetMeteoError: function(request, status) {
		console.log('onGetMeteoError');
	}
}, {}, {
	constructor: function() {
		this.register('meteo', this);
	}
});

