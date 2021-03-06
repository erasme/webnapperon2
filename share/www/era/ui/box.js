Ui.Container.extend('Ui.Box', 
/**@lends Ui.Box#*/
{
	paddingTop: 0,
	paddingBottom: 0,
	paddingLeft: 0,
	paddingRight: 0,
	uniform: false,
	spacing: 0,
	star: 0,
	vertical: true,

	/**
	 * @constructs
	 * @class
	 * @extends Ui.Container
	 * @param {Number} [config.padding] Set the same padding for all borders
	 * @param {Number} [config.paddingTop]
	 * @param {Number} [config.paddingBottom]
	 * @param {Number} [config.paddingLeft]
	 * @param {Number} [config.paddingRight]
	 * @param {Boolean} [config.uniform] Whether or not the size of the container's children is uniform (will fit to the biggest element)
	 * @param {String}  [config.orientation] A Box can be either "vertical" (VBox) or "horizontal" (HBox). Very usefull for mobil device. 
	 */
	constructor: function(config) {
	},

	setContent: function(content) {
		while(this.getFirstChild() !== undefined)
			this.removeChild(this.getFirstChild());
		if((content !== undefined) && (typeof(content) === 'object')) {
			if(content.constructor == Array) {
				for(var i = 0; i < content.length; i++)
					this.append(content[i]);
			}
			else
				this.append(content);
		}
	},

	/**
	 * Get the layout orientation.
	 * Possible values: [vertical|horizontal|
	 */
	getOrientation: function() {
		if(this.vertical)
			return 'vertical';
		else
			return 'horizontal';
	},

	/**
	 * Set the layout orientation.
	 * Possible values: [vertical|horizontal]
	 */
	setOrientation: function(orientation) {
		var vertical = true;
		if(orientation !== 'vertical')
			vertical = false;
		if(this.vertical !== vertical) {
			this.vertical = vertical;
			this.invalidateMeasure();
		}
	},

	/**
	 * Set the padding for all borders
	 */
	setPadding: function(padding) {
		this.setPaddingTop(padding);
		this.setPaddingBottom(padding);
		this.setPaddingLeft(padding);
		this.setPaddingRight(padding);
	},

	/**
	 * Return the current element top padding
	 */
	getPaddingTop: function() {
		return this.paddingTop;
	},

	/*
	 * Set the current element top padding
	 */
	setPaddingTop: function(paddingTop) {
		if(this.paddingTop != paddingTop) {
			this.paddingTop = paddingTop;
			this.invalidateMeasure();
		}
	},

	/**
	 * Return the current element bottom padding
	 */
	getPaddingBottom: function() {
		return this.paddingBottom;
	},

	/**
	 * Set the current element bottom padding
	 */
	setPaddingBottom: function(paddingBottom) {
		if(this.paddingBottom != paddingBottom) {
			this.paddingBottom = paddingBottom;
			this.invalidateMeasure();
		}
	},

	/**
	 * Return the current element left padding
	 */
	getPaddingLeft: function() {
		return this.paddingLeft;
	},

	/**
	 * Set the current element left padding
	 */
	setPaddingLeft: function(paddingLeft) {
		if(this.paddingLeft != paddingLeft) {
			this.paddingLeft = paddingLeft;
			this.invalidateMeasure();
		}
	},

	/**
	 * Return the current element right padding
	 */
	getPaddingRight: function() {
		return this.paddingRight;
	},

	/**
	 * Set the current element right padding
	 */
	setPaddingRight: function(paddingRight) {
		if(this.paddingRight != paddingRight) {
			this.paddingRight = paddingRight;
			this.invalidateMeasure();
		}
	},

	/**
	 * True if all children will be arrange to have the
	 * same width
	 */
	getUniform: function() {
		return this.uniform;
	},

	/**
	 * Set true to force children arrangement to have the
	 * same width
	 */
	setUniform: function(uniform) {
		if(this.uniform != uniform) {
			this.uniform = uniform;
			this.invalidateMeasure();
		}
	},

	/**
	 * Return the space inserted between each
	 * child
	 */
	getSpacing: function() {
		return this.spacing;
	},

	/**
	 * Set the space value inserted between each child
	 */
	setSpacing: function(spacing) {
		if(this.spacing != spacing) {
			this.spacing = spacing;
			this.invalidateMeasure();
		}
	},

	/**
	 * Append a child at the end of the box
	 */
	append: function(child, resizable) {
		if(resizable !== undefined)
			Ui.Box.setResizable(child, resizable === true);
		this.appendChild(child);
	},

	/**
	 * Append a child at the begining of the box
	 */
	prepend: function(child, resizable) {
		if(resizable !== undefined)
			Ui.Box.setResizable(child, resizable === true);
		this.prependChild(child);
	},

	/**
	 * Insert a child element in the current box at the given position
	 */
	insertAt: function(child, position, resizable) {
		if(resizable !== undefined)
			Ui.Box.setResizable(child, resizable === true);
		this.insertChildAt(child, position);
	},
	
	/**
	 * Move a child element in the current box at the given position
	 */
	moveAt: function(child, position) {
		this.moveChildAt(child, position);
	},

	/**
	 * Remove a child from the box
	 */
	remove: function(child) {
		this.removeChild(child);
	},

	/**#@+
	* @private
	*/
	measureUniform: function(width, height) {
		var constraintSize = this.vertical?height:width;
		var constraintOpSize = this.vertical?width:height;

		constraintSize -= this.spacing * (this.getChildren().length - 1);
		var childConstraintSize = constraintSize / this.getChildren().length;
		var countResizable = 0;
		var uniformSize = 0;
		var minOpSize = 0;

		var loop = true;
		while(loop) {
			for(var i = 0; i < this.getChildren().length; i++) {
				var child = this.getChildren()[i];
				if(Ui.Box.getResizable(child))
					countResizable++;
				var size;
				if(this.vertical)
					size = child.measure(constraintOpSize, childConstraintSize);
				else
					size = child.measure(childConstraintSize, constraintOpSize);
				if((this.vertical?size.width:size.height) > minOpSize)
					minOpSize = this.vertical?size.width:size.height;
				if((this.vertical?size.height:size.width) > uniformSize)
					uniformSize = this.vertical?size.height:size.width;
			}
			if((minOpSize > constraintOpSize) || (uniformSize > childConstraintSize)) {
				if(uniformSize > childConstraintSize)
					childConstraintSize = uniformSize;
				constraintOpSize = minOpSize;
				minOpSize = 0;
				uniformSize = 0;
				countResizable = 0;
			}
			else
				loop = false;
		}
		if((countResizable > 0) && (uniformSize * this.getChildren().length < constraintSize))
			uniformSize = Math.floor(constraintSize / this.getChildren().length);

		this.uniformSize = uniformSize;
		var minSize = this.uniformSize * this.getChildren().length;
		minSize += this.spacing * (this.getChildren().length - 1);

		if(this.vertical)
			return { width: minOpSize, height: minSize };
		else
			return { width: minSize, height: minOpSize };
	},

	measureNonUniformVertical: function(width, height) {
		var i; var child; var size;
		var constraintWidth = width;
		var constraintHeight = height;
		constraintHeight -= this.spacing * (this.getChildren().length - 1);

		var countResizable;
		var minWidth;
		var minHeight;
		var loop = true;
		var star = 0;

		while(loop) {
			countResizable = 0;
			minWidth = 0;
			minHeight = 0;

			// handle not resizable
			for(i = 0; i < this.getChildren().length; i++) {
				child = this.getChildren()[i];
				if(!Ui.Box.getResizable(child)) {
					size = child.measure(constraintWidth, 0);
					if(size.width > minWidth)
						minWidth = size.width;
						minHeight += size.height;
				}
				else {
					child.boxStarDone = false;
					countResizable++;
				}
			}
			var resizableMinHeight = 0;
			if(countResizable > 0) {
				var remainHeight = constraintHeight - minHeight;
				var starFound = true;
				star = remainHeight / countResizable;
				do {
					resizableMinHeight = 0;
					starFound = true;
					for(i = 0; i < this.getChildren().length; i++) {
						child = this.getChildren()[i];
						if(Ui.Box.getResizable(child)) {
							if(!child.boxStarDone) {
								size = child.measure(constraintWidth, star);
								if(size.width > minWidth)
									minWidth = size.width;
								if(size.height > star) {
									child.boxStarDone = true;
									starFound = false;
									remainHeight -= size.height;
									minHeight += size.height;
									countResizable--;
									star = remainHeight / countResizable;
									break;
								}
								else
									resizableMinHeight += size.height;
							}
						}
					}
				} while(!starFound);
			}
			if(minWidth > constraintWidth)
				constraintWidth = minWidth;
			else
				loop = false;
		}

		minHeight += this.spacing * (this.getChildren().length - 1);
		if(countResizable > 0) {
			minHeight += resizableMinHeight;
			this.star = star;
		}
		else
			this.star = 0;
		return { width: minWidth, height: minHeight };
	},

	measureNonUniformHorizontal: function(width, height) {
		var i; var child; var size;
		var constraintWidth = width;
		var constraintHeight = height;
		constraintWidth -= this.spacing * (this.getChildren().length - 1);

		var countResizable;
		var minWidth;
		var minHeight;
		var loop = true;
		var star = 0;

		while(loop) {
			countResizable = 0;
			minWidth = 0;
			minHeight = 0;

			// handle not resizable
			for(i = 0; i < this.getChildren().length; i++) {
				child = this.getChildren()[i];
				if(!Ui.Box.getResizable(child)) {
					size = child.measure(0, constraintHeight);
					if(size.height > minHeight)
						minHeight = size.height;
					minWidth += size.width;
				}
				else {
					child.boxStarDone = false;
					countResizable++;
				}
			}
			var resizableMinWidth = 0;
			if(countResizable > 0) {
				var remainWidth = constraintWidth - minWidth;
				var starFound = true;
				star = remainWidth / countResizable;
				do {
					resizableMinWidth = 0;
					starFound = true;
					for(i = 0; i < this.getChildren().length; i++) {
						child = this.getChildren()[i];
						if(Ui.Box.getResizable(child)) {
							if(!child.boxStarDone) {
								size = child.measure(star, constraintHeight);
								if(size.height > minHeight)
									minHeight = size.height;
								if(size.width > star) {
									child.boxStarDone = true;
									starFound = false;
									remainWidth -= size.width;
									minWidth += size.width;
									countResizable--;
									star = remainWidth / countResizable;
									break;
								}
								else
									resizableMinWidth += size.width;
							}
						}
					}
				} while(!starFound);
			}
			if(minHeight > constraintHeight)
				constraintHeight = minHeight;
			else
				loop = false;
		}

		minWidth += this.spacing * (this.getChildren().length - 1);
		if(countResizable > 0) {
			minWidth += resizableMinWidth;
			this.star = star;
		}
		else
			this.star = 0;
		return { width: minWidth, height: minHeight };
	}
	/**#@-*/
}, 
/**@lends Ui.Box#*/
{
	measureCore: function(width, height) {
		var left = this.getPaddingLeft();
		var right = this.getPaddingRight();
		var top = this.getPaddingTop();
		var bottom = this.getPaddingBottom();
		var constraintWidth = Math.max(0, width - (left + right));
		var constraintHeight = Math.max(0, height - (top + bottom));
		var size;

		if(this.uniform)
			size = this.measureUniform(constraintWidth, constraintHeight);
		else {
			if(this.vertical)
				size = this.measureNonUniformVertical(constraintWidth, constraintHeight);
			else
				size = this.measureNonUniformHorizontal(constraintWidth, constraintHeight);
		}
		size.width += left + right;
		size.height += top + bottom;
		return size;
	},

	arrangeCore: function(width, height) {
		var left = this.paddingLeft;
		var right = this.paddingRight;
		var top = this.paddingTop;
		var bottom = this.paddingBottom;
		width -= left + right;
		height -= top + bottom;

		var offset = this.vertical?top:left;

		var countResizable = 0;
		var minSize = 0;
		var maxSize = 0;
		var count = this.getChildren().length;
		var countVisible = 0;

		for(var i = 0; i < count; i++) {
			var child = this.getChildren()[i];
			var size = this.vertical?child.getMeasureHeight():child.getMeasureWidth();
			if(Ui.Box.getResizable(child)) {
				countVisible++;
				countResizable++;
				child.boxStarDone = false;
			}
			else {
				if(size > 0)
					countVisible++;
				minSize += size;
			}
			if(size > maxSize)
				maxSize = size;
		}
		minSize += Math.max(0, countVisible-1) * this.spacing;

		var star = 0;
		var uniformSize = 0;
		if(countResizable > 0) {
			if(this.uniform)
				uniformSize = ((this.vertical?height:width)-(this.spacing*(countVisible-1)))/countVisible;
			else {
				var remainSize = (this.vertical?height:width) - minSize;
				var starFound = true;
				star = remainSize / countResizable;
				do {
					resizableMinSize = 0;
					starFound = true;
					for(i = 0; i < count; i++) {
						child = this.getChildren()[i];
						if(Ui.Box.getResizable(child)) {
							var size = this.vertical?child.getMeasureHeight():child.getMeasureWidth();
							if(!child.boxStarDone) {
								if(size > star) {
									child.boxStarDone = true;
									starFound = false;
									remainSize -= size;
									minSize += size;
									countResizable--;
									star = remainSize / countResizable;
									break;
								}
							}
						}
					}
				} while(!starFound);
			}
		}
		else {
			if(this.uniform)
				uniformSize = maxSize
		}

		var isFirst = true;
		for(var i = 0; i < count; i++) {
			var child = this.getChildren()[i];
			var size = this.vertical?child.getMeasureHeight():child.getMeasureWidth();

			if(this.uniform) {
				if(isFirst)
					isFirst = false;
				else
					offset += this.spacing;
				if(this.vertical)
					child.arrange(left, offset, width, uniformSize);
				else
					child.arrange(offset, top, uniformSize, height);
				offset += uniformSize;
			}
			else {
				if((Ui.Box.getResizable(child)) && ((this.vertical?child.getMeasureHeight():child.getMeasureWidth()) < this.star)) {
					if(isFirst)
						isFirst = false;
					else
						offset += this.spacing;
					if(this.vertical)
						child.arrange(left, offset, width, star);
					else
						child.arrange(offset, top, star, height);
					offset += star;
				}
				else if(size > 0) {

					if(isFirst)
						isFirst = false;
					else
						offset += this.spacing;
					
					if(this.vertical) {
						child.arrange(left, offset, width, child.getMeasureHeight());
						offset += child.getMeasureHeight();
					}
					else {
						child.arrange(offset, top, child.getMeasureWidth(), height);
						offset += child.getMeasureWidth();
					}
				}
			}
		}
	}
}, {
	getResizable: function(child) {
		return child['Ui.Box.resizable']?true:false;
	},

	setResizable: function(child, resizable) {
		if(Ui.Box.getResizable(child) !== resizable) {
			child['Ui.Box.resizable'] = resizable;
			child.invalidateMeasure();
		}
	}
});


Ui.Box.extend('Ui.VBox', 
/**@lends Ui.VBox#*/
{
	/**
	*	@constructs
	*	@class
	*	@extends Ui.Box
	*/
	constructor: function(config) {
		this.setOrientation('vertical');
	}
});

Ui.Box.extend('Ui.HBox', 
/**@lends Ui.HBox#*/
{
	/**
	*	@constructs
	*	@class
	*	@extends Ui.Box
	*/
	constructor: function(config) {
		this.setOrientation('horizontal');
	}
});
