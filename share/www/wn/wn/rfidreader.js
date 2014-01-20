

Core.Object.extend('Wn.RfidReader', {
	constructor: function(config) {
		this.addEvents('enter');
	},

	fireEnter: function(rfid) {
		this.fireEvent('enter', this, rfid);
	}
});