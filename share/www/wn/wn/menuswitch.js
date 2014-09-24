Ui.LBox.extend('Wn.MenuSwitch',
/** @lends Wn.MenuSwitch#*/
{
	pos: 1,
	movable: undefined,
	switchbox: undefined,
	value: false,

	alignClock: undefined,
	speed: 0,
	animNext: 0,
	animStart: 0,
	ease: undefined,

	/**
	 * @constructs
	 * @class
	 * @extends Ui.LBox
	 */
	constructor: function(config) {
		this.setFocusable(true);

		this.setClipToBounds(true);

		this.movable = new Ui.Movable({ moveVertical: false, margin: 1, marginBottom: 2 });
		this.movable.setFocusable(false);
		this.append(this.movable);

		this.switchbox = new Wn.SwitchBox();
		this.movable.setContent(this.switchbox);

		this.connect(this.movable, 'move', this.onMove);
		this.connect(this.movable, 'down', this.onDown);
		this.connect(this.movable, 'up', this.onUp);

		this.addEvents('change');

		if('ease' in config)
			this.setEase(config.ease);
		else
			this.ease = Anim.EasingFunction.create({ type: Anim.PowerEase, mode: 'out' });
	},

	setEase: function(ease) {
		this.ease = Anim.EasingFunction.create(ease);
	},

	getMenu: function() {
		return this.switchbox.getButton();
	},

	setMenu: function(menu) {
		this.switchbox.setButton(menu);
	},

	getContent1: function() {
		return this.switchbox.getContent1();
	},

	setContent1: function(content1) {
		this.switchbox.setContent1(content1);
	},

	getContent2: function() {
		return this.switchbox.getContent2();
	},

	setContent2: function(content2) {
		this.switchbox.setContent2(content2);
	},

	getValue: function() {
		return this.value;
	},

	setPos: function(pos) {
		this.pos = pos;
		this.value = (this.pos < 0.5);
		this.invalidateArrange();
	},

	setValue: function(value) {
		if(this.value != value) {
			this.value = value;
			if(this.value)
				this.startAnimation(2);
			else
				this.startAnimation(-2);
		}
	},

	/**#@+
	* @private
	*/

	onMove: function(button) {
		var posX = this.movable.getPositionX();

		var contentWidth = this.switchbox.getContentWidth();
		posX = Math.min(0, Math.max(posX, -contentWidth));
		this.pos = -posX / contentWidth;
		this.updatePos();
	},

	onDown: function(movable) {
		this.focus();
		this.stopAnimation();
	},

	onUp: function(movable, speedX, speedY, deltaX, deltaY, cumulMove) {
		 if(Math.abs(speedX) < 100) {
			if(this.pos > 0.5)
				speedX = -1;
			else
				speedX = 1;
		}
		else
			speedX /= this.switchbox.getContentWidth();
		if(speedX != 0)
			this.startAnimation(speedX);
	},

	updatePos: function() {
		var contentWidth = this.switchbox.getContentWidth();

		var posX = -this.pos * contentWidth;
		this.movable.setPosition(posX, undefined);
	},

	startAnimation: function(speed) {
		this.stopAnimation();
		this.speed = speed;
		this.animStart = this.pos;

		if(this.speed < 0)
			this.animNext = 1;
		else
			this.animNext = 0;
		if(this.animStart != this.animNext) {
			this.alignClock = new Anim.Clock({ duration: 'forever', target: this });
			this.connect(this.alignClock, 'timeupdate', this.onAlignTick);
			this.alignClock.begin();
		}
		else {
			if(this.value != (this.animNext == 0)) {
				this.value = (this.animNext == 0);
				this.fireEvent('change', this, this.value);
			}
		}
	},

	stopAnimation: function() {
		if(this.alignClock != undefined) {
			this.alignClock.stop();
			this.alignClock = undefined;
		}
	},

	onAlignTick: function(clock, progress, delta) {
		if(delta == 0)
			return;

		var relprogress = -(clock.getTime() * this.speed) / (this.animNext - this.animStart);
		if(relprogress >= 1) {
			this.alignClock.stop();
			this.alignClock = undefined;
			relprogress = 1;
			this.value = (this.animNext == 0);
			this.fireEvent('change', this, this.value);
		}
		relprogress = this.ease.ease(relprogress);
		this.pos = (this.animStart + relprogress * (this.animNext - this.animStart));
		this.updatePos();
	}
	/**#@-*/
},
/** @lends Wn.MenuSwitch#*/
{
	arrangeCore: function(width, height) {
		Wn.MenuSwitch.base.arrangeCore.call(this, width, height);
		this.updatePos();
	}
});

Ui.Container.extend('Wn.SwitchBox', 
/**@lends Wn.SwitchBox#*/
{
	content1: undefined,
	content1Box: undefined,
	content2: undefined,
	content2Box: undefined,
	button: undefined,
	buttonBox: undefined,

	/**
	 * @constructs
	 * @class
	 * @extends Ui.Container
	 */
	constructor: function() {
		this.content1Box = new Ui.LBox();
		this.appendChild(this.content1Box);

		this.buttonBox = new Ui.LBox();
		this.appendChild(this.buttonBox);

		this.content2Box = new Ui.LBox();
		this.appendChild(this.content2Box);
	},

	getButton: function() {
		return this.button;
	},

	setButton: function(button) {
		if(this.button != button) {
			if(this.button != undefined)
				this.buttonBox.remove(this.button);
			this.button = button;
			if(this.button != undefined)
				this.buttonBox.append(this.button);
		}
	},

	getContent1: function() {
		return this.content1;
	},

	setContent1: function(content1) {
		if(this.content1 != content1) {
			if(this.content1 != undefined)
				this.content1Box.remove(this.content1);
			this.content1 = content1;
			if(this.content1 != undefined)
				this.content1Box.append(this.content1);
		}
	},

	getContent2: function() {
		return this.content2;
	},

	setContent2: function(content2) {
		if(this.content2 != content2) {
			if(this.content2 != undefined)
				this.content2Box.remove(this.content2);
			this.content2 = content2;
			if(this.content2 != undefined)
				this.content2Box.append(this.content2);
		}
	},

	getContentWidth: function() {
		return this.getLayoutWidth() - this.buttonBox.getLayoutWidth();
	}
}, 
/**@lends Wn.SwitchBox#*/
{
	measureCore: function(width, height) {
		var bsize = this.buttonBox.measure(0, 0);
		var c1size = this.content1Box.measure(width - bsize.width, height);
		var c2size = this.content2Box.measure(width - bsize.width, height);
		return { width: Math.max(c1size.width, c2size.width) + bsize.width, height: Math.max(c1size.height, Math.max(c2size.height, bsize.height)) };
	},

	arrangeCore: function(width, height) {
		var contentWidth = (width - this.buttonBox.getMeasureWidth());
		this.content1Box.arrange(0, 0, contentWidth, height);
		this.content2Box.arrange(contentWidth + this.buttonBox.getMeasureWidth(), 0, contentWidth, height);
		this.buttonBox.arrange(contentWidth, 0, this.buttonBox.getMeasureWidth(), height);
	}
});

