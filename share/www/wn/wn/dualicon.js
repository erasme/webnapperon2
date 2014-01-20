

Ui.CanvasElement.extend('Wn.DualIcon', {
	icon: undefined,
	fill: '#f1f1f1',
	stroke: '#000000',
	strokeWidth: 2,

	constructor: function(config) {
		this.icon = config.icon;
		delete(config.icon);
	},

	setFill: function(fill) {
		this.fill = fill;
		this.invalidateDraw();
	},

	setStroke: function(stroke) {
		this.stroke = stroke;
		this.invalidateDraw();
	},

	setStrokeWidth: function(strokeWidth) {
		this.strokeWidth = strokeWidth;
		this.invalidateDraw();
	}
}, {
	updateCanvas: function(ctx) {
		ctx.save();
		var scale = Math.min(this.getLayoutWidth(), this.getLayoutHeight())/48;
		ctx.scale(scale, scale);
		ctx.translate(this.strokeWidth, this.strokeWidth);
		var scale2 = (48-(this.strokeWidth*2))/48;
		ctx.scale(scale2, scale2);
		ctx.svgPath(Ui.Icon.getPath(this.icon));
		ctx.strokeStyle = this.stroke;
		ctx.lineWidth = this.strokeWidth*2;
		ctx.stroke();
		ctx.fillStyle = this.fill;
		ctx.fill();
		ctx.restore();
	}
});

