
Wn.SelectionButton.extend('Wn.AddWorldIcon', {
	user: undefined,
	dialog: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
		
		this.dialog = config.dialog;
		delete(config.dialog);

		this.setIcon('earth');
		this.setText('Tout le monde');
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
