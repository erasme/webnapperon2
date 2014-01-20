
Ui.Html.extend('Wn.ImproveText', {
	text: '',

	constructor: function() {
		this.connect(this, 'link', this.onLink);
	},
	
	generateHtml: function(text) {
		// convert into HTML
		var div = document.createElement('div');
		if('textContent' in div)
			div.textContent = text;
		else
			div.innerText = text;
		text = div.innerHTML;
		// get the HTML color def
		var color;
		if(navigator.supportRgba)
			color = this.getStyleProperty('color').getCssRgba();
		else
			color = this.getStyleProperty('color').getCssHtml();
		var linkColor;
		if(navigator.supportRgba)
			linkColor = this.getStyleProperty('linkColor').getCssRgba();
		else
			linkColor = this.getStyleProperty('linkColor').getCssHtml();

		// replace http:// and https:// with A link
		var content = '';
		while((text.indexOf('http://') != -1) || (text.indexOf('https://') != -1)) {
			var pos = text.indexOf('http://');
			if(pos == -1)
				pos = text.indexOf('https://');
			else if((text.indexOf('https://') != -1) && (text.indexOf('https://') < pos))
				pos = text.indexOf('https://');
			var end = pos;
			for(end = pos; (end < text.length) && (text.charAt(end) != ' ') && (text.charAt(end) != '\t')  && (text.charAt(end) != '\n') && (text.charAt(end) != '"') && (text.charAt(end) != '\'') && (text.charAt(end) != '&'); end++) {}
			var url = text.substr(pos, end-pos);
			content += text.substr(0, pos);
			content += '<a href="'+url+'" style="cursor: pointer; text-decoration: underline; color: '+linkColor+'">'+url+'</a>';
			text = text.substr(end);
		}
		content += text;
		// interpret \n as <br>
		content = content.replace(new RegExp('\n','g'), '<br>');

		var html = '<div style="word-wrap: break-word; font-family: '+this.getStyleProperty('fontFamily')+';font-size: '+this.getStyleProperty('fontSize')+'px;font-weight: '+this.getStyleProperty('fontWeight')+';color: '+color+';">';
		html += content;
		html += '</div>';
		return html;
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
	getText: function() {
		return this.text;
	},

	setText: function(text) {
		this.text = text;
		this.setHtml(this.generateHtml(this.text));
		this.invalidateMeasure();
	},
	
	onStyleChange: function() {		
		this.setText(this.text);
	}
}, {
	style: {
		color: new Ui.Color({ r: 0, g: 0, b: 0 }),
		fontSize: 18,
		fontFamily: 'Sans-serif',
		fontWeight: 'normal',
		linkColor: new Ui.Color({ r: 0.3, g: 0.3, b: 0.3 })
	}
});
