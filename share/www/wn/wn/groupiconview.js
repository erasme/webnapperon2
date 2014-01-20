
Ui.LBox.extend('Wn.GroupIconView', {
	label: undefined,

	constructor: function(config) {
		var icon = new Wn.DualIcon({ icon: 'group', width: 48, height: 48, strokeWidth: 2 });
		this.append(icon);
		this.label = new Ui.Label({ fontSize: 12, fontWeight: 'bold', horizontalAlign: 'center', verticalAlign: 'bottom', marginBottom: 12, color: 'black' });
		this.append(this.label);
	},

	setValue: function(number) {
		this.label.setText(number.toString());
	}
});

