
Ui.Button.extend('Wn.SelectionButton', {
	constructor: function() {
		this.setDraggableData(this);
	}
}, {
	onPress: function() {
		Wn.SelectionButton.base.onPress.apply(this, arguments);
		if(this.getIsSelected())
			this.unselect();
		else
			this.select();
		this.setIsActive(this.getIsSelected());
	},
	
	onSelect: function() {
		this.setIsActive(true);
	},

	onUnselect: function() {
		this.setIsActive(false);
	}
});
