
Wn.Field.extend('Wn.SliderField', {

	constructor: function(config) {
		var field = new Ui.Slider();
		this.connect(field, 'change', this.onFieldChange);
		this.setField(field);
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
});

