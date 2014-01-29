
Ui.CanvasElement.extend('TextEditor.PageBackgroundGraphic', {}, {
	updateCanvas: function(ctx) {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		// shadow
		ctx.roundRectFilledShadow(5, 5, width-10, height-10, 2, 2, 2, 2, false, 2, new Ui.Color({ r:0, g: 0, b: 0, a: 0.5}));
		// white bg
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(7, 7, width-14, height-14);
	}
});


Ui.App.extend('TextEditor.App', {
	storage: undefined,
	file: undefined,
	textField: undefined,
	updateRequest: undefined,
	saveRequest: undefined,
	boldButton: undefined,
	italicButton: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox();
		this.setContent(vbox);

		var toolbar = new Ui.ToolBar();
		vbox.append(toolbar);

		var button = new Ui.Button({ text: 'Enregistrer & Fermer' });
		this.connect(button, 'press', this.onSaveQuitPress);
		toolbar.append(button);

//		this.boldButton = new Ui.Button({ text: 'B' });
//		toolbar.append(this.boldButton);

//		this.italicButton = new Ui.Button({ text: 'I' });
//		toolbar.append(this.italicButton);

		var scroll = new Ui.ScrollingArea({ showScrollbar: false, scrollHorizontal: false, overScroll: true });
		vbox.append(scroll, true);

		var lbox = new Ui.LBox();
		lbox.append(new TextEditor.PageBackgroundGraphic());
		scroll.setContent(lbox);

		if(navigator.isIE7 || navigator.isIE8)
			this.textField = new Ui.TextArea({ margin: 30 });
		else
			this.textField = new Ui.ContentEditable({ margin: 30 });
		lbox.append(this.textField);

		this.storage = this.getArguments()['storage'];
		this.file = this.getArguments()['file'];

		this.updateText();
	},

	updateText: function() {
		if(this.updateRequest != undefined)
			return;
		this.updateRequest = new Core.HttpRequest({ url: '/cloud/storage/'+this.storage+'/'+this.file+'/content'});
		this.connect(this.updateRequest, 'done', this.onUpdateTextDone);
		this.connect(this.updateRequest, 'error', this.onUpdateTextError);
		this.updateRequest.send();
	},

	onUpdateTextDone: function() {
		var text = this.updateRequest.getResponseText();
		// without a line Chrome will not display the text cursor
		if(text === '')
			text = '\n';		
		if(navigator.isIE7 || navigator.isIE8)
			this.textField.setValue(text);
		else {
			// convert text to HTML
			var div = document.createElement('div');
			if('innerText' in div)
				div.innerText = text;
			else
				div.textContent = text;
			// interpret \n as <br>
			var content = div.innerHTML;
			content = content.replace(new RegExp('\n','g'), '<br>');
			this.textField.setHtml(content);
		}
		this.updateRequest = undefined;
	},

	onUpdateTextError: function() {
		this.updateRequest = undefined;
	},

	onSaveQuitPress: function() {
		var text;
		if(navigator.isIE7 || navigator.isIE8)
			text = this.textField.getValue();
		else
			text = this.textField.getText();

		var boundary = '----';
		var characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		for(var i = 0; i < 16; i++)
			boundary += characters[Math.floor(Math.random()*characters.length)];
		boundary += '----';

		this.saveRequest = new Core.HttpRequest({
			method: 'PUT',
			url: '/cloud/storage/'+this.storage+'/'+this.file
		});

		this.saveRequest.setRequestHeader("Content-Type", "multipart/form-data; boundary="+boundary);
		this.saveRequest.setContent(
			'--'+boundary+'\r\n'+
			'Content-Disposition: form-data; name="file"; filename="noname"\r\n'+
			'Content-Type: text/plain; charset=UTF-8\r\n\r\n'+
			text+'\r\n'+
			'--'+boundary+'--\r\n'
		);
		this.connect(this.saveRequest, 'done', this.onSaveTextDone);
		this.connect(this.saveRequest, 'error', this.onSaveTextError);
		this.saveRequest.send();
	},

	onSaveTextDone: function() {
		window.close();
	},

	onSaveTextError: function() {
		window.close();
	}
});

var app = new TextEditor.App({
webApp: false,
style: {
	"Ui.Element": {
		fontFamily: "Ubuntu,Sans-Serif",
		fontWeight: 100,
		fontSize: 16
	},
	"Ui.Text": {	
		interLine: 1.4
	},
	"Ui.Separator": {
		color: '#999999'
	},
	"Ui.CheckBox": {
		checkColor: '#222222'
	},
	"Ui.ScrollingArea": {
		color: '#999999',
		showScrollbar: false,
		overScroll: true,
		radius: 0
	},
	"Ui.Button": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		iconSize: 30,
		spacing: 6
	},
	"Ui.Slider": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 })
	},
	"Ui.ToggleButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		toggleColor: '#dc6c36',
		iconSize: 30,
		spacing: 6,
		fontWeight: 700
	},
	"Ui.DownloadButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		iconSize: 30,
		spacing: 6,
		fontWeight: 700
	},
	"Ui.TextButtonField": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		spacing: 5,
		"Ui.Button": {
			color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
			spacing: 5
		}
	},
	"Ui.UploadButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		iconSize: 30,
		spacing: 6
	},
	"Ui.LinkButton": {
		color: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8 }),
		iconSize: 30,
		spacing: 6
	},
	"Ui.ContentEditable": {
		fontSize: 20
	}
}});
app.requireFont('Ubuntu', '100');
app.requireFont('Ubuntu', '400');
app.requireFont('Ubuntu', '700');
