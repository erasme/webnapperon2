

Ui.HBox.extend('Wn.ColorChooser', {
	value: undefined,
	colorRect: undefined,
	hSlider: undefined,
	sSlider: undefined,
	lSlider: undefined,
	field: undefined,

	constructor: function(config) {
		this.addEvents('change');

		this.setSpacing(10);

		this.colorRect = new Ui.Rectangle({ width: 80, height: 80 });
		this.append(this.colorRect);

		var vbox = new Ui.VBox({ spacing: 10 });
		this.append(vbox, true);

		this.hSlider = new Wn.SliderField({ title: 'Couleur' });
		this.connect(this.hSlider, 'change', function(s, value) {
			var hsla = this.value.getHsla();
			hsla.h = value * 360;
			this.value = new Ui.Color(hsla);
			this.updateColor();
			this.updateField();
			this.fireEvent('change', this, this.value);
		});
		vbox.append(this.hSlider);
		this.sSlider = new Wn.SliderField({ title: 'Saturation' });
		this.connect(this.sSlider, 'change', function(s, value) {
			var hsla = this.value.getHsla();
			hsla.s = value;
			this.value = new Ui.Color(hsla);
			this.updateColor();
			this.updateField();
			this.fireEvent('change', this, this.value);
		});
		vbox.append(this.sSlider);
		this.lSlider = new Wn.SliderField({ title: 'Lumière' });
		this.connect(this.lSlider, 'change', function(s, value) {
			var hsla = this.value.getHsla();
			hsla.l = value;
			this.value = new Ui.Color(hsla);
			this.updateColor();
			this.updateField();
			this.fireEvent('change', this, this.value);
		});
		vbox.append(this.lSlider);

		this.field = new Wn.TextField({ title: 'HTML', width: 200 });
		this.connect(this.field, 'change', function(f, value) {
			try {
				this.value = Ui.Color.parse(value);
				this.updateColor();
				this.updateSliders();
				this.fireEvent('change', this, this.value);
			}
			catch(e) {}
		});
		vbox.append(this.field);

		this.setValue('black');
	},

	updateColor: function() {
		this.colorRect.setFill(this.value);
	},

	updateSliders: function() {
		var hsla = this.value.getHsla();
		this.hSlider.setValue(hsla.h/360, true);
		this.sSlider.setValue(hsla.s, true);
		this.lSlider.setValue(hsla.l, true);
	},

	updateField: function() {
		this.field.setValue(this.value.getCssHtml());
	},

	setValue: function(value, notField) {
		this.value = Ui.Color.create(value);
		this.updateColor();
		this.updateSliders();
		this.updateField();
	},

	getValue: function() {
		return this.value;
	}
});

Ui.Button.extend('Wn.ColorButton', {
	key: undefined,
	color: undefined,
	rect: undefined,

	constructor: function(config) {
		this.addEvents('change');
		this.rect = new Ui.Rectangle();
		this.setValue('black');
		this.setIcon(this.rect);
		this.connect(this, 'press', this.onColorButtonPress);
	},

	setKey: function(key) {
		this.key = key;
	},

	getKey: function() {
		return this.key;
	},

	setValue: function(color) {
		this.color = Ui.Color.create(color);
		this.rect.setFill(this.color);
		this.fireEvent('change', this, this.color);
	},

	getValue: function() {
		return this.color;
	},

	onColorButtonPress: function() {
		var popup = new Ui.MenuPopup();
		var colorChooser = new Wn.ColorChooser({ value: this.color, margin: 10 });
		this.connect(colorChooser, 'change', function(f, value) {
			this.setValue(value);
		});
		popup.setContent(colorChooser);
		popup.show(this, 'left');
	}

}, {
	onStyleChange: function() {
		Wn.ColorButton.base.onStyleChange.apply(this, arguments);
		var size = this.getStyleProperty('iconSize');
		this.rect.setWidth(size);
		this.rect.setHeight(size);
	}
});

