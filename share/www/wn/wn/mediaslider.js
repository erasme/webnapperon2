
Ui.Container.extend('Wn.MediaSlider', 
/**@lends Wn.MediaSlider#*/
{
	value: 0,
	background: undefined,
	button: undefined,

	/**
	 * @constructs
	 * @class
	 * @extends Ui.Container
	 */
	constructor: function(config) {
		this.addEvents('change');

		this.lightShadow = new Ui.Rectangle({ fill: new Ui.Color({ r: 1, g: 1, b: 1, a: 0.25 }), radius: 4 });
		this.appendChild(this.lightShadow);

		this.darkShadow = new Ui.Rectangle({ fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.4}), radius: 4 });
		this.appendChild(this.darkShadow);

		this.background = new Ui.Rectangle({ fill: new Ui.Color({ r: 0.85, g: 0.85, b: 0.85 }), radius: 4 });
		this.appendChild(this.background);

		this.backgroundShadow = new Ui.Shadow({ shadowWidth: 2, inner: true, radius: 4, opacity: 0.2 });
		this.appendChild(this.backgroundShadow);

		this.barBox = new Ui.LBox();
		this.appendChild(this.barBox);

		this.barBackground = new Ui.Rectangle({ radius: 3 });
		this.barBox.append(this.barBackground);

		this.bar = new Ui.Rectangle({ margin: 1, radius: 3 });
		this.barBox.append(this.bar);

		this.button = new Ui.Movable({ moveVertical: false });
		this.appendChild(this.button);
		this.connect(this.button, 'move', this.onButtonMove);
		this.connect(this.button, 'focus', this.updateColors);
		this.connect(this.button, 'blur', this.updateColors);
		this.connect(this.button, 'down', this.updateColors);
		this.connect(this.button, 'up', this.updateColors);

		this.buttonContent = new Ui.SliderContentDrawing({ marginTop: 5, marginLeft: 10, marginRight: 10});
		this.button.setContent(this.buttonContent);
	},

	getValue: function() {
		return this.value;
	},

	setValue: function(value) {
		if(this.value != value) {
			this.value = value;
			this.updateValue();
			this.fireEvent('change', this);
		}
	},

	/**#@+
	 * @private
	 */

	onButtonMove: function(button) {
		var posX = this.button.getPositionX();
		var width = this.getLayoutWidth();
		var maxX = width - 44;
		if(posX < 0)
			posX = 0;
		else if(posX > maxX)
			posX = maxX;

		var oldValue = this.value;
		this.value = posX / maxX;
		this.disconnect(this.button, 'move', this.onButtonMove);
		this.updateValue();
		this.connect(this.button, 'move', this.onButtonMove);
		if(oldValue != this.value)
			this.fireEvent('change', this);
	},

	updateValue: function() {
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var maxX = width - 44;
		this.button.setPosition(maxX * this.value, undefined);
		var y = (height - 44)/2;
		this.barBox.arrange(18, y + 18, (width - 36) * this.value, 9);
	},

	getGradient: function() {
		var yuv = this.getStyleProperty('color').getYuv();
		return new Ui.LinearGradient({ stops: [
			{ offset: 0, color: new Ui.Color({ y: yuv.y + 0.10, u: yuv.u, v: yuv.v }) },
			{ offset: 1, color: new Ui.Color({ y: yuv.y - 0.10, u: yuv.u, v: yuv.v }) }
		] });
	},

	getBarBorderColor: function() {
		var yuv = this.getStyleProperty('color').getYuv();
		return new Ui.Color({ y: yuv.y - 0.20, u: yuv.u, v: yuv.v });
	},

	getContentBorderColor: function() {
		var yuv = this.getStyleProperty('color').getYuv();
		return new Ui.Color({ y: yuv.y - 0.40, u: yuv.u, v: yuv.v });
	},

	getButtonColor: function() {
		var yuv = this.getStyleProperty('color').getYuv();

		var deltaY = 0;
		if(this.button.getIsDown())
			deltaY = -0.30;
		else if(this.button.getHasFocus())
			deltaY = 0.10;

		return new Ui.Color({ y: yuv.y + deltaY, u: yuv.u, v: yuv.v });
	},

	updateColors: function() {
		this.bar.setFill(this.getGradient());
		this.barBackground.setFill(this.getBarBorderColor());
		this.buttonContent.setFill(this.getButtonColor());
	}

	/**#@-*/
}, 
/**@lends Wn.MediaSlider#*/
{
	measureCore: function(width, height) {
		this.lightShadow.measure(width - 34, 10);
		this.darkShadow.measure(width - 34, 10);
		this.background.measure(width - 36, 10);
		this.backgroundShadow.measure(width - 36, 10);
		this.barBox.measure(width - 38, 9);
		this.button.measure(40, 40);
		return { width: 88, height: 44 };
	},

	arrangeCore: function(width, height) {
		var y = (height - 44)/2;
		this.lightShadow.arrange(17, y + 18, width - 34, 10);
		this.darkShadow.arrange(17, y + 17, width - 34, 10);
		this.background.arrange(18, y + 18, width - 36, 10);
		this.backgroundShadow.arrange(18, y + 18, width - 36, 10);
		this.button.arrange(2, y + 2, 40, 40);
		this.updateValue();
	},

	onStyleChange: function() {
		this.updateColors();
	},

	onDisable: function() {
		Ui.Slider.base.onDisable.call(this);
		this.button.setOpacity(0.2);
	},

	onEnable: function() {
		Wn.MediaSlider.base.onEnable.call(this);
		this.button.setOpacity(1);
	}
}, 
/**@lends Wn.MediaSlider*/
{
	style: {
		color: new Ui.Color({ r: 0.31, g: 0.66, b: 1 })
	}
});

