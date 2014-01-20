
Wn.ResourceViewer.extend('Radio.App', {
	audio: undefined,

	constructor: function(config) {
		var vbox = new Ui.VBox({ horizontalAlign: 'center', verticalAlign: 'center' });
		this.setContent(vbox);

		vbox.append(new Ui.Label({ text: this.getResource().getName() }));
		
		this.audio = new Ui.Audio({ src: this.getResource().getData() });
		vbox.append(this.audio);

		var button = new Ui.Button({ text: 'Jouer' });
		vbox.append(button);
		this.connect(button, 'press', this.onPlayPress);
	},

	onPlayPress: function() {
		this.audio.play();
	}
}, {}, {
	constructor: function() {
		this.register('radio', this);
	}
});

