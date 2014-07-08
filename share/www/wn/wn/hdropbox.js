
Ui.DropBox.extend('Wn.HDropBox', {
	hbox: undefined,
	fixed: undefined,
	marker: undefined,
	hideTimeout: undefined,

	constructor: function(config) {
		this.addEvents('dropat', 'dropfileat');
	
		this.fixed = new Ui.Fixed();
		Wn.HDropBox.base.append.call(this, this.fixed);

		this.marker = new Ui.Frame({ margin: 2, frameWidth: 2, radius: 2, width: 6, height: 6 });
		this.marker.hide();
		this.fixed.append(this.marker);

		this.hbox = new Ui.HBox({ uniform: true });
		Wn.HDropBox.base.append.call(this, this.hbox);

		this.connect(this, 'dragover', this.onBoxDragOver);
		this.connect(this, 'drop', this.onBoxDrop);
		this.connect(this, 'dropfile', this.onBoxDropFile);
	},

	setSpacing: function(spacing) {
		this.hbox.setSpacing(spacing);
	},

	setMarkerPos: function(pos) {
		if(this.hideTimeout != undefined) {
			this.hideTimeout.abort();
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });
		}
		else
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });

		this.marker.show();
		if(pos < this.hbox.getChildren().length) {
			var child = this.hbox.getChildren()[pos];
			var x = child.getLayoutX() - child.getMarginLeft() -
				(this.marker.getLayoutWidth() + this.marker.getMarginLeft() +
				this.marker.getMarginRight())/2 - this.hbox.getSpacing()/2;
			var y = child.getLayoutY();
			this.marker.setHeight(child.getLayoutHeight());
			this.fixed.setPosition(this.marker, x, y);
		}
		else if(this.hbox.getChildren().length > 0) {
			var child = this.hbox.getChildren()[this.hbox.getChildren().length-1];
			var x = child.getLayoutX() + child.getLayoutWidth() - this.marker.getLayoutWidth()/2;
			var y = child.getLayoutY();
			this.marker.setHeight(child.getLayoutHeight());
			this.fixed.setPosition(this.marker, x, y);
		}
		else
			this.markerHide();
	},

	markerHide: function(pos) {
		this.hideTimeout = undefined;
		this.marker.hide();
	},

	findPosition: function(point) {
		var childs = this.hbox.getChildren();
		
		var element = undefined;
		var dist = Number.MAX_VALUE;
		for(var i = 0; i < childs.length; i++) {
			var cx = childs[i].getLayoutX() + ((childs[i].getLayoutWidth())/2);
			var d = Math.abs(point.x - cx);
			if(d < dist) {
				dist = d;
				element = childs[i];
			}
		}
		if((element === undefined) && (childs.length > 0))
			element = childs[childs.length-1];

		var insertPos = childs.length;
		if(element !== undefined) {
			// find element pos
			var elPos = -1;
			for(var i = 0; (elPos === -1) && (i < childs.length); i++) {
				if(childs[i] === element)
					elPos = i;
			}
			if(point.x < element.getLayoutX()+element.getLayoutWidth()/2)
				insertPos = elPos;
			else
				insertPos = elPos+1;
		}
		return insertPos;
	},

	insertAt: function(element, pos, resizable) {
		this.hbox.insertAt(element, pos, resizable);
	},
	
	moveAt: function(element, pos) {
		this.hbox.moveAt(element, pos);
	},
	
	getLogicalChildren: function() {
		return this.hbox.getChildren();
	},

	onBoxDragOver: function(element, x, y) {
		var position = this.findPosition({ x: x, y: y });
		if(this.checkPosition(position))
			this.setMarkerPos(position);
		else
			this.markerHide();
	},

	onBoxDrop: function(element, mimetype, data, x, y) {
		this.markerHide();
		this.fireEvent('dropat', this, mimetype, data, this.findPosition({ x: x, y: y }));
	},
	
	onBoxDropFile: function(element, file, x, y) {
		this.markerHide();
		this.fireEvent('dropfileat', this, file, this.findPosition({ x: x, y: y }));
	},
	
	checkPosition: function(position) {
		return true;
	}

}, {
	setContent: function(content) {
		this.hbox.setContent(content);
	},

	append: function(item, resizable) {
		this.hbox.append(item, resizable);
	},

	remove: function(item) {
		this.hbox.remove(item);
	},

	onStyleChange: function() {
		this.marker.setFill(this.getStyleProperty('markerColor'));
	}
}, {
	style: {
		markerColor: new Ui.Color({ r: 0.4, g: 0, b: 0.35, a: 0.8 })
	}
});