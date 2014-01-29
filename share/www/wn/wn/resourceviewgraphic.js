
Ui.CanvasElement.extend('Wn.ResourceViewGraphic', {
	text: '',
	icon: undefined,
	image: undefined,
	shareMode: 'group',
	shareCount: 0,
	userImage: undefined,

	constructor: function(config) {
	},

	setTitle: function(title) {
		this.title = title;
		this.invalidateDraw();
		this.invalidateMeasure();
	},

	//
	// Possible values: [group|public]
	//
	setShareMode: function(mode) {
		this.shareMode = mode;
		this.invalidateDraw();
	},
	
	setShareCount: function(count) {
		this.shareCount = count;
		this.invalidateDraw();
	},

	setIcon: function(icon) {
		this.icon = icon;
		this.invalidateDraw();		
	},

	setPreviewImage: function(imageUrl) {
		if(this.image == undefined) {
			this.image = new Ui.Image();
			this.appendChild(this.image);
		}
		this.image.setSrc(imageUrl);
		if(this.image.getIsReady())
			this.invalidateDraw();
		else
			this.connect(this.image, 'ready', this.invalidateDraw);
	},
	
	setUserImage: function(imageUrl) {
		if(this.userImage == undefined) {
			this.userImage = new Ui.Image();
			this.appendChild(this.userImage);
		}
		this.userImage.setSrc(imageUrl);
		if(this.userImage.getIsReady())
			this.invalidateDraw();
		else
			this.connect(this.userImage, 'ready', this.invalidateDraw);
	}
}, {
	measureCore: function(width, height) {
		return { width: 20, height: 20+24 };
	},

	updateCanvas: function(ctx) {		
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();
		var fontHeight = 24;

		// shadow
		ctx.roundRectFilledShadow(1, 1, width-2, height-2, 3, 3, 3, 3, false, 2, new Ui.Color({ r: 0, g: 0,b: 0, a: 0.2 }));

		// background
		ctx.fillStyle = 'rgb(240, 240, 240)';
		ctx.beginPath();
		ctx.rect(3, 3, width-6, height-6);
		ctx.closePath();
		ctx.fill();

		// header
		ctx.fillStyle = 'rgb(60, 60, 60)';
		ctx.beginPath();
		ctx.rect(3, 3, width-6, 15+fontHeight+7);
		ctx.closePath();
		ctx.fill();
			
		// header text
		ctx.save();
		ctx.beginPath();
		ctx.rect(3, 3, width-6, 15+fontHeight+7);
		ctx.closePath();
		ctx.clip();
		ctx.fillStyle = '#f8f8f8';//'#e1e1e1';
		ctx.textBaseline = 'alphabetic';
		ctx.font = 'normal '+fontHeight+'px Ubuntu';
		ctx.fillText(this.title, 10, 10+fontHeight);
		ctx.restore();
					
		// end text shadow	
		var grd2 = ctx.createLinearGradient(width-(3+40), 3, width-3, 3);
		grd2.addColorStop(0, 'rgba(60, 60, 60, 0)');
		grd2.addColorStop(0.9, 'rgb(60, 60, 60)');
		grd2.addColorStop(1, 'rgb(60, 60, 60)');
		ctx.fillStyle = grd2;
		ctx.beginPath();
		ctx.rect(width-(3+40), 3, 40, 15+fontHeight+7);
		ctx.closePath();
		ctx.fill();

		// preview image
		if((this.image != undefined) && this.image.getIsReady()) {
			ctx.save();
			
			var iw = width - 6;
			var ih = height-(3+15+fontHeight+7+3);
			var ir = iw/ih;
			var sr = this.image.getNaturalWidth()/this.image.getNaturalHeight();
			var sw = this.image.getNaturalWidth();
			var sh = this.image.getNaturalHeight();
			var sx = 0;
			var sy = 0;

			if(sr > ir) {
				sy = 0;
				sh = this.image.getNaturalHeight();
				sw = sh * ir;
				sx = (this.image.getNaturalWidth() - sw)/2;
			}
			else {
				sx = 0;
				sw = this.image.getNaturalWidth();
				sh = sw / ir;
				sy = 0;
				//sy = (this.image.getNaturalHeight() - sh)/2;
			}
			//ctx.drawImage(this.image.getDrawing(), sx, sy, sw, sh, 3, 15+fontHeight+7+3, iw, ih);
			ctx.drawImage(this.image.getDrawing(), sx, sy, sw, sh, 3+2, 15+fontHeight+7+3+2, iw-4, ih-4);
			
			ctx.restore();
		}
		// the icon
		else if(this.icon != undefined) {
			var path = Ui.Icon.getPath(this.icon);
			var iconSize = 96;
			var scale = iconSize/48;
			ctx.save();
			ctx.translate((width-iconSize)/2, (15+7+fontHeight+height-iconSize)/2);
			ctx.scale(scale, scale);
			ctx.fillStyle = 'rgb(60, 60, 60)';
			ctx.beginPath();
			ctx.svgPath(path);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}
		
		var ox = 0;
				
		// owner picture
		if((this.userImage != undefined) && this.userImage.getIsReady()) {
			ctx.save();
			ctx.translate(width - (48+8), height - (48+8));
			
			var iw = 36;
			var ih = 36;
			var ir = iw/ih;
			var sr = this.userImage.getNaturalWidth()/this.userImage.getNaturalHeight();
			var sw = this.userImage.getNaturalWidth();
			var sh = this.userImage.getNaturalHeight();
			var sx = 0;
			var sy = 0;

			ctx.fillStyle = 'rgb(60,60,60)';//'black';
			ctx.fillRect(2, 2, 44, 44);
			
			ctx.fillStyle = 'white';
			ctx.fillRect(4, 4, 40, 40);

			if(sr > ir) {
				sy = 0;
				sh = this.userImage.getNaturalHeight();
				sw = sh * ir;
				sx = (this.userImage.getNaturalWidth() - sw)/2;
			}
			else {
				sx = 0;
				sw = this.userImage.getNaturalWidth();
				sh = sw / ir;
				sy = (this.userImage.getNaturalHeight() - sh)/2;
			}			
			ctx.drawImage(this.userImage.getDrawing(), sx, sy, sw, sh, 6, 6, iw, ih);
			
			ctx.restore();
			ox += 48;
		}
					
		// share picto
		if(this.shareMode == 'public') {
			var strokeWidth = 2;
			ctx.save();
						
			ctx.translate(width - (48+8+ox), height - (48+8));
			
			var scale = Math.min(48, 48)/48;
			ctx.scale(scale, scale);
			ctx.translate(strokeWidth, strokeWidth);
			var scale2 = (48-(strokeWidth*2))/48;
			ctx.scale(scale2, scale2);
			ctx.svgPath(Ui.Icon.getPath('earth'));
			ctx.strokeStyle = 'rgb(60,60,60)';//'black';
			ctx.lineWidth = strokeWidth*2;
			ctx.stroke();
			ctx.fillStyle = 'white';
			ctx.fill();
			ctx.restore();
		}
		else {
			if(this.shareCount > 0) {			
				var strokeWidth = 2;
				ctx.save();
				ctx.translate(width - (48+8+ox), height - (48+8));
				var scale = Math.min(48, 48)/48;
				ctx.scale(scale, scale);
				ctx.translate(strokeWidth, strokeWidth);
				var scale2 = (48-(strokeWidth*2))/48;
				ctx.scale(scale2, scale2);
				ctx.svgPath(Ui.Icon.getPath('group'));
				ctx.strokeStyle = 'rgb(60,60,60)';//'black';
				ctx.lineWidth = strokeWidth*2;
				ctx.stroke();
				ctx.fillStyle = 'white';
				ctx.fill();
				ctx.restore();
				
				// header text
				ctx.save();
				ctx.translate(width - 8 - 48/2 - ox, height - 8 - 16);
				ctx.fillStyle = 'rgb(60,60,60)';//'black';
				ctx.textBaseline = 'middle';
				ctx.textAlign = 'center';
				ctx.font = 'normal 700 12px Ubuntu';
				ctx.fillText(this.shareCount, 0, 0);
				ctx.restore();
			}
		}		
	}
});