
Wn.Field.extend('Wn.DateField', {

	constructor: function(config) {
		var field = new Ui.DatePicker();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});

