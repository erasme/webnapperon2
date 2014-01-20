
Ui.Dialog.extend('Wn.CommentEditDialog', {
	comment: undefined,
	storage: undefined,
	file: undefined,
	textField: undefined,
	
	constructor: function(config) {
		this.comment = config.comment;
		delete(config.comment);
		this.storage = config.storage;
		delete(config.storage);
		this.file = config.file;
		delete(config.file);
	
		this.setFullScrolling(true);
		this.setPreferedWidth(400); 
		this.setPreferedHeight(300);
		this.setTitle('Edition de commentaire');
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
		
		this.textField = new Ui.TextAreaField({ value: this.comment.content });
		this.setContent(this.textField);
		
		var deleteButton = new Ui.Button({ text: 'Supprimer', style: { "Ui.Button": { color: '#fa4141' } } });
		this.connect(deleteButton, 'press', this.onDeletePress);
		var saveButton = new Ui.Button({ text: 'Enregistrer' });
		this.connect(saveButton, 'press', this.onSavePress);
		this.setActionButtons([ deleteButton, saveButton ]);
	},
	
	onSavePress: function() {
		var request = new Core.HttpRequest({ method: 'PUT',
			url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/comments/'+this.comment.id,
			content: JSON.stringify({ user: Ui.App.current.getUser().getId(), content: this.textField.getValue() }) });
		request.send();
		this.close();
	},
	
	onDeletePress: function() {
		var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/comments/'+this.comment.id });
		request.send();
		this.close();
	}
});

Ui.Rectangle.extend('Wn.CommentSeparator', {
	constructor: function() {
		this.setHeight(1);
		this.setFill('#999999');
	}
});

Ui.Selectionable.extend('Wn.CommentView', {
	user: undefined,
	comment: undefined,
	storage: undefined,
	file: undefined,
	contactface: undefined,
	dateLabel: undefined,
	text: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.comment = config.comment;
		delete(config.comment);
		
		this.storage = config.storage;
		delete(config.storage);
		
		this.file = config.file;
		delete(config.file);

		var hbox = new Ui.HBox({ spacing: 5 });
		this.setContent(hbox);

		var lbox = new Ui.LBox({ verticalAlign: 'top' });
		hbox.append(lbox);
		lbox.append(new Ui.Rectangle({ fill: '#999999' }));
		lbox.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));

		this.contactface = new Ui.Image({ width: 32, height: 32, margin: 1 });
		lbox.append(this.contactface);

		if(this.comment.user == this.user.getId())
			this.contactface.setSrc(this.user.getFaceUrl());
		else {
			var owner = Wn.Contact.getContact(this.comment.user);
			this.contactface.setSrc(owner.getFaceUrl());
		}

		var vbox = new Ui.VBox({ spacing: 2 });
		hbox.append(vbox, true);

		var delta = new Date() - new Date(this.comment.ctime * 1000);
		var days = Math.floor(delta / (1000 * 60 * 60 * 24));
		var hours = Math.floor(delta / (1000 * 60 * 60));
		var minutes = Math.floor(delta / (1000 * 60));
		var deltaStr = 'il y a ';
		if(days > 0)
			deltaStr += days+' jours';
		else if(hours > 0)
			deltaStr += hours+' heures';
		else
			deltaStr += minutes+' minutes';

		this.dateLabel = new Ui.Label({ opacity: 0.8, fontSize: 10, horizontalAlign: 'left', text: deltaStr });
		vbox.append(this.dateLabel);

		this.text = new Wn.ImproveText({ text: this.comment.content, width: 150 });

		vbox.append(this.text);
	},

	getComment: function() {
		return this.comment;
	},
	
	onCommentDelete: function() {
		var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/comments/'+this.comment.id });
		request.send();
	},
	
	onCommentEdit: function(selection) {
		var dialog = new Wn.CommentEditDialog({ comment: selection.getElements()[0].getComment(), storage: this.storage, file: this.file });
		dialog.open();
	},
	
	testCommentEditRight: function() {
		// allow edit to admins and owners of the comment
		return Ui.App.current.getUser().isAdmin() || (Ui.App.current.getUser().getId() == this.comment.user);
	}
}, {
	getSelectionActions: function() {
		return {
			"delete": { 
				text: 'Supprimer', icon: 'trash', color: '#d02020',
				scope: this, callback: this.onCommentDelete, multiple: false
			},
			edit: {
				"default": true,
				text: 'Modifier', icon: 'pen', testRight: this.testCommentEditRight,
				scope: this, callback: this.onCommentEdit, multiple: false
			}
		};
	}
});

