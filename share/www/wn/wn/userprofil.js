
Ui.UploadButton.extend('Wn.UploadFaceButton', {
	user: undefined,
	image: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);

		this.image = new Ui.Image({ width: 64, height: 64 });
		this.setIcon(this.image);
	},

	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	},

	onUploadProgress: function(uploader) {
	},

	onUploadComplete: function(uploader) {
		this.image.setSrc('/cloud/user/'+this.user.getId()+'/face');
	}

}, {
	onFile: function(button, file) {
		Wn.UploadFaceButton.base.onFile.apply(this, arguments);
		var uploader = new Core.FilePostUploader({ file: file, service: '/cloud/user/'+this.user.getId()+'/face' });
		this.connect(uploader, 'progress', this.onUploadProgress);
		this.connect(uploader, 'complete', this.onUploadComplete);
		uploader.send();
	},

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
	sflow: undefined,
	webSection: undefined,
	styleSection: undefined,
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
		this.setPreferredWidth(650);
		this.setPreferredHeight(550);
		this.setTitle('Profil utilisateur');
		this.setCancelButton(new Ui.DialogCloseButton());
				
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
			this.saveButton = new Ui.DefaultButton({ text: 'Enregistrer' });
			this.connect(this.saveButton, 'press', this.onSavePress);
			actionButtons.push(this.saveButton);
		}

		this.setActionButtons(actionButtons);
		
		var mainVbox = new Ui.VBox({ spacing: 10 });
		
		this.setContent(mainVbox);

		var sflow = new Ui.SFlow({ itemAlign: 'stretch', stretchMaxRatio: 10, spacing: 10 });
		mainVbox.append(sflow);
		this.sflow = sflow;

		var avatarButton = new Wn.UploadFaceButton({ user: this.user, marginLeft: 10 });
		sflow.append(avatarButton, 'right');

		this.firstnameField = new Wn.TextField({ title: 'Prénom' , width: 100 });
		sflow.append(this.firstnameField);

		this.lastnameField = new Wn.TextField({ title: 'Nom', width: 100 });
		sflow.append(this.lastnameField);

		this.descField = new Wn.TextAreaField({ title: 'Description', width: 400 });
		sflow.append(this.descField);

		if(Wn.User.hasInstance(this.user)) {
			this.emailField = new Wn.TextField({ title: 'Email', width: 600 });
			this.connect(this.emailField, 'change', function(field, value) {
				if(value == '')
					this.notifyBox.disable();
				else
					this.notifyBox.enable();
			});
			sflow.append(this.emailField);

			// email notify
			var groupField = new Wn.GroupField({ title: 'Notifications par email' });
			sflow.append(groupField);

			this.notifyBox = new Ui.VBox({ uniform: true });
			this.notifyBox.disable();
			groupField.setContent(this.notifyBox);

			this.notifyMessageSend = new Ui.CheckBox({ text: 'on m\'a envoyé un message' });
			this.notifyBox.append(this.notifyMessageSend);

			this.notifyUserAdd = new Ui.CheckBox({ text: 'on m\'a ajouté en contact' });
			this.notifyBox.append(this.notifyUserAdd);

			this.notifyResourceShare = new Ui.CheckBox({ text: 'on m\'a partagé une resource' });
			this.notifyBox.append(this.notifyResourceShare);

			this.notifyCommentAdd = new Ui.CheckBox({ text: 'on a rajouté un commentaire' });
			this.notifyBox.append(this.notifyCommentAdd);

			// default share rights
			groupField = new Wn.GroupField({ title: 'Droit de partage' });
			sflow.append(groupField);

			var vbox = new Ui.VBox({ uniform: true });
			this.defaultShareField = new Ui.CheckBox({ text: 'autoriser le repartage' });
			vbox.append(this.defaultShareField);
			this.defaultWriteField = new Ui.CheckBox({ text: 'autoriser la modification' });
			vbox.append(this.defaultWriteField);
			groupField.setContent(vbox);

			// admin flags
			if(Ui.App.current.getUser().isAdmin()) {
				groupField = new Wn.GroupField({ title: 'Droits administrateurs' });
				sflow.append(groupField);

				var vbox = new Ui.VBox({ uniform: true });
				this.adminField = new Ui.CheckBox({ text: 'compte administrateur' });
				vbox.append(this.adminField);

				this.defaultFriendField = new Ui.CheckBox({ text: 'compte d\'ami par défault' });
				vbox.append(this.defaultFriendField);

				groupField.setContent(vbox);
			}

			this.webSection = new Wn.WebAccountSection({ user: this.user });
			mainVbox.append(this.webSection);

			this.styleSection = new Wn.StyleSection({ user: this.user });
			mainVbox.append(this.styleSection);

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
			this.sflow.disable();
			//grid.disable();
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
			this.sflow.disable();
			this.saveButton.disable();
		}
	},

	testSaveEnd: function() {
		if(this.saveRequests.length == 0) {
			if(this.errorRequests.length > 0) {
				this.sflow.enable();
				this.saveButton.enable();
		
				var dialog = new Ui.Dialog({ preferredWidth: 300, title: 'Echec de l\'enregistrement' });
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
			preferredWidth: 300,
			preferredHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment supprimer ce compte ? ATTENTION, cet utilisateur '+
			'et toutes ses ressources n\'existeront plus après cette action.' }));
		dialog.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
		var deleteButton = new Ui.DefaultButton({ text: 'Supprimer' });
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
			preferredWidth: 300,
			preferredHeight: 300
		});
		dialog.setContent(new Ui.Text({ text: 
			'Voulez vous vraiment ouvrir une session sur le compte de cet utilisateur ? ATTENTION, '+
			'vous ne serez plus sur votre compte et vous aller agir au nom de cette personne.' }));
		dialog.setCancelButton(new Ui.DialogCloseButton({ text: 'Annuler' }));
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
			preferredWidth: 300,
			preferredHeight: 300,
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
			preferredWidth: 300,
			preferredHeight: 300,
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

