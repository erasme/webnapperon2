
Ui.CanvasElement.extend('Wn.NewRibbon', {
}, {
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();		
		
		ctx.fillStyle = '#c240a3';
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
		ctx.fillText('Nouv.', 0, 0);
	}
});