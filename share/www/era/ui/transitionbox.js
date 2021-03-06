Ui.LBox.extend('Ui.TransitionBox', 
/**@lends Ui.TransitionBox#*/
{
	transition: undefined,
	duration: 0.5,
	ease: undefined,
	position: -1,
	transitionClock: undefined,
	current: undefined,
	next: undefined,
	replaceMode: false,
	
	/**
     * @constructs
	 * @class Container that displays only one element at a time and allows differents kind of transition between elements
     * @extends Ui.LBox
     * @param {number} [config.duration] Transition duration in second (can be float)
	 * @param {string} [config.ease] Transition ease behaviour [linear|bounce|elastic]
	 * @param {string} [config.transition] Transition type [slide|fade|flip]
	 */
	constructor: function(config) {
		this.addEvents('change');

		this.connect(this, 'load', this.onTransitionBoxLoad);
		this.connect(this, 'unload', this.onTransitionBoxUnload);

		this.setClipToBounds(true);
		this.setTransition('fade');
	},

	getPosition: function() {
		return this.position;
	},

	setDuration: function(duration) {
		this.duration = duration;
	},

	setEase: function(ease) {
		this.ease = Anim.EasingFunction.create(ease);
	},

	/**
	 * @param {Ui.Transition|object|string} transition Type of transition use 
	 * @example
	 * t = new TransitionBox();
	 * t.setTransition('slide');
	 * t.setTransition({ type: Ui.Slide, direction: 'left' });
	 * t.setTransition(new Ui.Transition({ type: Ui.Slide, direction: 'left' }));
	 */
	setTransition: function(transition) {
		this.transition = Ui.Transition.create(transition);
	},

	setCurrent: function(child) {
		var pos = this.getChildPosition(child);
		if(pos != -1)
			this.setCurrentAt(pos);
	},

	setCurrentAt: function(position) {
		if(this.position != position) {
			if(this.next !== undefined) {
				if(this.current !== undefined) {
					this.current.hide();
					this.current = this.next;
					this.current.show();
					this.next = undefined;
				}
			}
			if(this.transitionClock !== undefined) {
				this.disconnect(this.transitionClock, 'complete', this.onTransitionComplete);
				this.transitionClock.stop();
			}

			if(this.position != -1)
				this.current = this.getChildren()[this.position];
			else
				this.current = undefined;

			this.next = this.getChildren()[position];
			this.next.show();

			// IE7 and 8 are too slow, drop the transition
			if(navigator.isIE7 || navigator.isIE8) {
				this.position = position;
				this.transition.run(this.current, this.next, 1);
				this.onTransitionComplete();
			}
			else {
				this.transition.run(this.current, this.next, 0);

				this.transitionClock = new Anim.Clock({ duration: this.duration, ease: this.ease });
				this.connect(this.transitionClock, 'timeupdate', this.onTransitionTick);
				this.connect(this.transitionClock, 'complete', this.onTransitionComplete);
				this.transitionClock.begin();

				this.position = position;
			}
		}
	},

	getCurrent: function() {
		if(this.position == -1)
			return undefined;
		else
			return this.getChildren()[this.position].getChildren()[0];
	},

	replaceContent: function(content) {
		this.replaceMode = true;
		this.append(content);
		this.setCurrent(content);
	},

	/**#@+
	 * @private
	 */
	onTransitionBoxLoad: function() {
	},

	onTransitionBoxUnload: function() {
		if(this.transitionClock !== undefined) {
			this.transitionClock.stop();
			this.transitionClock = undefined;
		}
	},

	onTransitionTick: function(clock, progress) {
		this.progress = progress;
		this.transition.run(this.current, this.next, progress);
	},

	onTransitionComplete: function(clock) {
		var i;
		this.transitionClock = undefined;
		var current = this.next;

		if(this.current !== undefined)
			this.current.hide();
		this.next = undefined;
		if(this.replaceMode) {
			this.replaceMode = false;

			var removeList = [];
			for(i = 0; i < this.getChildren().length; i++) {
				var item = this.getChildren()[i];
				if(item !== current)
					removeList.push(item.getFirstChild());
			}
			for(i = 0; i < removeList.length; i++)
				this.remove(removeList[i]);
		}
		this.fireEvent('change', this, this.position);
	}
	/**#@-*/
}, {
	arrangeCore: function(width, height) {
		Ui.TransitionBox.base.arrangeCore.call(this, width, height);
		// update the transition if needed
		if(this.transitionClock !== undefined)
			this.transition.run(this.current, this.next, this.transitionClock.getProgress());
	},

	append: function(child) {
		var content = new Ui.TransitionBoxContent();
		content.append(child);
		content.hide();
		Ui.TransitionBox.base.append.call(this, content);
	},

	prepend: function(child) {
		if(this.position !== -1)
			this.position++;
		var content = new Ui.TransitionBoxContent();
		content.append(child);
		content.hide();
		Ui.TransitionBox.base.prepend.call(this, this.position);
	},

	remove: function(child) {
		for(var i = 0; i < this.getChildren().length; i++) {
			if(this.getChildren()[i].getFirstChild() == child) {
				if(i < this.position)
					this.position--;
				else if(i == this.position)
					this.position = -1;
				this.getChildren()[i].remove(child);
				Ui.TransitionBox.base.remove.call(this, this.getChildren()[i]);
				break;
			}
		}
	},

	getChildPosition: function(child) {
		for(var i = 0; i < this.getChildren().length; i++) {
			if(this.getChildren()[i].getChildren()[0] == child)
				return i;
		}
		return -1;
	}
});

Ui.LBox.extend('Ui.TransitionBoxContent', {});

