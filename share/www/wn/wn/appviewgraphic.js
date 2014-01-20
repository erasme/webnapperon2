
Ui.CanvasElement.extend('Wn.AppViewGraphic', {
	icon: undefined,

	constructor: function(config) {
	},

	setIcon: function(icon) {
		this.icon = icon;
		this.invalidateDraw();		
	}
}, {
	measureCore: function(width, height) {
		return { width: 120, height: 120 };
	},

	updateCanvas: function(ctx) {	
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();

		// shadow
		ctx.roundRectFilledShadow(1, 1, width-2, height-2, 3, 3, 3, 3, false, 2, new Ui.Color({ r: 0, g: 0,b: 0, a: 0.2 }));

		// background
		ctx.fillStyle = 'rgb(240, 240, 240)';
		ctx.beginPath();
		ctx.roundRect(3, 3, width-6, height-6, 0, 0, 0, 0);
		ctx.closePath();
		ctx.fill();
				
		// icon
		if(this.icon !== undefined) {
			var path = Ui.Icon.getPath(this.icon);
			var iconSize = 100;
			var scale = iconSize/48;			
			ctx.save();
			ctx.translate((width-iconSize)/2, ((height-iconSize)/2)-1);
			ctx.scale(scale, scale);
			ctx.fillStyle = 'rgb(60, 60, 60)';//'#666666';
			ctx.beginPath();
			ctx.svgPath(path);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
	}
});