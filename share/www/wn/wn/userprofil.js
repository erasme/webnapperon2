
Ui.DropBox.extend('Wn.UploadFaceButton', 
{
	user: undefined,
	graphic: undefined,
	uploadable: undefined,
	image: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
			
		this.addMimetype('files');
	
		this.uploadable = new Ui.Uploadable();
		this.setContent(this.uploadable);
	
		var lbox = new Ui.LBox();
		this.uploadable.setContent(lbox);
	
		this.graphic = new Ui.ButtonGraphic();
		lbox.append(this.graphic);
		
		this.image = new Ui.Image({ width: 64, height: 64, margin: 10 });
		lbox.append(this.image);

		this.connect(this.uploadable, 'down', function() { this.graphic.setIsDown(true); });
		this.connect(this.uploadable, 'up', function() { this.graphic.setIsDown(false); });
		this.connect(this.uploadable, 'focus', function() { this.graphic.setColor(this.getStyleProperty('focusColor')); });
		this.connect(this.uploadable, 'blur', function() { this.graphic.setColor(this.getStyleProperty('color')); });
		this.connect(this, 'dropfile', this.onUploadFile);
		this.connect(this.uploadable, 'file', this.onUploadFile);
	},
	
	onUploadFile: function(element, file) {
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/user/'+this.user.getId()+'/face' });
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
	},

	onUploadProgress: function(uploader) {
	},

	onUploadComplete: function(uploader) {
		this.image.setSrc('/cloud/user/'+this.user.getId()+'/face');
	},
	
	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	}
}, 
{
	onLoad: function() {
		Wn.UploadFaceButton.base.onLoad.call(this);
		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		Wn.UploadFaceButton.base.onUnload.call(this);
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});

