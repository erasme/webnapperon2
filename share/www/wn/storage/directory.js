
Ui.Draggable.extend('Nautilus.Directory', {
	directory: undefined,
	watcher: undefined,
	values: undefined,
	content: undefined,
	label: undefined,

	constructor: function(config) {
		this.addEvents('activate');

		this.setMargin(10);

		var selectable = new Ui.Selectable();
		this.setContent(selectable);
		this.connect(selectable, 'activate', this.onDirectoryActivate);

		var vbox = new Ui.VBox();
		selectable.setContent(vbox);

		this.content = new Ui.LBox({ width: 70, height: 70 });
		vbox.append(this.content);

		this.label = new Ui.CompactLabel({ text: '', width: 128, maxLine: 3, textAlign: 'center' });
		vbox.append(this.label);

		this.content.setContent(new Ui.Icon({ fill: 'lightblue', width: 50, height: 50, verticalAlign: 'bottom', horizontalAlign: 'center', path: 'm 2.5,36.0 c 0,6.25 6.25,6.6406 6.25,6.6406 0,0 25,0 31.25,0 6.25,0 6.25,-6.25 6.25,-6.25 0,0 0,-9.375 0,-15.625 0,-6.25 -6.25,-6.25 -6.25,-6.25 0,0 -9.375,0 -12.5,0 -3.125,0 -3.125,-1.25 -3.125,-3.125 0,-0.7794 0,1.2625 0,0 0,-3.125 -3.125,-3.125 -3.125,-3.125 l -12.5,0 c 0,0 -3.125,0.012 -3.125,3.125 0.2352725,3.0673 0,0 0,3.125 0,0 -3.125,0 -3.125,6.2473 0,6.2472 0,8.9816 0,15.2316 z' }));
	},

	setDirectory: function(directory) {
		this.directory = directory;
		this.watcher = this.directory.watch('Changed');
		this.connect(this.watcher, 'message', this.onDirectoryChange);
	},

	getDirectory: function() {
		return this.directory;
	},

	onDirectoryActivate: function() {
		console.log('onDirectoryActivate');
		this.fireEvent('activate', this);
	},

	onDirectoryChange: function(cmd, msg) {
		console.log('onDirectoryChange:');
		this.values = msg;
		this.label.setText(msg.name);
	},

	getName: function() {
		return this.values.name;
	}
});

