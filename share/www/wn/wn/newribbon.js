
Ui.CanvasElement.extend('Wn.NewRibbon', {
}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();		

		ctx.rotate(-Math.PI/2);
		ctx.translate(-w, 0);

		ctx.fillStyle = Ui.Color.create(this.getStyleProperty('background')).getCssRgba();
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(w/2, 0);
		ctx.lineTo(w, h/2);
		ctx.lineTo(w, h);
		ctx.closePath();
		ctx.fill();

		var cx = (w/4 + w)/2;
		var cy = (h*3/4)/2;		
		ctx.translate(cx, cy);
		ctx.fillStyle = '#ffffff';
		ctx.rotate(Math.atan2(h*3/4, w*3/4));
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'normal '+(Math.min(w,h)*0.3)+'px Ubuntu';
		ctx.fillText('nouv.', 0, 0);
	},

	onStyleChange: function() {
		this.invalidateDraw();
	}

}, {
	style: {
		background: '#E20045'
	}
});