Ui.Dialog.extend('Wn.CustomStyleEditor', {
	theme: undefined,
	thicknessField: undefined,
	roundnessField: undefined,
	spacingField: undefined,

	constructor: function(config) {
		this.addEvents('done');

		this.theme = Core.Util.clone(config.theme);
		delete(config.theme);

		this.setFullScrolling(true);
		this.setPreferredWidth(400);
		this.setPreferredHeight(500);
		this.setTitle('Editeur de thème');
		this.setCancelButton(new Ui.DialogCloseButton());
		var saveButton = new Ui.DefaultButton({ text: 'Enregister' });
		this.setActionButtons([ saveButton ]);

		var vbox = new Ui.VBox({ spacing: 10, margin: 10 })
		this.setContent(vbox);

		var colorFields = new Wn.GroupField({ title: 'Couleurs' });
		vbox.append(colorFields);

		var flow = new Ui.Flow({ spacing: 5, uniform: true });
		colorFields.setField(flow);

		for(var key in this.theme.palette) {
			var name = '';
			if(key in Wn.CustomStyleEditor.colorsNames)
				name = Wn.CustomStyleEditor.colorsNames[key];

			var colorButton = new Wn.ColorButton({ value: this.theme.palette[key], key: key, text: name });
			this.connect(colorButton, 'change', this.onColorChange);
			flow.append(colorButton);
		}

		this.thicknessField = new Wn.SliderField({ title: 'Épaisseur' });
		this.thicknessField.setValue((this.theme.thickness-1)/3);
		vbox.append(this.thicknessField);

		this.roundnessField = new Wn.SliderField({ title: 'Rondeur' });
		this.roundnessField.setValue(this.theme.roundness / 10);
		vbox.append(this.roundnessField);

		this.spacingField = new Wn.SliderField({ title: 'Espacement' });
		this.spacingField.setValue(this.theme.spacing / 15);
		vbox.append(this.spacingField);

		this.connect(saveButton, 'press', function() {
			this.theme.thickness = Math.round((this.thicknessField.getValue()*3)+1);
			this.theme.roundness = Math.round(this.roundnessField.getValue()*10);
			this.theme.spacing = Math.round(this.spacingField.getValue()*15);

			this.fireEvent('done', this, this.theme);
			this.close();
		});
	},

	onColorChange: function(b, color) {
		this.theme.palette[b.getKey()] = color.getCssRgba();
	}
}, {}, {
	colorsNames: {
		"menu": "Bandeau",
        "menuInv": "Texte bandeau",
        "background": "Fond",
        "foreground": "Texte fond",
        "focus": "Notifications",
        "focusInv": "Texte notification",
        "active": "Actif",
        "default": "Bouton",
        "defaultInv": "Texte bouton",
        "files": "Fichier",
        "calendar": "Calendrier",
        "news": "Journal",
        "podcast": "Podcast"
	}
});

Ui.Button.extend('Wn.StyleWallpaper', {
	wallpaper: undefined,
	image: undefined,

	constructor: function(config) {
		this.wallpaper = config.wallpaper;
		delete(config.wallpaper);

		this.image = new Wn.ScaledImage2({ src: '/cloud/wallpaper/thumbnail/'+this.wallpaper, mode: 'crop' });
		this.setIcon(this.image);
	},

	getWallpaper: function() {
		return this.wallpaper;
	}

}, {
	onStyleChange: function() {
		Wn.StyleWallpaper.base.onStyleChange.apply(this, arguments);
		var iconSize = this.getStyleProperty('iconSize');
		this.image.setWidth(iconSize);
		this.image.setHeight(iconSize);
	}
});

Wn.OptionSection.extend('Wn.StyleSection', {
	flow: undefined,
	user: undefined,
	plus: undefined,
	googleAccount: undefined,
	facebookAccount: undefined,
	localAccount: undefined,
	wallpapers: undefined,

	constructor: function(config) {
		this.user = config.user;
		delete(config.user);
	
		this.setTitle('Apparence');
	
		var vbox = new Ui.VBox({ spacing: 10 });
		this.setContent(vbox);

		var themes = JSON.parse(JSON.stringify(Ui.App.current.getSetup().style.themes));
		var customTheme = this.user.getCustomTheme();
		if(customTheme === undefined)
			customTheme = JSON.parse(JSON.stringify(themes[0]));
		customTheme.key = 'custom';
		customTheme.title = 'Personnalisé';
		themes.push(customTheme);

		var theme = this.user.getTheme();
		var themePos = 0;
		for(var i = 0; i < themes.length; i++) {
			if(themes[i].key === theme) {
				themePos = i;
			}
		}

		var combo = new Ui.Combo({ field: 'title', placeHolder: 'thème...', data: themes, currentAt: themePos });
		this.connect(combo, 'change', this.onComboChange);

		var themeField = new Wn.GroupField({ title: 'Thème', field: combo });
		vbox.append(themeField);

		this.wallpapers = new Ui.Flow({ spacing: 20 });
		var wallpapersField = new Wn.GroupField({ title: "Fond d'écran", field: this.wallpapers });
		vbox.append(wallpapersField);

		var request = new Core.HttpRequest({ method: 'GET', url: '/cloud/wallpaper/list' });
		this.connect(request, 'done', this.onWallpapersListDone);
		request.send();
	},

	onWallpapersListDone: function(req) {
		var list = req.getResponseJSON();
		for(var i = 0; i < list.length; i++) {
			var wallpaper = new Wn.StyleWallpaper({ wallpaper: list[i] });
			wallpaper.setIsActive(this.user.getWallpaper() === list[i]);
			this.connect(wallpaper, 'press', this.onWallpaperPress);
			this.wallpapers.append(wallpaper);
		}
	},

	onWallpaperPress: function(button) {	
		this.user.setWallpaper(button.getWallpaper());
		for(var i = 0; i < this.wallpapers.getChildren().length; i++) {
			var child = this.wallpapers.getChildren()[i];
			child.setIsActive(child === button);
		}
	},

	onComboChange: function(combo, val, position) {
		// the user custom
		if(val.key === 'custom') {
			var dialog = new Wn.CustomStyleEditor({ theme: val });
			this.connect(dialog, 'done', this.onCustomStyleDone);
			dialog.open();
		}
		// else it is an administrator defined theme
		else {
			// clear the user defined wallpaper to allow the theme default one
			this.user.setWallpaper(null);
			Ui.App.current.setTheme(val.key);
		}
		this.user.setTheme(val.key);
	},

	onCustomStyleDone: function(dialog, theme) {
		this.user.setCustomTheme(theme);
		Ui.App.current.setTheme('custom');
	}
});
