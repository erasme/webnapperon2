Ui.Pressable.extend('Wn.UserFace', {
	user: undefined,
	image: undefined,
	
	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.setVerticalAlign('center');
		this.connect(this, 'press', this.onUserPress);
		this.append(new Ui.Rectangle({ fill: '#999999' }));
		this.append(new Ui.Rectangle({ fill: '#f1f1f1', margin: 1 }));
		this.image = new Ui.Image({ width: 46, height: 46, margin: 1, src: this.user.getFaceUrl() });
		this.append(this.image);
	},
	
	onUserChange: function() {
		this.image.setSrc(this.user.getFaceUrl());
	},
	
	onUserPress: function() {
		Ui.App.current.setMainPath('user:'+this.user.getId());
	}
}, {
	onLoad: function() {
		Wn.UserFace.base.onLoad.call(this);
		this.connect(this.user, 'change', this.onUserChange);
	},
	
	onUnload: function() {
		Wn.UserFace.base.onUnload.call(this);
		this.disconnect(this.user, 'change', this.onUserChange);
	}
});
