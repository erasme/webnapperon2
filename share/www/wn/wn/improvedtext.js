
Ui.Html.extend('Wn.ImprovedText', {

	constructor: function() {
		this.getDrawing().style.wordWrap = 'break-word';
		this.connect(this, 'link', this.onLink);
	},

	convertTextLinkToHtml: function() {
		var text = this.getHtml();
		var linkColor;
		if(navigator.supportRgba)
			linkColor = Ui.Color.create(this.getStyleProperty('linkColor')).getCssRgba();
		else
			linkColor = Ui.Color.create(this.getStyleProperty('linkColor')).getCssHtml();
		
		// replace http:// and https:// with A link
		var content = '';
		while((text.indexOf('http://') != -1) || (text.indexOf('https://') != -1)) {
			var pos = text.indexOf('http://');
			if(pos == -1)
				pos = text.indexOf('https://');
			else if((text.indexOf('https://') != -1) && (text.indexOf('https://') < pos))
				pos = text.indexOf('https://');
			var end = pos;
			for(end = pos; (end < text.length) && (text.charAt(end) !== ' ') && 
				(text.charAt(end) !== '\t')  && (text.charAt(end) !== '\n') &&
				(text.charAt(end) !== '"') && (text.charAt(end) !== '\'') &&
				(text.charAt(end) !== '&') && (text.charAt(end) !== '<'); end++) {}
			var url = text.substr(pos, end-pos);
			content += text.substr(0, pos);
			content += '<a href="'+url+'" style="cursor: pointer; text-decoration: underline; color: '+linkColor+'">'+url+'</a>';
			text = text.substr(end);
		}
		content += text;
		this.setHtml(content);
	},
	
	onLink: function(element, url) {
		// get URL
		var cleanUrl = url;
		var pos = cleanUrl.lastIndexOf('#');
		if(pos != -1)
			cleanUrl = cleanUrl.substring(0, pos);

		// get our own URL
		var selfUrl = (new Core.Uri()).toString();
		var pos = selfUrl.lastIndexOf('#');
		if(pos != -1)
			selfUrl = selfUrl.substring(0, pos);
		
		// test if is an internal link (only locator change)
		if(cleanUrl == selfUrl) {
			var pos = url.lastIndexOf('#');
			var path;
			// not null internal link
			if(pos != -1) {
				path = url.substr(pos+1);
				Ui.App.current.setMainPath(path);
			}
		}
		else {
			// external link
			window.open(url, '_blank');
		}
	}
}, {
	setText: function(text) {
		Wn.ImprovedText.base.setText.apply(this, arguments);
		this.convertTextLinkToHtml();
	},
	
	onStyleChange: function() {
		Wn.ImprovedText.base.onStyleChange.apply(this, arguments);
		// update link color
		var linkColor;
		if(navigator.supportRgba)
			linkColor = Ui.Color.create(this.getStyleProperty('linkColor')).getCssRgba();
		else
			linkColor = Ui.Color.create(this.getStyleProperty('linkColor')).getCssHtml();
		var links = this.getElements('A');
		for(var i = 0; i < links.length; i++)
			links[i].style.color = linkColor;
	}
}, {
	style: {
		linkColor: new Ui.Color({ r: 0.3, g: 0.3, b: 0.3 })
	}
});
