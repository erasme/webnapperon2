

Ui.Dialog.extend('Storage.TextEditor', {
	storage: undefined,
	file: undefined,
	textField: undefined,
	updateRequest: undefined,
	saveRequest: undefined,

	constructor: function(config) {
		this.storage = config.storage;
		delete(config.storage);

		this.file = config.file;
		delete(config.file);

		this.setTitle('Edition de texte');
		this.setFullScrolling(true);
		this.setPreferredWidth(600);
		this.setPreferredHeight(600);

		this.setCancelButton(new Ui.DialogCloseButton());

		var saveButton = new Ui.DefaultButton({ text: 'Enregistrer & Fermer' });
		this.connect(saveButton, 'press', this.onSaveQuitPress);
		this.setActionButtons([ saveButton ]);

		var lbox = new Ui.LBox();
		lbox.append(new Storage.PageBackgroundGraphic());

		this.setContent(lbox);

		if(navigator.isIE7 || navigator.isIE8)
			this.textField = new Ui.TextArea({ margin: 10 });
		else
			this.textField = new Ui.ContentEditable({ margin: 10 });
		lbox.append(this.textField);

		this.updateText();
	},

	updateText: function() {
		if(this.updateRequest !== undefined)
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
		else
			this.textField.setText(text);
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
		this.close();
	},

	onSaveTextError: function() {
		this.close();
	}
});