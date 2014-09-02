
Wn.Field.extend('Wn.DateField', {
	dateField: undefined,
	hoursField: undefined,
	displayHours: false,

	constructor: function(config) {
		var hbox = new Ui.HBox();
		this.setField(hbox);

		this.dateField = new Ui.DatePicker();
		hbox.append(this.dateField, true);
		this.connect(this.dateField, 'change', this.onFieldChange);

		this.hoursField = new Ui.TextField({ width: 60 });
		this.hoursField.hide(true);
		hbox.append(this.hoursField);
	},

	setDisplayHours: function(display) {
		if(this.displayHours !== display) {
			this.displayHours = display;
			if(this.displayHours)
				this.hoursField.show();
			else
				this.hoursField.hide(true);
		}
	},

	onFieldChange: function(field, value) {
		this.fireEvent('change', this, value);
	}
}, {
	getValue: function() {
		return this.dateField.getValue();
	},
	
	setValue: function(value) {
		this.dateField.setValue(value);
		var clock = '';
		var hours = value.getHours();
		if(hours < 10)
			clock = '0';
		clock += hours;
		clock += ':';
		var minutes = value.getMinutes();
		if(minutes < 10)
			clock += '0';
		clock += minutes;
		this.hoursField.setValue(clock);
	}
});

