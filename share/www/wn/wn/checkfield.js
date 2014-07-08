
Wn.Field.extend('Wn.CheckField', {

	constructor: function(config) {
		var field = new Ui.CheckBox();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},

	getText: function() {
		return this.field.getText();
	},
	
	setText: function(text) {
		this.getField().setText(text);
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});
