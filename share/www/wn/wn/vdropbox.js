
Ui.DropBox.extend('Wn.VDropBox', {
	vbox: undefined,
	fixed: undefined,
	marker: undefined,
	hideTimeout: undefined,

	constructor: function(config) {
		this.addEvents('dropat');
	
		this.fixed = new Ui.Fixed();
		Wn.VDropBox.base.append.call(this, this.fixed);

		this.marker = new Ui.Frame({ margin: 2, frameWidth: 2, radius: 2, width: 6, height: 6 });
		this.marker.hide();
		this.fixed.append(this.marker);

		this.vbox = new Ui.VBox({ uniform: true });
		Wn.VDropBox.base.append.call(this, this.vbox);

		this.connect(this, 'dragover', this.onBoxDragOver);
		this.connect(this, 'drop', this.onBoxDrop);
	},

	setSpacing: function(spacing) {
		this.vbox.setSpacing(spacing);
	},

	setMarkerPos: function(pos) {
		if(this.hideTimeout != undefined) {
			this.hideTimeout.abort();
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });
		}
		else
			this.hideTimeout = new Core.DelayedTask({ delay: 1, scope: this, callback: this.markerHide });

		this.marker.show();
		if(pos < this.vbox.getChildren().length) {
			var child = this.vbox.getChildren()[pos];
			var x = child.getLayoutX();
			var y = child.getLayoutY() - child.getMarginTop() - (this.marker.getLayoutHeight() + this.marker.getMarginTop() + this.marker.getMarginBottom())/2 - this.vbox.getSpacing()/2;
			this.marker.setWidth(child.getLayoutWidth());
			this.fixed.setPosition(this.marker, x, y);
		}
		else if(this.vbox.getChildren().length > 0) {
			var child = this.vbox.getChildren()[this.vbox.getChildren().length-1];
			var x = child.getLayoutX();
			var y = child.getLayoutY() + child.getLayoutHeight() - this.marker.getLayoutHeight()/2;
			this.marker.setWidth(child.getLayoutWidth());
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
		var childs = this.vbox.getChildren();
		
		var element = undefined;
		var dist = Number.MAX_VALUE;
		for(var i = 0; i < childs.length; i++) {
			var cy = childs[i].getLayoutY() + ((childs[i].getLayoutHeight())/2);
			var d = Math.abs(point.y - cy);
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
			if(point.y < element.getLayoutY()+element.getLayoutHeight()/2)
				insertPos = elPos;
			else
				insertPos = elPos+1;
		}
		return insertPos;
	},

	insertAt: function(element, pos, resizable) {
		this.vbox.insertAt(element, pos, resizable);
	},
	
	moveAt: function(element, pos) {
		this.vbox.moveAt(element, pos);
	},
	
	getLogicalChildren: function() {
		return this.vbox.getChildren();
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
		this.fireEvent('dropat', this, mimetype, data, this.findPosition({x: x, y: y }));
	},
	
	checkPosition: function(position) {
		return true;
	}

}, {
	setContent: function(content) {
		this.vbox.setContent(content);
	},

	append: function(item, resizable) {
		this.vbox.append(item, resizable);
	},

	remove: function(item) {
		this.vbox.remove(item);
	},

	onStyleChange: function() {
		this.marker.setFill(this.getStyleProperty('markerColor'));
	}
}, {
	style: {
		markerColor: new Ui.Color({ r: 0.4, g: 0, b: 0.35, a: 0.8 })
	}
});