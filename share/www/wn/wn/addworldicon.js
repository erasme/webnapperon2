
Ui.Selectionable.extend('Wn.AddWorldIcon', {
	user: undefined,
	dialog: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.dialog = config.dialog;
		delete(config.dialog);
		
		var vbox = new Ui.VBox({ margin: 5 });
		this.append(vbox);

		var icon = new Ui.Icon({ width: 48, height: 48, margin: 1, icon: 'earth', fill: '#444444', horizontalAlign: 'center' });
		vbox.append(icon);

		var label = new Ui.CompactLabel({ text: 'Tout le monde', fontSize: 14, margin: 3, width: 80, maxLine: 2, textAlign: 'center', color: '#67696c', horizontalAlign: 'center' });
		vbox.append(label);
	},
	
	onWorldRightAdd: function(selection) {
		var item = selection.getElements()[0];
		var rights = item.dialog.getRights();
		var resource = item.dialog.getResource();
		resource.addPublicRights(rights);
		item.dialog.close();
	}
}, {
	getSelectionActions: function() {
		return {
			add: {
				text: 'Ajouter', icon: 'plus',
				callback: this.onWorldRightAdd, multiple: false
			}
		}
	}
});
