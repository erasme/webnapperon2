Core.Object.extend('Anim.Clock', 
/**@lends Anim.Clock#*/
{
	/**
	 * Fires when an anim is complete
	 * @name Anim.Clock#complete
	 * @event
	 * @param {Anim.Clock} clock The animclock itself
	 */
	/**
	 * Fires on animation update
	 * @name Anim.Clock#timeupdate
	 * @event
	 * @param {Anim.Clock} clock The animclock itself
	 * @param {number} progress Progression's level of the animation (between 0 and 1)
	 * @param {number} delta Time (in second) between two update calls.
	 */
	animation: true,
	parent: undefined,
	time: undefined,
	iteration: undefined,
	progress: undefined,
	isActive: false,
	globalTime: 0,
	startTime: 0,
	lastTick: 0,
	beginTime: 0,
	isPaused: false,
	speed: 1,
	// [forever|automatic|nbsec]
	duration: 'forever',
	// [none|active|paused|resumed|stopped|none]
	pendingState: 'none',

	autoReverse: false,
	// [forever|count]
	repeat: 1,
	target: undefined,
	ease: undefined,

	/**
    *   @constructs
	*	@class
    *   @extends Core.Object
	*	@param config.parent
	*	@param config.beginTime
	*	@param config.autoReverse
	*	@param config.duration
	*	@param config.repeat
	*	@param config.speed
	*	@param config.target
	*	@param config.scope
	*	@param config.ease
	*	@param config.duration
	*/
	constructor: function(config) {
		this.addEvents('complete', 'timeupdate');
	},

	setAnimation: function(animation) {
		this.animation = animation;
	},

	setRepeat: function(repeat) {
		this.repeat = repeat;
	},

	setSpeed: function(speed) {
		this.speed = speed;
	},
	
	setAutoReverse: function(autoReverse) {
		this.autoReverse = autoReverse;
	},

	setBeginTime: function(beginTime) {
		this.beginTime = beginTime;
	},

	setEase: function(ease) {
		this.ease = Anim.EasingFunction.create(ease);
	},

	setTarget: function(target) {
		this.target = target;
	},

	setDuration: function(duration) {
		if(duration == 'automatic')
			this.duration = 'forever';
		else
			this.duration = duration;
	},

	setParent: function(parent) {
		this.parent = parent;
	},

	getParent: function() {
		return this.parent;
	},

	getGlobalTime: function() {
		return this.globalTime + (this.lastTick - this.startTime) * this.speed;
	},

	getIsActive: function() {
		return this.isActive;
	},

	getTime: function() {
		return this.time;
	},

	getIteration: function() {
		return this.iteration;
	},

	getProgress: function() {
		return this.progress;
	},

	begin: function() {
		// if this clock is the root clock, add to the TimeManager
		if(this.parent === undefined) {
			if(this.animation)
				Anim.AnimationManager.current.add(this);
			else
				Anim.TimeManager.current.add(this);
		}
		else if(this.scope === undefined)
			this.scope = this.parent.scope;

		this.pendingState = 'active';
		// attach the clock to an element
		if((this.target !== undefined) && (this.target.setAnimClock !== undefined))
			this.target.setAnimClock(this);
	},

	pause: function() {
		this.pendingState = 'paused';
	},

	resume: function() {
		this.pendingState = 'resumed';
	},

	stop: function() {
		this.pendingState = 'stopped';
	},

	onComplete: function() {
		// if the current clock is the root clock, remove it from the timemanager
		if(this.parent === undefined) {
			if(this.animation)
				Anim.AnimationManager.current.remove(this);
			else
				Anim.TimeManager.current.remove(this);
		}
		this.fireEvent('complete');
	},

	onTimeUpdate: function(deltaTick) {
		var progress = this.getProgress();
		if(this.ease !== undefined)
			progress = this.ease.ease(progress);
		this.fireEvent('timeupdate', this, progress, deltaTick);
	},

	update: function(parentGlobalTime) {
		var state;
		do {
			state = this.pendingState;
			this.pendingState = 'none';
			
			// handle pending state
			if(state === 'none') {
				if(this.isActive && !this.isPaused) {
					// update time
					var deltaTick = parentGlobalTime - this.lastTick;
					this.lastTick = parentGlobalTime;
					var globalTime = this.getGlobalTime();
					globalTime -= this.beginTime;

					if(globalTime >= 0) {
						if((this.duration !== 'forever') && (this.duration !== 'automatic')) {
							var iteration = globalTime / this.duration;
							var iterationRounded = Math.floor(iteration+1);
							var time = globalTime % this.duration;

							if(this.autoReverse) {
								if((iterationRounded & 1) === 0)
									time = this.duration - time;
								iteration /= 2;
								iterationRounded = Math.floor(iteration+1);
							}
							if(this.repeat == 'forever') {
								this.iteration = iterationRounded;
								this.time = time;
								this.progress = time / this.duration;
								this.onTimeUpdate(deltaTick);
							}
							else {
								if(iteration >= this.repeat) {
									// goto to stopped state
									this.pendingState = 'stopped';
									// force last anim state
									this.iteration = this.repeat;
									this.time = this.duration;
									if(this.autoReverse)
										this.progress = 0;
									else
										this.progress = 1;
									this.onTimeUpdate(0);
								}
								else {
									this.iteration = iterationRounded;
									this.time = time;
									this.progress = time / this.duration;
									this.onTimeUpdate(deltaTick);
								}
							}
						}
						else {
							this.time = globalTime;
							this.progress = 0;
							this.iteration = undefined;
							this.onTimeUpdate(deltaTick);
						}
					}
				}
			}
			else if(state == 'active') {
				if(!this.isActive) {
					this.isActive = true;
					this.globalTime = 0;
					this.startTime = parentGlobalTime;
					this.lastTick = this.startTime;
					if(this.beginTime > 0) {
						this.time = undefined;
						this.progress = undefined;
						this.iteration = undefined;
					}
					else {
						this.time = 0;
						this.progress = 0;
						this.iteration = 1;
						this.onTimeUpdate(0);
					}
				}
			}
			else if(state == 'paused') {
				if(!this.isPaused && this.isActive) {
					this.isPaused = true;
					this.globalTime = this.getGlobalTime();
					this.startTime = 0;
					this.lastTick = 0;
				}
			}
			else if(state == 'resumed') {
				if(this.isPaused && this.isActive) {
					this.isPaused = false;
					this.startTime = parentGlobalTime;
					this.lastTick = parentGlobalTime;
				}
			}
			else if(state == 'stopped') {
				if(this.isActive) {
					this.progress = undefined;
					this.time = undefined;
					this.iteration = undefined;
					this.isActive = false;
				}
			}
		} while(this.pendingState != 'none');
		// check if clock completed (= root and no more active)
		if((this.parent === undefined) && !this.isActive)
			this.onComplete();
	}
});
