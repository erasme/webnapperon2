

Ui.Image.extend('Wn.RatioImage', {
	squareSize: undefined,

	setSquareSize: function(size) {
		this.squareSize = size;
		this.invalidateMeasure();
	}
}, {
	measureCore: function(w, h) {
		if(this.getIsReady()) {
			var ratio = this.getNaturalWidth() / this.getNaturalHeight();
			var squareSize = this.squareSize;
			if(squareSize === undefined)
				squareSize = w;
			if(ratio > 1)
				return { width: squareSize, height: squareSize/ratio };	
			else
				return { width: squareSize*ratio, height: squareSize };	
		}
		else
			return { width: squareSize, height: squareSize };
	}
});