
Ui.Movable.extend('Wn.CarouselContent', {
	constructor: function(config) {
		this.setInertia(false);
		this.setMoveVertical(false);
		this.setDirectionRelease(true);
		this.setFocusable(false);
		this.setLock(true);
	}
});

Ui.Container.extend('Wn.Carouselable', 
/**@lends Wn.Carouselable#*/
{
//	movable: undefined,
//	box: undefined,
	alignClock: undefined,
	speed: 0,
//	animNext: 0,
//	animStart: 0,
	ease: undefined,
	transition: undefined,
	transitionClock: undefined,
//	autoPlay: undefined,
//	autoTask: undefined,
	position: -1,
	startTime: undefined,
	lastTime: undefined,
	itemWidth: 0,
	itemHeight: 0,
	current: undefined,
	nextItem: undefined,
	nextPosition: undefined,
	delta: 0,
	startDelta: 0,
	endDelta: 0,

	/**
	 * @constructs
	 * @class
	 * @extends Wn.Container
	 */
	constructor: function(config) {
		this.addEvents('change', 'press', 'activate');

		this.setClipToBounds(true);
		this.setFocusable(true);
		this.connect(this.getDrawing(), 'keydown', this.onKeyDown);
		this.connect(this.getDrawing(), 'keyup', this.onKeyUp);

		this.transition = Ui.Transition.create('fade');
		this.ease = Anim.EasingFunction.create({ type: Anim.PowerEase, mode: 'out' });
	},

	getCurrent: function() {
		if(this.position == -1)
			return undefined;
		return this.items[this.getCurrentPosition()];
	},

	getCurrentPosition: function() {
		return this.position;
	},

	setCurrentAt: function(position) {
		console.log(this+'.setCurrentAt('+position+')');
		position = Math.min(this.getChildren().length - 1, Math.max(0, position));
		var child = this.getChildren()[position];

		// if animation in progress, jump to end
		

		// nothing set before = instant show
		if(this.position == -1) {
			child.show();
			this.current = child;
			this.position = position;
			this.connect(this.current, 'down', this.onDown);
			this.connect(this.current, 'move', this.onMove);
			this.connect(this.current, 'up', this.onUp);
			this.current.setLock(false);
			this.updateShow();
		}
		else {
			if(position === this.position+1)
				this.next();
			else if(position === this.position-1)
				this.previous();
			// high jump
			else {
				this.nextItem = this.getChildren()[position];
				this.nextItem.show();
				this.nextPosition = position;
				this.transition.run(this.current, this.nextItem, 0);

				this.transitionClock = new Anim.Clock({ duration: 0.5, scope: this, onTimeupdate: this.onTransitionTick, ease: this.ease });
				this.connect(this.transitionClock, 'complete', this.onTransitionComplete);
				this.transitionClock.begin();
			}
		}
	},

	setCurrent: function(current) {
		for(var i = 0; i < this.getChildren().length; i++) {
			if(this.getChildren()[i].getContent() == current) {
				this.setCurrentAt(i);
				break;
			}
		}
	},

	next: function() {
		if(this.alignClock !== undefined)
			return;
		else if(this.position + 1 < this.getChildren().length)
			this.startAnimation(-1, -1);
	},

	previous: function() {
		if(this.alignClock !== undefined)
			return;
		if(this.position > 0)
			this.startAnimation(1, 1);
	},

	setEase: function(ease) {
		this.ease = Anim.EasingFunction.create(ease);
	},

	append: function(child) {
		var item = new Wn.CarouselContent();
		item.setContent(Ui.Element.create(child));
		item.hide();
		this.appendChild(item);
	},

	remove: function(child) {
		for(var i = 0; i < this.getChildren().length; i++) {
			if(this.getChildren()[i].getChildren()[0] == child) {
				this.getChildren()[i].remove(child);
				this.removeChild(this.getChildren()[i]);
				break;
			}
		}
	},

	insertAt: function(child, pos) {
		var item = new Wn.CarouselContent();
		item.setContent(Ui.Element.create(child));
		item.hide();
		this.insertChildAt(item, pos);
	},
	
	moveAt: function(child, pos) {
		for(var i = 0; i < this.getChildren().length; i++) {
			if(this.getChildren()[i].getChildren()[0] == child) {
				this.moveChildAt(this.getChildren()[i], pos);
				break;
			}
		}
	},

	getLogicalChildren: function() {
		var children = [];
		for(var i = 0; i < this.getChildren().length; i++)
			children.push(this.getChildren()[i].getContent());
		console.log(this+'.getLogicalChildren length: '+children.length);
		return children;
	},

	/**#@+
	* @private
	*/

	onKeyDown: function(event) {
		if(this.getIsDisabled())
			return;
		var key = event.which;

		if((key == 32) || (key == 37) || (key == 39)) {
			event.stopPropagation();
			event.preventDefault();
		}
		if(key == 32)
			this.next();
		else if(key == 37)
			this.previous();
		else if(key == 39)
			this.next();
	},

	onKeyUp: function(event) {
		if(this.getIsDisabled())
			return;
		// Enter = activate
		if(event.which == 13) {
			event.stopPropagation();
			event.preventDefault();
			this.fireEvent('activate', this);
		}
	},

	onMove: function(movable) {
//		console.log('onMove delta: '+(movable.getPositionX() / movable.getLayoutWidth() )+', pos: '+this.position+'/'+this.getChildren().length);

		this.disconnect(movable, 'move', this.onMove);
		
		var delta = movable.getPositionX() / movable.getLayoutWidth();
		if(delta < -1) {
			movable.setPosition(-movable.getLayoutWidth(), undefined);
			delta = -1;
		}
		else if(delta > 1) {
			movable.setPosition(movable.getLayoutWidth(), undefined);
			delta = 1;
		}
		if((this.position == 0) && (delta > 0)) {
			movable.setPosition(0, undefined);
			delta = 0;
		}
		else if((this.position == (this.getChildren().length-1)) && (delta < 0)) {
			movable.setPosition(0, undefined);
			delta = 0;
		}
		this.delta = delta;
		this.updateShow();

		this.connect(movable, 'move', this.onMove);

/*		if(this.box.getChildren().length < 2)
			movable.setPosition(0, 0);
		else {
			var x = undefined;
			if(movable.getPositionX() > 0)
				x = 0;
			if(movable.getPositionX() < -(this.getLayoutWidth() * (this.box.getChildren().length - 1)))
				x = -(this.getLayoutWidth() * (this.box.getChildren().length - 1));
			movable.setPosition(x, 0);
		}
		this.updateShow();*/
	},

	updateShow: function() {
		console.log('updateShow');
		var prev = undefined;
		var next = undefined;
		var w = this.getLayoutWidth();
		if(this.position > 0)
			prev = this.getChildren()[this.position - 1];
		if(this.position < this.getChildren().length-1)
			next = this.getChildren()[this.position + 1];

		this.current.setPosition(this.delta*w);

		if(this.delta == 0) {
			if(prev !== undefined)
				prev.hide();
			if(next !== undefined)
				next.hide();
		}
		else if(this.delta > 0) {
			if(next !== undefined)
				next.hide();
			if(prev !== undefined) {
				prev.show();
				prev.setPosition((this.delta-1)*w);
			}
		}
		else {
			if(prev !== undefined)
				prev.hide();
			if(next !== undefined) {
				next.show();
				next.setPosition((this.delta+1)*w);
			}
		}
//		if(prev !== undefined)
//			prev.arrange(0, 0, w, this.getLayoutHeight());
//		if(this.current !== undefined)
//			this.current.arrange(0, 0, w, this.getLayoutHeight());
//		if(next !== undefined)
//			next.arrange(0, 0, w, this.getLayoutHeight());
		
	},

	onDown: function(movable) {
		this.startTime = (new Date().getTime())/1000;
		this.stopAnimation();
	},

	onUp: function(movable, speedX, speedY, deltaX, deltaY, cumulMove, abort) {
		// test if it is a press
		var deltaTime = ((new Date().getTime())/1000) - this.startTime;
		if(!abort && (deltaTime < 0.25) && (cumulMove < 10)) {
			this.fireEvent('press', this);
			this.focus();
			// test for activate signal
			var currentTime = (new Date().getTime())/1000;
			if((this.lastTime != undefined) && (currentTime - this.lastTime < 0.25))
				this.fireEvent('activate', this);
			this.lastTime = currentTime;
		}
		var next = undefined;
		// if too slow just re-align the content
		if(Math.abs(speedX) < 100) {
			console.log('too slow');
			if(this.delta > 0) {
				if(this.delta > 0.5) {
					speedX = 400;
					next = 1;
				}
				else {
					speedX = -400;
					next = 0;
				}
			}
			else {
				if(this.delta < -0.5) {
					speedX = -400;
					next = -1;
				}
				else {
					speedX = 400;
					next = 0;
				}
			}
		}
		// if slow set a minimun speed
		else if(Math.abs(speedX) < 800) {
			if(speedX < 0)
				speedX = -800;
			else
				speedX = 800;
		}
		if(speedX != 0)
			this.startAnimation(speedX / this.getLayoutWidth(), next);
	},

	onChange: function() {

		if(this.current !== undefined) {
			this.disconnect(this.current, 'down', this.onDown);
			this.disconnect(this.current, 'move', this.onMove);
			this.disconnect(this.current, 'up', this.onUp);
		}
		// next
		if(this.delta < 0) {
			if(this.position + 1 < this.getChildren().length) {
				this.position++;
				this.current = this.getChildren()[this.position];
			}
			else {
				this.position = -1;
				this.current = undefined;
			}
		}
		// previous
		else if(this.delta > 0) {
			if(this.position > 0) {
				this.position--;
				this.current = this.getChildren()[this.position];
			}
			else {
				this.position = -1;
				this.current = undefined;
			}
		}
		this.delta = 0;

		console.log('onChange delta: '+this.delta+', new: '+this.current+', pos: '+this.position);

		if(this.current !== undefined) {
			this.connect(this.current, 'down', this.onDown);
			this.connect(this.current, 'move', this.onMove);
			this.connect(this.current, 'up', this.onUp);
			this.updateShow();
			this.current.setLock(false);
		}
		this.fireEvent('change', this, this.getCurrentPosition());
	},

	onAlignTick: function(clock, progress, delta) {
		if(delta == 0)
			return;

		var relprogress = clock.getTime() * Math.abs(this.speed);
		if(relprogress >= 1) {
			this.alignClock.stop();
			this.alignClock = undefined;
			relprogress = 1;
		}
		relprogress = this.ease.ease(relprogress);
		this.delta = this.startDelta + relprogress * (this.endDelta - this.startDelta);
		if(this.alignClock == undefined)
			this.onChange();
		else {
			this.disconnect(this.current, 'move', this.onMove);
			this.updateShow();
			this.connect(this.current, 'move', this.onMove);
		}
	},

	startAnimation: function(speed, next) {
		this.stopAnimation();
		this.speed = speed;
		this.startDelta = this.delta;

		if(next === undefined) {
			if(this.speed < 0)
				this.endDelta = -1;
			else
				this.endDelta = 1;
		}
		else
			this.endDelta = next;

		console.log('startAnimation('+speed+') start: '+this.delta+', end: '+this.endDelta);

		if(this.startDelta != this.endDelta) {
			this.alignClock = new Anim.Clock({ duration: 'forever', scope: this, target: this, onTimeupdate: this.onAlignTick });
			this.alignClock.begin();
		}
	},

	stopAnimation: function() {
		if(this.alignClock != undefined) {
			this.alignClock.stop();
			this.alignClock = undefined;
		}
	},

	onTransitionTick: function(clock, progress) {
		this.transition.run(this.current, this.nextItem, progress);
	},

	onTransitionComplete: function(clock) {
		this.transitionClock = undefined;

		if(this.current != undefined)
			this.current.hide();
		this.current = this.nextItem;
		this.position = this.nextPosition;
		
		this.delta = 0;
		this.position = this.nextPosition;
		this.updateShow();
	}
	/**#@-*/
}, 
/**@lends Wn.Carouselable#*/
{
	measureCore: function(width, height) {
		var minWidth = 0;
		var minHeight = 0;
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var size = item.measure(width, height);
			if(size.width > minWidth)
				minWidth = size.width;
			if(size.height > minHeight)
				minHeight = size.height;
		}
		console.log('measure => '+minWidth+' x '+minHeight);
		return { width: minWidth, height: minHeight };
	},

	arrangeCore: function(width, height) {
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			item.arrange(0, 0, width, height);
		}
	}
});

Wn.Carouselable.extend('Wn.Carousel', {
	constructor: function(config) {
		
	}
});
