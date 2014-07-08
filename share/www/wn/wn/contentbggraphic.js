
Ui.CanvasElement.extend('Wn.ContentBgGraphic', {
	color: undefined,

	setColor: function(color) {
		this.color = Ui.Color.create(color);
		this.invalidateDraw();
	}
}, {
	updateCanvas: function(ctx) {	
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		// shadow
		ctx.roundRectFilledShadow(0, 0, w, h, 3, 3, 3, 3, false, 2, new Ui.Color({ a: 0.2 }));

		// content background
		var c = '#f8f8f8';
		if(this.color != undefined)
			c = this.color.getCssRgba();
		ctx.fillStyle =  c;
		ctx.beginPath();
		ctx.roundRect(2, 2, w-4, h-4, 0, 0, 0, 0);
		ctx.closePath();
		ctx.fill();		
	}
});