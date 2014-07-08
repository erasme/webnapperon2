
Ui.CanvasElement.extend('Wn.ResourceViewGraphic', {
	title: '',
	icon: undefined,
	image: undefined,
	shareMode: 'group',
	shareCount: 0,
	userImage: undefined,
	foreground: undefined,
	background: undefined,

	constructor: function(config) {
		this.setForeground('white');
		this.setBackground('black');
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

	setForeground: function(color) {
		this.foreground = Ui.Color.create(color);
		this.invalidateDraw();
	},
	
	setColor: function(color) {
		this.color = Ui.Color.create(color);
		this.invalidateDraw();
	},

	getPreviewImage: function() {
		if(this.image !== undefined)
			return this.image.getSrc();
		else
			return undefined;
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

	setTitle: function(title) {
		this.title = title;
		this.invalidateDraw();
	},

	setUserImage: function(imageUrl) {
		if(this.userImage === undefined) {
			this.userImage = new Ui.Image({ src: imageUrl });
			this.appendChild(this.userImage);
			this.connect(this.userImage, 'ready', this.invalidateDraw);
		}
		else if(this.userImage.getSrc() !== imageUrl)
			this.userImage.setSrc(imageUrl);
	}
}, {
	setBackground: function(color) {
		this.background = Ui.Color.create(color);
		this.invalidateDraw();
	},

	measureCore: function(width, height) {
		return { width: 20, height: 20+24 };
	},

	updateCanvas: function(ctx) {		
		var width = this.getLayoutWidth();
		var height = this.getLayoutHeight();

		var fontSize = this.getStyleProperty('fontSize');
		var interLine = this.getStyleProperty('interLine');
		var titleHeight = Math.max(55, (fontSize * (1+interLine)) + 20);

		// shadow
//		ctx.roundRectFilledShadow(1, 1, width-2, height-2, 3, 3, 3, 3, false, 2, new Ui.Color({ r: 0, g: 0,b: 0, a: 0.2 }));

		// background
//		ctx.fillStyle = this.background.getCssRgba();
//		ctx.beginPath();
//		ctx.rect(3, 3, width-6, height-6);
//		ctx.closePath();
//		ctx.fill();

		// preview image
		if((this.image !== undefined) && this.image.getIsReady()) {
			ctx.save();
			
			var iw = width;
			var ih = height-titleHeight;
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
			ctx.drawImage(this.image.getDrawing(), sx, sy, sw, sh, 0, 0, iw, ih);
			
			ctx.restore();
		}
		// the icon
		else if(this.icon !== undefined) {
			var path = Ui.Icon.getPath(this.icon);
			var iconSize = 96;
			var scale = iconSize/48;
			ctx.save();
			ctx.translate((width-iconSize)/2, (height-(iconSize+titleHeight))/2);
			ctx.scale(scale, scale);
			ctx.fillStyle = this.foreground.getCssRgba();
			ctx.beginPath();
			ctx.svgPath(path);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		}

		// header
		ctx.fillStyle = this.color.getCssRgba();
		ctx.beginPath();
		ctx.rect(0, height-titleHeight, width, titleHeight);
		ctx.closePath();
		ctx.fill();
						
		// owner picture
		if((this.userImage !== undefined) && this.userImage.getIsReady()) {
			ctx.save();
			ctx.translate(8, height - (46));
			
			var iw = 30;
			var ih = 30;
			var ir = iw/ih;
			var sr = this.userImage.getNaturalWidth()/this.userImage.getNaturalHeight();
			var sw = this.userImage.getNaturalWidth();
			var sh = this.userImage.getNaturalHeight();
			var sx = 0;
			var sy = 0;

			ctx.fillStyle = 'white';
			ctx.fillRect(1, 1, 32, 32);

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
			ctx.drawImage(this.userImage.getDrawing(), sx, sy, sw, sh, 2, 2, iw, ih);
			
			ctx.restore();
		}

		// the title
		if(this.title !== '') {
			ctx.save();
			ctx.translate(8+32+8, height - (3+titleHeight) + fontSize + 10);

			var textContext = new Ui.CompactLabelContext();
			textContext.setFontSize(fontSize);
			textContext.setInterLine(interLine);
			textContext.setMaxLine(2);
			textContext.setText(this.title);

			ctx.fillStyle = 'white';
			ctx.font = textContext.getFontWeight()+' '+textContext.getFontSize()+'px '+textContext.getFontFamily();

			textContext.setDrawLine(function(x, y, line) {
				ctx.fillText(line, x, y);
			});
			textContext.drawText(width - (8+32+20), true);
			ctx.restore();
		}

		var ox = 0;
				
		// share picto
		if(this.shareMode == 'public') {
			ctx.save();
			ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
			ctx.fillRect(26, 0, 30, 40);

			ctx.translate(26+4, 1+14);
			Ui.Icon.drawIcon(ctx, 'earth', 22, 'white');
			ctx.restore();
		}
		else {
			if(this.shareCount > 0) {
				ctx.save();
				ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
				ctx.fillRect(26, 0, 30, 40);
				ctx.translate(26+4, 1+14);
				Ui.Icon.drawIconAndBadge(ctx, 'group', 22, 'white', this.shareCount, 22/2.5, 'white', 'black');
				ctx.restore();
			}
		}
	}
}, {
	style: {
		fontSize: 16,
		interLine: 1.2,
		fontWeight: 'normal'
	}
});