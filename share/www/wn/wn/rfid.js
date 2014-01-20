
Core.Object.extend('Wn.RfidEvent', {
	prevent: false,

	preventDefault: function() {
		this.prevent = true;
	},
	
	getPreventDefault: function() {
		return this.prevent;
	}
});

Core.Object.extend('Wn.Rfid', {
	constructor: function(config) {
		this.addEvents('enter');
	},
	
	fireEnter: function(rfid) {
		var event = new Wn.RfidEvent();
		this.fireEvent('enter', this, rfid, event);
	}
	
}, {}, {
	supportRfid: false,
	current: undefined,
	
	constructor: function() {
		Wn.Rfid.supportRfid = ('rfid' in window);
		if(Wn.Rfid.supportRfid)
			window.rfid.setOnRfidEnter('Wn.Rfid.onRfidEnter');
		Wn.Rfid.current = new Wn.Rfid();
	},
	
	onRfidEnter: function(rfid) {
		Wn.Rfid.current.fireEnter.call(Wn.Rfid.current, rfid);
	}
});

