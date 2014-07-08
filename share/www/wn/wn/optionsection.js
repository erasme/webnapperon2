
Ui.Button.extend('Wn.OptionOpenButton', {
	constructor: function() {
		this.setIcon('optionarrow');
	}
});

Ui.Fold.extend('Wn.OptionSection', {
	title: undefined,
	arrow: undefined,
	optionContent: undefined,
	optionOpenButton: undefined,

	constructor: function() {
		this.setOver(false);
		this.setIsFolded(false);

		this.optionOpenButton = new Wn.OptionOpenButton();
		this.connect(this.optionOpenButton, 'press', this.invert);
		this.setHeader(this.optionOpenButton);
						
		this.optionContent = new Ui.LBox({ paddingLeft: 10 });
		Wn.OptionSection.base.setContent.call(this, this.optionContent);
	},
	
	setTitle: function(title) {
		this.optionOpenButton.setText(title);
	}
}, {
	setContent: function(content) {
		this.optionContent.setContent(content);
	},
	
	setOffset: function(offset) {
		Wn.OptionSection.base.setOffset.call(this, offset);
		if(this.optionOpenButton !== undefined)
			this.optionOpenButton.getIcon().setTransform(Ui.Matrix.createRotate(offset * 90));
	}
});