Ui.LBox.extend('Wn.CommentViewer', {
	user: undefined,
	resource: undefined,
	storage: undefined,
	file: undefined,
	vbox: undefined,
	updateRequest: undefined,
	textField: undefined,
	commentsBox: undefined,
	submitButton: undefined,
	commentsLoaded: false,
	scroll: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.storage = config.storage;
		delete(config.storage);

		this.file = config.file;
		delete(config.file);

		this.resource = config.resource;
		delete(config.resource);
		
		this.append(new Wn.ContentBgGraphic());
		
		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, scrollVertical: false, directionRelease: true, margin: 4 });
		this.append(scroll);
		this.scroll = scroll;

		this.vbox = new Ui.VBox({ margin: 0, width: 210, spacing: 5 });
//		this.append(this.vbox);
		scroll.setContent(this.vbox);

		this.textField = new Ui.TextAreaField({ textHolder: 'Un commentaire ?', margin: 4 });
//		this.connect(this.textField, 'validate', this.onCommentValidate);
		this.vbox.append(this.textField);

		this.connect(this.textField.textarea, 'focus', this.onEntryFocus);
		this.connect(this.textField.textarea, 'blur', this.onEntryBlur);

//		var scroll = new Ui.ScrollingArea({ scrollHorizontal: false, directionRelease: true });
//		this.vbox.append(scroll, true);

		this.commentsBox = new Ui.VBox({ spacing: 5 });
//		scroll.setContent(this.commentsBox);
		this.vbox.append(this.commentsBox, true);
	
		this.submitButton = new Ui.Button({ text: 'Valider', horizontalAlign: 'right' });
		this.connect(this.submitButton, 'press', this.onCommentValidate);
		
		this.updateFile(this.file);
	},

	getComments: function() {
		return this.file.comments;
	},

	onEntryFocus: function() {
		if(this.submitButton.getParent() == undefined)
			this.vbox.insertAt(this.submitButton, 1);
	},

	onEntryBlur: function() {
		if((this.submitButton.getParent() !== undefined) && (this.textField.getValue() === ''))
			this.vbox.remove(this.submitButton);
	},

	onCommentValidate: function() {
		var text = this.textField.getValue();
		this.textField.setValue('');

		var request = new Core.HttpRequest({
			method: 'POST',
			url: '/cloud/storage/'+this.storage+'/'+this.file.id+'/comments',
			content: JSON.stringify({ user: this.user.getId(), content: text })
		});
		this.connect(request, 'error', this.onCreateCommentError);
		request.send();
	},

	onCreateCommentError: function() {
		var dialog = new Ui.Dialog();
		var closeButton = new Ui.Button({ text: 'Fermer' });
		dialog.connect(closeButton, 'press', function() { this.close() });
		dialog.setActionButtons([ closeButton ]);
		dialog.setContent(new Ui.Text({ width: 200, text: 'Une erreur est survenue lors de la publication de votre commentaire. Il n\'a pas pu être pris en compte.'}));
		dialog.open();
	},

	updateFile: function(file) {
		while(this.commentsBox.getFirstChild() != undefined)
			this.commentsBox.remove(this.commentsBox.getFirstChild());

		this.file = file;
		for(var i = 0; i < this.file.comments.length; i++) {
			if(i != 0) {
				this.scroll.setScrollVertical(true);
				this.commentsBox.append(new Wn.CommentSeparator());
			}
			var comment = this.file.comments[i];
			var view = new Wn.CommentView({ storage: this.storage, file: this.file, user: this.user, comment: comment });
			// handle rights.
			if(!Ui.App.current.getUser().isAdmin() && (this.resource.getOwnerId() !== Ui.App.current.getUser().getId()) && 
			   (Ui.App.current.getUser().getId() !== comment.user))
				view.disable();
			this.commentsBox.append(view);
		}
	}
});
