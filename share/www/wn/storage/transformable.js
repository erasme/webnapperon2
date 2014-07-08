/*
Ui.Transformable.extend('Storage.TransformableContent', {
	scroll: undefined,

	constructor: function(config) {
		this.scroll = config.scroll;
		delete(config.scroll);

		this.connect(this.scroll, 'scroll', function() {
			this.translateX = -this.scroll.getOffsetX();
			this.translateY = -this.scroll.getOffsetY();
		});

		this.setAllowTranslate(false);
		this.setAllowRotate(false);
		this.setMinScale(1);
		this.setMaxScale(4);
		this.contentBox.setTransformOrigin(0, 0);
	}
}, {
	onContentTransform: function() {
		//Storage.TransformableContent.base.onContentTransform.apply(this, arguments);
		this.contentBox.setTransform(Ui.Matrix.createScale(this.getScale(), this.getScale()));
		// apply the translation part to the scrolling area
		// this is possible because the 2D transform change the scrollWidth and scrollHeight
		// but be carefull, 3D transform dont change the layout and the scroll size
		// will not be update so this will not work.
		// (-webkit-backface-visibility: hidden also break this).
		this.scroll.setOffset(-this.getTranslateX(), -this.getTranslateY(), true);
		this.scroll.updateOffset();

//		this.translateX = -this.scroll.getOffsetX();
//		this.translateY = -this.scroll.getOffsetY();

		console.log('onContentTransform ofsX: '+(-this.getTranslateX())+', ofsY: '+(-this.getTranslateY()));

//		var scale = this.getScale();
//		console.log(this+'.onContentTransform '+(this.getLayoutWidth()*scale)+'x'+(this.getLayoutHeight()*scale));
//		this.fireEvent('size', this.getLayoutWidth()*scale, this.getLayoutHeight()*scale);
//		this.fireEvent('scroll', this);
	}
});*/

Ui.ScrollingArea.extend('Storage.Transformable', {
	constructor: function(config) {
		this.contentBox.setMaxScale(4);
	}
});

/*Ui.Transformable.extend('Storage.Transformable', {
	constructor: function(config) {
		this.setClipToBounds(true);
		this.setAllowTranslate(true);
		this.setAllowRotate(false);
		this.setMinScale(1);
		this.setMaxScale(4);
	}
});*/

/*
Ui.Transformable.extend('Storage.Transformable', {
	scroll: undefined,
	transformableContent: undefined,

	constructor: function(config) {
		this.setTransformOrigin(0, 0);
		this.setAllowTranslate(true);
		this.setAllowRotate(false);
		this.setMinScale(1);
		this.setMaxScale(4);

		this.transformableContent = new Storage.TransformableContent();
		this.scroll.setContent(this.transformableContent);

//		this.scroll.contentBox.getDrawing().style.msContentZooming = 'zoom';

		this.connect(this.scroll, 'scroll', this.onScroll);
		Storage.Transformable.base.setContent.call(this, this.scroll);
	},
	
	onScroll: function(scroll, x, y) {
//		console.log('onScroll '+x+','+y);
		this.translateX = -x;
		this.translateY = -y;
	}

}, {
	setContent: function(content) {
		this.transformableContent.setContent(content);
//		content.getDrawing().style.touchAction = 'pinch-zoom pan-x pan-y';
//		content.setTransformOrigin(0, 0);
//		this.scroll.setContent(content);
	},

	onContentTransform: function() {
		//var content = this.scroll.getContent();
		this.transformableContent.setTransform(Ui.Matrix.createScale(this.getScale(), this.getScale()));
		// apply the translation part to the scrolling area
		// this is possible because the 2D transform change the scrollWidth and scrollHeight
		// but be carefull, 3D transform dont change the layout and the scroll size
		// will not be update so this will not work.
		// (-webkit-backface-visibility: hidden also break this).
		this.scroll.setOffset(-this.getTranslateX(), -this.getTranslateY(), true);
		this.scroll.updateOffset();
		this.translateX = -this.scroll.getOffsetX();
		this.translateY = -this.scroll.getOffsetY();
	}
});*/