Ui.Dialog.extend('Wn.UserProfil', {
	user: undefined,
	firstnameField: undefined,
	lastnameField: undefined,
	emailField: undefined,
	avatarBlob: undefined,
	avatarImage: undefined,
	notifyBox: undefined,
	notifyMessageSend: undefined,
	notifyUserAdd: undefined,
	notifyResourceShare: undefined,
	notifyCommentAdd: undefined,
	defaultShareField: undefined,
	defaultWriteField: undefined,
	defaultFriendField: undefined,
	adminField: undefined,
	saveButton: undefined,
	grid: undefined,
	webSection: undefined,
	readerSection: undefined,		
	rfidSection: undefined,
	tags: undefined,
	saveRequests: undefined,
	errorRequests: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		// if we are admin, we want access to the full profil
		if(Ui.App.current.getUser().isAdmin() && Wn.Contact.hasInstance(this.user))
			this.user = new Wn.User({ user:  { id: this.user.getId(), face_rev: 0 }, monitor: false });

		this.setFullScrolling(true);
		this.setPreferedWidth(650);
		this.setPreferedHeight(550);
		this.setTitle('Profil utilisateur');
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));
				
		if(this.user.getIsReady())
			this.onUserReady();
		else
			this.connect(this.user, 'ready', this.onUserReady);
	},

	onUserReady: function() {
			var actionButtons = [];
		
		if(Wn.User.hasInstance(this.user)) {
			if(Ui.App.current.getUser().isAdmin()) {
				// let him connect on this contact account
				var switchButton = new Wn.InfoButton({ text: 'Commuter' });
				this.connect(switchButton, 'press', this.onSwitchPress);

				// let him delete the account
				var deleteButton = new Wn.AlertButton({ text: 'Supprimer' });
				this.connect(deleteButton, 'press', this.onDeletePress);
			
				if(Ui.App.current.getUser().getId() !== this.user.getId())
					actionButtons.push(switchButton);
				actionButtons.push(deleteButton);
			}
		}
		
		if(Ui.App.current.getUser().getId() !== this.user.getId()) {
			if(Ui.App.current.getUser().getContact(this.user.getId()) !== undefined) {
				var removeButton = new Ui.Button({ text: 'Enlever' });
				this.connect(removeButton, 'press', this.onRemoveContactPress);
				actionButtons.push(removeButton);
			}
			else {
				var addButton = new Ui.Button({ text: 'Ajouter' });
				this.connect(addButton, 'press', this.onAddContactPress);
				actionButtons.push(addButton);
			}
		}
		
		if(Wn.User.hasInstance(this.user)) {
			this.saveButton = new Ui.Button({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);
			actionButtons.push(this.saveButton);
		}

		this.setActionButtons(actionButtons);
		
		var mainVbox = new Ui.VBox();
		
		this.setContent(mainVbox);
		
		var grid = new Ui.Grid({ cols: 'auto,*,auto', rows: 'auto,auto,auto,auto,auto,auto,auto,auto,auto,auto'});
		mainVbox.append(grid);
		this.grid = grid;

		var avatarButton = new Wn.UploadFaceButton({ user: this.user, marginLeft: 10 });
		grid.attach(avatarButton, 2, 2, 1, 3);

		grid.attach(new Ui.Label({ text: 'Prénom', horizontalAlign: 'right', marginRight: 10 }), 0, 3);
		this.firstnameField = new Ui.TextField();
		grid.attach(this.firstnameField, 1, 3, 1, 1);

		grid.attach(new Ui.Label({ text: 'Nom', horizontalAlign: 'right', marginRight: 10 }), 0, 4);
		this.lastnameField = new Ui.TextField();
		grid.attach(this.lastnameField, 1, 4, 1, 1);

		grid.attach(new Ui.Label({ text: 'Description', horizontalAlign: 'right', marginRight: 10 }), 0, 5);
		this.descField = new Ui.TextAreaField();
		grid.attach(this.descField, 1, 5, 2, 1);

		if(Wn.User.hasInstance(this.user)) {
			grid.attach(new Ui.Label({ text: 'Email', horizontalAlign: 'right', marginRight: 10 }), 0, 6);
			this.emailField = new Ui.TextField();
			this.connect(this.emailField, 'change', function(field, value) {
				if(value == '')
					this.notifyBox.disable();
				else
					this.notifyBox.enable();
			});
			grid.attach(this.emailField, 1, 6, 2, 1);

			// email notify
			grid.attach(new Ui.Text({ text: 'Notifications par email', textAlign: 'right', verticalAlign: 'center', marginRight: 10, width: 80 }), 0, 7);
			this.notifyBox = new Ui.VBox({ uniform: true });
			this.notifyBox.disable();
			grid.attach(this.notifyBox, 1, 7, 2, 1);

			this.notifyMessageSend = new Ui.CheckBox({ text: 'on m\'a envoyé un message' });
			this.notifyBox.append(this.notifyMessageSend);

			this.notifyUserAdd = new Ui.CheckBox({ text: 'on m\'a ajouté en contact' });
			this.notifyBox.append(this.notifyUserAdd);

			this.notifyResourceShare = new Ui.CheckBox({ text: 'on m\'a partagé une resource' });
			this.notifyBox.append(this.notifyResourceShare);

			this.notifyCommentAdd = new Ui.CheckBox({ text: 'on a rajouté un commentaire' });
			this.notifyBox.append(this.notifyCommentAdd);

			// default share rights
			grid.attach(new Ui.Text({ text: 'Droit de partage', textAlign: 'right', verticalAlign: 'center', marginRight: 10, width: 80 }), 0, 8);
			var vbox = new Ui.VBox({ uniform: true });
			this.defaultShareField = new Ui.CheckBox({ text: 'autoriser le repartage' });
			vbox.append(this.defaultShareField);
			this.defaultWriteField = new Ui.CheckBox({ text: 'autoriser la modification' });
			vbox.append(this.defaultWriteField);
			grid.attach(vbox, 1, 8, 2, 1);

			// admin flags
			if(Ui.App.current.getUser().isAdmin()) {
				grid.attach(new Ui.Text({ text: 'Admin flags', textAlign: 'right', verticalAlign: 'center', marginRight: 10, width: 80, color: 'red' }), 0, 9);
				var vbox = new Ui.VBox({ uniform: true });
				this.adminField = new Ui.CheckBox({ text: 'compte administrateur' });
				vbox.append(this.adminField);

				this.defaultFriendField = new Ui.CheckBox({ text: 'compte d\'ami par défault' });
				vbox.append(this.defaultFriendField);

				grid.attach(vbox, 1, 9, 2, 1);
			}

			this.webSection = new Wn.WebAccountSection({ user: this.user });
			mainVbox.append(this.webSection);

			var deviceSection = new Wn.DeviceSection({ user: this.user, devices: this.user.getData().devices });
			mainVbox.append(deviceSection);

			this.readerSection = new Wn.ReaderSection({ user: this.user, device: null, readers: this.user.getData().readers, title: 'Lecteurs RFID liés à mon compte' });
			mainVbox.append(this.readerSection);
		}
		
		this.tags = Ui.App.current.getUser().getRfidsFromPath('user:'+this.user.getId());
		this.rfidSection = new Wn.RfidSection({ user: Ui.App.current.getUser(), tags: this.tags, path: 'user:'+this.user.getId() });
		mainVbox.append(this.rfidSection);
		
		if(Ui.App.current.getUser().isAdmin()) {
			var statsSection = new Wn.UserStatsSection({ contact: this.user });
			mainVbox.append(statsSection);
		}
	
		this.firstnameField.setValue(this.user.getData().firstname);
		this.lastnameField.setValue(this.user.getData().lastname);
		this.descField.setValue(this.user.getData().description);
		
		if(Wn.User.hasInstance(this.user)) {
		
			this.emailField.setValue(this.user.getData().email);
			if((this.user.getData().email == '') || (this.user.getData().email == undefined))
				this.notifyBox.disable();
			else
				this.notifyBox.enable();
			this.notifyMessageSend.setValue(this.user.getData().email_notify_message_received);
			this.notifyUserAdd.setValue(this.user.getData().email_notify_contact_added);
			this.notifyResourceShare.setValue(this.user.getData().email_notify_resource_shared);
			this.notifyCommentAdd.setValue(this.user.getData().email_notify_comment_added);
			this.defaultShareField.setValue(this.user.getData().default_share_right);
			this.defaultWriteField.setValue(this.user.getData().default_write_right);

			if(Ui.App.current.getUser().isAdmin()) {
				this.adminField.setValue(this.user.getData().admin);
				this.defaultFriendField.setValue(this.user.getData().default_friend);
			}
		}
		else {
			grid.disable();
		}
	},

	onSavePress: function() {
		this.saveRequests = [];
		this.errorRequests = [];
	
		// handle general user data
		var diff = {};

		diff.firstname = this.firstnameField.getValue();
		diff.lastname = this.lastnameField.getValue();
		diff.email = this.emailField.getValue();
		if(diff.email === '')
			diff.email = null;
		diff.description = this.descField.getValue();
		diff.email_notify_message_received = this.notifyMessageSend.getValue();
		diff.email_notify_contact_added = this.notifyUserAdd.getValue();
		diff.email_notify_resource_shared = this.notifyResourceShare.getValue();
		diff.email_notify_comment_added = this.notifyCommentAdd.getValue();
		diff.default_share_right = this.defaultShareField.getValue();
		diff.default_write_right = this.defaultWriteField.getValue();

		if(Ui.App.current.getUser().isAdmin()) {
			diff.admin = this.adminField.getValue();
			diff.default_friend = this.defaultFriendField.getValue();
		}
		// build the difference
		diff = Core.Object.diff(this.user.getData(), diff);
		if(diff !== undefined) {
			var request = new Core.HttpRequest({ method: 'PUT',
				url: '/cloud/user/'+this.user.getId(),
				content: JSON.stringify(diff)
			});
			this.connect(request, 'done', this.onSaveDone);
			this.connect(request, 'error', this.onSaveError);
			this.saveRequests.push(request);
			request.send();
		}
		
		// nothing to do, close the dialog
		if(this.saveRequests.length === 0) {
			this.close();
		}
		// else disable saveButton and any change
		else {
			this.grid.disable();
			this.saveButton.disable();
		}
	},

	testSaveEnd: function() {
		if(this.saveRequests.length == 0) {
			if(this.errorRequests.length > 0) {
				this.grid.enable();
				this.saveButton.enable();
		
				var dialog = new Ui.Dialog({ preferedWidth: 300, title: 'Echec de l\'enregistrement' });
				dialog.setContent(new Ui.Text({ text: 
					'L\'enregistrement à échoué. Vérifiez que votre mot de passe '+
					'respecte la politique de sécurité. A savoir qu\'il doit faire au '+
					'moins 8 caractères et contenir des chiffres et des lettres.' }))
				var button = new Ui.Button({ text: 'Fermer' });
				dialog.setActionButtons([ button ]);
				this.connect(button, 'press', function() {
					dialog.close();
				});
				dialog.open();
			}
			else {
				this.close();
			}
		}
	},
			
	onSaveDone: function(request) {
		var pos = undefined;
		for(var i = 0; i < this.saveRequests.length; i++) {
			if(this.saveRequests[i] === request)
				pos = i;
		}
		if(pos !== undefined)
			this.saveRequests.splice(pos, 1);
		this.testSaveEnd();
	},
	
	onSaveError: function(request) {
		this.errorRequests.push(request);
		var pos = undefined;
		for(var i = 0; i < this.saveRequests.length; i++) {
			if(this.saveRequests[i] === request)
				pos = i;
		}
		if(pos !== undefined)
			this.saveRequests.splice(pos, 1);
		this.testSaveEnd();
	},
	
	onDeletePress: function() {
		var dialog = new Ui.Dialog({
			title: 'Suppression de compte',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment supprimer ce compte ? ATTENTION, cet utilisateur '+
			'et toutes ses ressources n\'existeront plus après cette action.' }));
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));
		var deleteButton = new Wn.AlertButton({ text: 'Supprimer' });
		dialog.setActionButtons([deleteButton]);

		this.connect(deleteButton, 'press', function() {
			dialog.disable();
			var request = new Core.HttpRequest({ method: 'DELETE', url: '/cloud/user/'+this.user.getId() });
			this.connect(request, 'done', function() {
				dialog.close();
				Ui.App.current.setMainPath('');
				this.close();
			});
			this.connect(request, 'error', function() {
				dialog.close();
				this.close();
			});
			request.send();
		});
		dialog.open();
	},

	onSwitchPress: function() {
		var session = undefined;

		var dialog = new Ui.Dialog({
			title: 'Connexion au compte',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment ouvrir une session sur le compte de cet utilisateur ? ATTENTION, '+
			'vous ne serez plus sur votre compte et vous aller agir au nom de cette personne.' }));
		dialog.setCancelButton(new Ui.Button({ text: 'Annuler' }));
		var switchButton = new Wn.InfoButton({ text: 'Commuter' });
		dialog.setActionButtons([switchButton]);

		this.connect(switchButton, 'press', function() {
			dialog.close();
			window.open('/?user='+encodeURIComponent(this.user.getId()));
		});
		dialog.open();
	},
	
	onRemoveContactPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Enlever un contact',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300,
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous supprimer ce contact de votre liste de contact ?\n\nCela ne vous empêchera pas de le remettre plus tard si vous changez d\'avis.' })
		});
		var removeButton = new Ui.Button({ text: 'Enlever' });
		this.connect(removeButton, 'press', function() {
			Ui.App.current.getUser().removeContact(this.user);
			dialog.close();
			this.close();
		});
		dialog.setActionButtons([ removeButton ]);
		dialog.open();
	},

	onAddContactPress: function() {
		var dialog = new Ui.Dialog({
			title: 'Ajout de contact',
			fullScrolling: true,
			preferedWidth: 300,
			preferedHeight: 300,
			cancelButton: new Ui.Button({ text: 'Annuler' }),
			content: new Ui.Text({ text: 'Voulez vous ajouter ce contact dans votre liste de contact ?' })
		});
		var addButton = new Ui.Button({ text: 'Ajouter', style: { "Ui.Button": { color: '#43c3ff' } } });
		this.connect(addButton, 'press', function() {
			Ui.App.current.getUser().prependContact(this.user);
			dialog.close();
			this.close();
		});
		dialog.setActionButtons([ addButton ]);
		dialog.open();
	}

}/*, {
	onLoad: function() {
		Wn.UserProfil.base.onLoad.call(this);

		this.connect(this.user, 'change', this.onUserChange);
		this.onUserChange();
	},
	
	onUnload: function() {
		Wn.UserProfil.base.onUnload.call(this);

		this.disconnect(this.user, 'change', this.onUserChange);
	}
}*/);

