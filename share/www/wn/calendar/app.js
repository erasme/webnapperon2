
Ui.Dialog.extend('Calendar.EventDetail', {
	event: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		this.setCancelButton(new Ui.DialogCloseButton());
		this.setTitle('Détail');
		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(500);

		var sflow = new Ui.SFlow({ itemAlign: 'stretch', stretchMaxRatio: 10, spacing: 10 });
		this.setContent(sflow);

		var dayEvent = (this.event.day === true);
		sflow.append(new Wn.TextField({ title: 'Titre', value: this.event.summary, width: 400, disabled: true }));
		sflow.append(new Wn.DateField({ title: 'Début', value: this.event.start, width: 150, disabled: true, displayHours: !dayEvent }));
		var eventEnd = this.event.end;
		if(dayEvent)
			eventEnd = new Date(eventEnd.getTime() - (24 * 60 * 60 * 1000));
		sflow.append(new Wn.DateField({ title: 'Fin', value: eventEnd, width: 150, disabled: true, displayHours: !dayEvent }));
		sflow.append(new Ui.CheckBox({ text: 'Toute la journée', value: dayEvent, width: 300, disabled: true }));
		sflow.append(new Wn.TextAreaField({ title: 'Lieu', value: this.event.location, width: 400, disabled: true }));
		sflow.append(new Wn.TextAreaField({ title: 'Description', value: this.event.description, width: 400, disabled: true }));
	}
});

Ui.Pressable.extend('Calendar.DayViewItem', {
	event: undefined,
	text: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		this.setClipToBounds(true);
		this.setMargin(2);

		if(this.event.end < new Date())
			this.setOpacity(0.5);

		this.append(new Ui.Rectangle({ fill: '#2fc6f3' }));

		var summary = this.event.summary;
		if(summary == undefined)
			summary = '';
		this.text = new Ui.CompactLabel({ text: summary, margin: 5 });
		this.append(this.text);
	},

	getEvent: function() {
		return this.event;
	}
}, {
	onPress: function() {
		Calendar.DayViewItem.base.onPress.apply(this, arguments);
		var dialog = new Calendar.EventDetail({ event: this.event });
		dialog.open();
	}
});

Ui.Container.extend('Calendar.DaysEvents', {
	start: undefined,
	count: 1,
	uniformItemHeight: 0,
	maxRow: 0,

	constructor: function(config) {
		this.start = config.start;
		delete(config.start);

		this.count = config.count;
		delete(config.count);
	},

	setData: function(data) {
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			this.removeChild(item);
		}
		for(var i = 0; i < data.length; i++) {
			var event = data[i];
			// check if the event is visible by us
			var startx = Math.round((event.start.getTime() - this.start.getTime()) / (24 * 60 * 60 * 1000));
			var lengthx = Math.round((event.end.getTime() - event.start.getTime()) / (24 * 60 * 60 * 1000));
			var endx = startx + lengthx - 1;
			if(((startx >= 0) && (startx < this.count)) ||
			   ((endx >= 0) && (endx < this.count)) ||
			   ((startx < 0) && (endx >= this.count))) {
				var item = new Calendar.DayViewItem({ event: event });
				this.appendChild(item);
			}
		}
		this.updateGrid();
	},

	updateGrid: function() {
		this.maxRow = 0;
		var grid = [];
		for(var i = 0; i < this.count; i++) {
			grid.push([]);
			for(var i2 = 0; i2 < this.getChildren().length; i2++)
				grid[i].push(true);
		}
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var event = item.getEvent();
			var startx = Math.round((event.start.getTime() - this.start.getTime()) / (24 * 60 * 60 * 1000));
			var lengthx = Math.round((event.end.getTime() - event.start.getTime()) / (24 * 60 * 60 * 1000));
			var endx = startx + lengthx;
			startx = Math.max(0, startx);
			endx = Math.min(this.count, endx);
			lengthx = endx - startx;
			// find free places in the grid
			var row = 0;
			for(; row < this.getChildren().length; row++) {
				var isFree = true;
				for(var col = startx; isFree && (col < endx); col++)
					isFree = grid[col][row];
				if(isFree)
					break;
			}
			// take the row
			for(var col = startx; col < endx; col++)
				grid[col][row] = false;

			if(row > this.maxRow)
				this.maxRow = row;

			item['Calendar.DaysEvents.attach'] = {
				startx: startx,
				endx: endx,
				lengthx: lengthx,
				row: row
			};
		}
	}
}, {
	measureCore: function(width, height) {
		var minItemHeight = 0;
		for(var i = 0; i < this.getChildren().length; i++) {
			var size = this.getChildren()[i].measure(width, 0);
			if(size.height > minItemHeight)
				minItemHeight = size.height;
		}
		this.uniformItemHeight = minItemHeight;
		return { width: 0, height: minItemHeight * (this.maxRow + 1) };
	},

	arrangeCore: function(width, height) {
		var colWidth = (width - 5 * (this.count-1)) / this.count;
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var attach = item['Calendar.DaysEvents.attach'];
			item.arrange(attach.startx * colWidth + 5 * attach.startx, attach.row * this.uniformItemHeight, colWidth * attach.lengthx + 5 * (attach.lengthx - 1), this.uniformItemHeight);
		}
	}
});

Ui.CanvasElement.extend('Calendar.WeekGraphHeader', {
	weekStart: undefined,
	measureColWidth: 0,
	now: undefined,

	constructor: function(config) {
		this.weekStart = config.weekStart;
		delete(config.weekStart);

		this.now = config.now;
		delete(config.now);
	},

	getMeasureColWidth: function() {
		return this.measureColWidth;
	}
}, {
	measureCore: function(width, height) {
		var fontSize = this.getStyleProperty('fontSize');

		var colWidth = 0;
		var currentDay = new Date(this.weekStart.getTime());
		for(var pos = 0; pos < 7; pos++) {
			var text = currentDay.getDate()+' '+Calendar.WeekGraphHeader.dayToShort[pos];
			var weight = 'normal';
			if((this.now >= currentDay) && (this.now.getTime() < currentDay.getTime() + (24 * 60 * 60 * 1000)))
				weight = 'bold';
			var size = Ui.Label.measureText(text, fontSize, 'sans-serif', weight);
			if(size.width > colWidth)
				colWidth = size.width;
			currentDay = new Date(currentDay.getTime() + (24 * 60 * 60 * 1000));
		}
		this.measureColWidth = colWidth;
		return { width: colWidth+(5*6), height: fontSize*1.3 };
	},

	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var fontSize = this.getStyleProperty('fontSize');

		var colWidth = (w - (6 * 5)) / 7;

		var currentDay = new Date(this.weekStart.getTime());
		var colPos = 0;
		for(var pos = 0; pos < 7; pos++) {

			var weight = 'normal';
			if((this.now >= currentDay) && (this.now.getTime() < currentDay.getTime() + (24 * 60 * 60 * 1000)))
				weight = 'bold';
			ctx.font = 'default '+weight+' '+Math.round(fontSize)+'px sans-serif';

			ctx.fillStyle = 'rgba(50,50,50,1)';
			ctx.fillText(currentDay.getDate()+' '+Calendar.WeekGraphHeader.dayToShort[pos],
				colPos, fontSize);
			ctx.fillStyle = 'rgba(200,200,200,1)';
			ctx.fillRect(colPos, fontSize*1.3 - 2, colWidth, 2);
			colPos += colWidth + 5;
			currentDay = new Date(currentDay.getTime() + (24 * 60 * 60 * 1000));
		}
	}
}, {
	dayToShort: {
		0: 'lun.',
		1: 'mar.',
		2: 'mer.',
		3: 'jeu.',
		4: 'ven.',
		5: 'sam.',
		6: 'dim.'
	},

	style: {
		color: '#000000',
		fontSize: 16
	}
});

Ui.Container.extend('Calendar.DayGraphItems', {
	day: undefined,
	colsCount: undefined,
	
	constructor: function(config) {
		this.day = new Date(config.day.getFullYear(), config.day.getMonth(), config.day.getDate(), 0, 0, 0, 0);
		delete(config.day);
	},

	setData: function(data) {
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			this.removeChild(item);
		}
		for(var i = 0; i < data.length; i++) {
			var event = data[i];
			var item = new Calendar.DayViewItem({ event: event });
			this.appendChild(item);
		}
		this.updateGrid();
	},

	updateGrid: function() {
		this.colsCount = [];
		var grid = [];
		for(var i = 0; i < 48; i++) {
			this.colsCount.push(0);
			grid.push([]);
			for(var i2 = 0; i2 < this.getChildren().length; i2++)
				grid[i].push(true);
		}

		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var event = item.getEvent();
			var starty = Math.round(((event.start.getTime() - this.day.getTime()) * 48) / (24 * 60 * 60 * 1000));
			starty = Math.max(0, starty);
			var endy = Math.round(((event.end.getTime() - this.day.getTime()) * 48) / (24 * 60 * 60 * 1000));
			endy = Math.min(48, endy);
			var lengthy = endy - starty;

			// find free places in the grid
			var col = 0;
			for(; col < this.getChildren().length; col++) {
				var isFree = true;
				for(var row = starty; isFree && (row < endy); row++)
					isFree = grid[row][col];
				if(isFree)
					break;
			}
			// take the col
			for(var row = starty; row < endy; row++) {
				grid[row][col] = false;
				this.colsCount[row]++;
			}

			// attach the grid layout data to the item
			item['Calendar.DayGraphItems.attach'] = {
				starty: starty,
				endy: endy,
				lengthy: lengthy,
				col: col
			};
		}
	}
}, {
	measureCore: function(width, height) {
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var attach = item['Calendar.DayGraphItems.attach'];

			var starty = attach.starty * height / 48;
			var endy = attach.endy * height / 48;

			var maxItemsPerRows = 0;
			for(var row = attach.starty; row < attach.endy; row++) {
				if(this.colsCount[row] > maxItemsPerRows)
					maxItemsPerRows = this.colsCount[row];
			}
			var colWidth = width / maxItemsPerRows;

			item.measure(colWidth, height / 48 * attach.lengthy);
		}
		return { width: 0, height: 0 };
	},

	arrangeCore: function(width, height) {
		for(var i = 0; i < this.getChildren().length; i++) {
			var item = this.getChildren()[i];
			var attach = item['Calendar.DayGraphItems.attach'];

			var starty = attach.starty * height / 48;
			var endy = attach.endy * height / 48;

			var maxItemsPerRows = 0;
			for(var row = attach.starty; row < attach.endy; row++) {
				if(this.colsCount[row] > maxItemsPerRows)
					maxItemsPerRows = this.colsCount[row];
			}
			var colWidth = width / maxItemsPerRows;

			item.arrange(attach.col * colWidth, starty, colWidth, endy-starty);
		}
	}
});

Ui.CanvasElement.extend('Calendar.DayClocks', {
}, {
	measureCore: function(width, height) {
		var fontSize = this.getStyleProperty('fontSize');

		var hoursWidth = 0;
		for(var i = 0; i < 24; i++) {
			var hour = i.toString();
			if(hour.length < 2)
				hour = '0'+hour;
			hour += ':00';
			var size = Ui.Label.measureText(hour, fontSize, 'sans-serif', 'normal');
			if(size.width > hoursWidth)
				hoursWidth = size.width;
		}
		return { width: hoursWidth + 10, height: fontSize*1.5+1000+(fontSize/2) };
	},

	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var fontSize = this.getStyleProperty('fontSize');

		ctx.font = 'default normal '+Math.round(fontSize)+'px sans-serif';
		var hourWidth = w;

		ctx.fillStyle = 'rgba(50,50,50,1)';
		for(var i = 0; i < 24; i++) {
			var hour = i.toString();
			if(hour.length < 2)
				hour = '0'+hour;
			hour += ':00';
			var metrics = ctx.measureText(hour);
			ctx.fillText(hour, hourWidth - metrics.width - 2, (i * 1000 / 24) + 2 + fontSize*0.66);
		}
	}
}, {
	style: {
		color: '#000000',
		fontSize: 12
	}
});

Ui.Container.extend('Calendar.DaysBox', {
	title: undefined,
	titleWidth: 0,
	days: undefined,

	constructor: function(config) {
		this.title = config.title;
		delete(config.title);
		this.appendChild(this.title);

		this.days = config.days;
		delete(config.days);
		for(var i = 0; i < this.days.length; i++)
			this.appendChild(this.days[i]);
	},

	setTitleWidth: function(width) {
		this.titleWidth = width;
	},

	getMeasureTitleWidth: function() {
		return this.title.getMeasureWidth();
	}

}, {
	measureCore: function(width, height) {
		var minHeight = 0;
		var minColWidth = 0;
		var titleSize = this.title.measure(0, height);
		for(var i = 0; i < this.days.length; i++) {
			var daySize = this.days[i].measure(0, height);
			if(daySize.height > minHeight)
				minHeight = daySize.height;
			if(daySize.width > minColWidth)
				minColWidth = daySize.width;
		}
		return {
			width: titleSize.width + minColWidth * this.days.length + (this.days.length-1) * 5,
			height: minHeight
		};
	},

	arrangeCore: function(width, height) {
		this.title.arrange(0, 0, this.titleWidth, height);
		var colWidth = ((width - this.titleWidth) - ((this.days.length-1) * 5)) / this.days.length;
		var x = this.titleWidth;
		for(var i = 0; i < this.days.length; i++) {
			this.days[i].arrange(x, 0, colWidth, height);
			x += colWidth + 5;
		}
	}
});

Ui.Container.extend('Calendar.WeekView', {
	date: undefined,
	weekStart: undefined,
	header: undefined,
	daysEvents: undefined,
	dayLabel: undefined,
	separator: undefined,
	graph: undefined,
	graphItems: undefined,
	daysBox: undefined,
	scroll: undefined,
	measureTitleWidth: 0,
	measureColWidth: 0,
	now: undefined,
	firstArrangeDone: false,

	constructor: function(config) {
		this.date = config.date;
		delete(config.date);

		this.now = config.now;
		delete(config.now);

		var day = ((this.date.getDay()) - 1) % 7;
		this.weekStart = new Date(this.date.getTime() - (24 * 60 * 60 * 1000 * day));
		this.weekStart = new Date(this.weekStart.getFullYear(), this.weekStart.getMonth(), this.weekStart.getDate(), 0, 0, 0, 0);

		this.header = new Calendar.WeekGraphHeader({ weekStart: this.weekStart, now: this.now });
		this.appendChild(this.header);

		this.dayLabel = new Ui.Label({ text: 'journée', fontSize: 12, margin: 5, marginLeft: 10 });
		this.appendChild(this.dayLabel);

		this.daysEvents = new Calendar.DaysEvents({ start: this.weekStart, count: 7 });
		this.appendChild(this.daysEvents);

		this.separator = new Ui.Rectangle({ fill: 'rgba(200,200,200,1)', height: 2 });
		this.appendChild(this.separator);

		this.scroll = new Ui.ScrollingArea();
		this.appendChild(this.scroll);

		this.graphItems = [];
		var days = [];

		var currentDay = this.weekStart;
		for(var i = 0; i < 7; i++) {
			var lbox = new Ui.LBox();
			days.push(lbox);

			var isCurrentDay = (this.now >= currentDay) && (this.now.getTime() < currentDay.getTime() + (24 * 60 * 60 * 1000));

			lbox.append(new Calendar.DayGraph({ currentDay: isCurrentDay }));
			this.graphItems.push(new Calendar.DayGraphItems({ day: currentDay }));
			lbox.append(this.graphItems[i]);

			currentDay = new Date(currentDay.getTime() + (24 * 60 * 60 * 1000));
		}

		this.daysBox = new Calendar.DaysBox({
			title: new Calendar.DayClocks(),
			days: days
		});

		this.scroll.setContent(this.daysBox);
	},

	setData: function(data) {
		var currentDay = new Date(this.weekStart.getTime());
		for(var i = 0; i < 7; i++) {
			var daystart = currentDay;
			var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));

			var dayItems = this.graphItems[i];
			var events = [];
			// find the events for the day
			for(var i2 = 0; i2 < data.length; i2++) {
				var event = data[i2];
				if(event.day === true)
					continue;

				if(((event.start >= daystart) && (event.start <= dayend)) ||
				   ((event.end >= daystart) && (event.end <= dayend)) ||
				   ((event.start <= daystart) && (event.end >= dayend)))
					events.push(event);
			}
			dayItems.setData(events);
			currentDay = new Date(currentDay.getTime() + (24 * 60 * 60 * 1000));
		}

		var dayEvents = [];
		for(var i = 0; i < data.length; i++) {
			if(data[i].day === true)
				dayEvents.push(data[i]);
		}
		this.daysEvents.setData(dayEvents);
	}
}, {
	measureCore: function(width, height) {
		var headerSize = this.header.measure(width, height);
		var dayLabelSize = this.dayLabel.measure(width, height);
		var daysEventsSize = this.daysEvents.measure(width, height);
		var separatorSize = this.separator.measure(width, height);

		var eventsHeight = Math.max(daysEventsSize.height, dayLabelSize.height);
		var scrollSize = this.scroll.measure(width, height - (headerSize.height + eventsHeight + separatorSize.height));

		this.measureColWidth = this.header.getMeasureColWidth();
		this.measureTitleWidth = Math.max(
			dayLabelSize.width,
			this.daysBox.getMeasureTitleWidth());

		return {
			width: Math.max(
				this.measureTitleWidth + this.measureColWidth * 7 + 5 * 6,
				headerSize.width, daysEventsSize.width, separatorSize.width, scrollSize.width),
			height: headerSize.height +	eventsHeight + separatorSize.height + scrollSize.height
		};
	},
	
	arrangeCore: function(width, height) {
		var y = 0;
		this.header.arrange(this.measureTitleWidth, 0, width-this.measureTitleWidth, this.header.getMeasureHeight());
		y += this.header.getMeasureHeight();

		var eventsHeight = Math.max(this.dayLabel.getMeasureHeight(), this.daysEvents.getMeasureHeight());
		this.dayLabel.arrange(0, y, this.measureTitleWidth, eventsHeight);
		this.daysEvents.arrange(this.measureTitleWidth, y, width-this.measureTitleWidth, eventsHeight);
		y += eventsHeight;
		this.separator.arrange(this.measureTitleWidth, y, width-this.measureTitleWidth, this.separator.getMeasureHeight());
		y += this.separator.getMeasureHeight();

		this.daysBox.setTitleWidth(this.measureTitleWidth);
		this.scroll.arrange(0, y, width, height - y);

		// initial scroll to start the day view to 8h00
		if(this.firstArrangeDone === false) {
			this.firstArrangeDone = true;
				this.scroll.setOffset(undefined, 7.5 * 1000 / 24, true);
		}
	}
});


Ui.CanvasElement.extend('Calendar.DayGraph', {
	currentDay: false,

	constructor: function(config) {
		this.currentDay = (config.currentDay === true);
		delete(config.currentDay);
	}
}, {
	measureCore: function() {
		return { width: 10, height: 1000 };
	},

	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();

		if(this.currentDay) {
			ctx.fillStyle = 'rgba(199,199,255,0.3)';
			ctx.fillRect(0, 0, w, 1000);
		}

		ctx.fillStyle = 'rgba(219,219,219,1)';
		for(var i = 0; i < 24; i++) {
			ctx.fillRect(0, (i * 1000 / 24), w, 1);
		}
		ctx.fillStyle = 'rgba(219,219,219,0.4)';
		for(var i = 0; i < 24; i++) {
			ctx.fillRect(0, (i * 1000 / 24) + (1000/48), w, 1);
		}
	}
});

Ui.Container.extend('Calendar.DayView', {
	date: undefined,
	dayStart: undefined,
	header: undefined,
	daysEvents: undefined,
	dayLabel: undefined,
	separator: undefined,
	graph: undefined,
	graphItems: undefined,
	scroll: undefined,
	daysBox: undefined,
	measureTitleWidth: 0,
	measureColWidth: 0,
	now: undefined,
	firstArrangeDone: false,

	constructor: function(config) {
		this.date = config.date;
		delete(config.date);

		this.now = config.now;
		delete(config.now);

		this.dayStart = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate(), 0, 0, 0, 0);
		var isCurrentDay = (this.now >= this.dayStart) && (this.now.getTime() < this.dayStart.getTime() + (24 * 60 * 60 * 1000));

		this.header = new Ui.Rectangle({ fill: 'rgba(200,200,200,1)', height: 2 });
		this.appendChild(this.header);

		this.dayLabel = new Ui.Label({ text: 'journée', fontSize: 12, margin: 5, marginLeft: 10 });
		this.appendChild(this.dayLabel);

		this.daysEvents = new Calendar.DaysEvents({ start: this.dayStart, count: 1 });
		this.appendChild(this.daysEvents);

		this.separator = new Ui.Rectangle({ fill: 'rgba(200,200,200,1)', height: 2 });
		this.appendChild(this.separator);

		this.scroll = new Ui.ScrollingArea();
		this.appendChild(this.scroll);

		var lbox = new Ui.LBox();


		this.graph = new Calendar.DayGraph({ currentDay: isCurrentDay });
		lbox.append(this.graph);

		this.graphItems = new Calendar.DayGraphItems({ day: this.dayStart });
		lbox.append(this.graphItems);

		this.daysBox = new Calendar.DaysBox({
			title: new Calendar.DayClocks(),
			days: [ lbox ]
		});

		this.scroll.setContent(this.daysBox);
	},

	setData: function(data) {
		var dayEvents = [];
		var timeEvents = [];

		for(var i = 0; i < data.length; i++) {
			if(data[i].day === true)
				dayEvents.push(data[i]);
			else
				timeEvents.push(data[i]);
		}
		this.graphItems.setData(timeEvents);
		this.daysEvents.setData(dayEvents);
	}
}, {
	measureCore: function(width, height) {
		var headerSize = this.header.measure(width, height);
		var dayLabelSize = this.dayLabel.measure(width, height);
		var daysEventsSize = this.daysEvents.measure(width, height);
		var separatorSize = this.separator.measure(width, height);

		var eventsHeight = Math.max(daysEventsSize.height, dayLabelSize.height);

		var scrollSize = this.scroll.measure(width, height - (headerSize.height + eventsHeight + separatorSize.height));

		this.measureTitleWidth = Math.max(
			dayLabelSize.width,
			this.daysBox.getMeasureTitleWidth());

		return {
			width: Math.max(
				this.measureTitleWidth,
				headerSize.width, daysEventsSize.width, separatorSize.width, scrollSize.width),
			height: headerSize.height + eventsHeight + separatorSize.height + scrollSize.height
		};
	},
	
	arrangeCore: function(width, height) {
		var y = 0;
		this.header.arrange(this.measureTitleWidth, 0, width-this.measureTitleWidth, this.header.getMeasureHeight());
		y += this.header.getMeasureHeight();
		var eventsHeight = Math.max(this.dayLabel.getMeasureHeight(), this.daysEvents.getMeasureHeight());
		this.dayLabel.arrange(0, y, this.measureTitleWidth, eventsHeight);
		this.daysEvents.arrange(this.measureTitleWidth, y, width-this.measureTitleWidth, eventsHeight);
		y += eventsHeight;
		this.separator.arrange(this.measureTitleWidth, y, width-this.measureTitleWidth, this.separator.getMeasureHeight());
		y += this.separator.getMeasureHeight();

		this.daysBox.setTitleWidth(this.measureTitleWidth);
		this.scroll.arrange(0, y, width, height - y);

		// initial scroll to start the day view to 8h00
		if(this.firstArrangeDone === false) {
			this.firstArrangeDone = true;
				this.scroll.setOffset(undefined, 7.5 * 1000 / 24, true);
		}
	}
});

Ui.VBox.extend('Calendar.MonthView', {
	data: undefined,
	date: undefined,
	selectedDate: undefined,
	grid: undefined,

	constructor: function(config) {
		if('date' in config) {
			this.date = new Date(config.date.getTime());
			delete(config.date);
		}
		else
			this.date = new Date();
		this.data = config.data;
		delete(config.data);

		this.selectedDate = this.date;

		this.grid = new Ui.Grid({ cols: 'auto,auto,auto,auto,auto,auto,auto', rows: 'auto,auto,auto,auto,auto,auto,auto', horizontalAlign: 'center' });
		this.append(this.grid);
		this.updateDate();
	},

	updateDate: function() {
		var i;
		var dayPivot = [ 6, 0, 1, 2, 3, 4, 5 ];
		var dayNames = [ 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di' ];
		var monthNames = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];

//		this.title.setText(monthNames[this.date.getMonth()]+' '+this.date.getFullYear());

		while(this.grid.getFirstChild() !== undefined)
			this.grid.detach(this.grid.getFirstChild());

		for(i = 0; i < 7; i++)
			this.grid.attach(new Ui.Label({ text: dayNames[i], fontWeight: 'bold', margin: 5 }), i, 0);

		var month = this.date.getMonth();
		var current = new Date(this.date.getTime());
		current.setDate(1);
		var row = 1;
		var now = new Date();
		do {
			var day = new Ui.Pressable();
			day.monthCalendarDate = current;
			this.connect(day, 'press', this.onDaySelect);

			var bg;
			if((current.getFullYear() == now.getFullYear()) && (current.getMonth() == now.getMonth()) && (current.getDate() == now.getDate())) {
				day.monthCalendarCurrent = true;
				bg = new Ui.Rectangle({ fill: new Ui.Color({ r: 0.2, g: 0.4, b: 1, a: 0.4 }), margin: 1 });
				day.append(bg);
			}
			else {
				bg = new Ui.Rectangle({ fill: new Ui.Color({ r: 0.8, g: 0.8, b: 0.8, a: 0.4 }), margin: 1 });
				day.append(bg);
			}

			if((this.selectedDate !== undefined) && (current.getFullYear() === this.selectedDate.getFullYear()) && (current.getMonth() === this.selectedDate.getMonth()) && (current.getDate() === this.selectedDate.getDate()))
				day.append(new Ui.Frame({ frameWidth: 3, fill: 'red', radius: 0 }));

			var disable = false;
			if(this.dayFilter !== undefined) {
				var weekday = current.getDay();
				for(i = 0; (i < this.dayFilter.length) && !disable; i++)
					if(weekday == this.dayFilter[i])
						disable = true;
			}
			if(this.dateFilter !== undefined) {
				var daystr = current.getFullYear()+'/';
				if(current.getMonth() + 1 < 10)
					daystr += '0';
				daystr += (current.getMonth()+1)+'/';
				if(current.getDate() < 10)
					daystr += '0';
				daystr += current.getDate();
				for(i = 0; (i < this.dateFilter.length) && !disable; i++) {
					var re = new RegExp(this.dateFilter[i]);
					if(re.test(daystr)) {
						disable = true;
					}
				}
			}

			if(disable) {
				day.disable();
				day.setOpacity(0.2);
			}

			day.append(new Ui.Label({ text: current.getDate(), margin: 5 }));

			this.grid.attach(day, dayPivot[current.getDay()], row);
			current = new Date(current.getTime() + 1000*60*60*24);
			if(dayPivot[current.getDay()] === 0)
				row++;
		} while(month == current.getMonth());
		this.onStyleChange();
	}
});

Core.Object.extend('Calendar.Data', {
	events: undefined,
	event: undefined,

	constructor: function(config) {
		var text = config.text;
		delete(config.text);
		this.events = [];

		var event = undefined;

		var lines = text.split('\n');
		var line = '';
		for(var i = 0; i < lines.length; i++) {
			if(lines[i].charAt(0) === ' ') {
				line += lines[i].substr(1);
			}
			else {
				if(line !== '')
					this.parseLine(line);
				line = lines[i];
			}
			if(line.charAt(line.length-1) == '\r')
				line = line.substr(0, line.length-1);
		}
		if(line !== '')
			this.parseLine(line);
	},

	parseLine: function(line) {
		var pos = line.indexOf(':');
		if(pos < 0)
			return;
		var cmd = line.substr(0, pos);
		var val = line.substr(pos+1);
		var params = {};

		pos = cmd.indexOf(';');
		if(pos !== -1) {
			var ps = cmd.substr(pos+1).split(';');
			cmd = cmd.substr(0, pos);
			for(var i2 = 0; i2 < ps.length; i2++) {
				pos = ps[i2].indexOf('=');
				if(pos !== -1)
					params[ps[i2].substr(0, pos)] = ps[i2].substr(pos+1);
			}
		}
					
		if(cmd === 'BEGIN') {
			if(val === 'VEVENT') {
				this.event = {};
				this.events.push(this.event);
			}
		}
		else if(cmd === 'END') {
			if(val === 'VEVENT') {
				this.event = undefined;
			}
		}
		else if(event !== undefined) {
			if(cmd == 'DTSTART') {
				this.event.start = this.parseDate(val, params);
				if(params.VALUE === 'DATE')
					this.event.day = true;
			}
			else if(cmd == 'DTEND') {
				this.event.end = this.parseDate(val, params);
			}
			else if(cmd == 'SUMMARY') {
				this.event.summary = this.parseText(val);
			}
			else if(cmd == 'DESCRIPTION') {
				this.event.description = this.parseText(val);
			}
			else if(cmd == 'LOCATION') {
				this.event.location = this.parseText(val);
			}
		}
	},

	parseText: function(text) {
		return text.replace(/\\\\/g, '\\').replace(/\\;/g, ';').replace(/\\,/g, ',').replace(/\\N/g, '\n').replace(/\\n/g, '\n');
	},

	parseDate: function(str, params) {
		//console.log('parseDate('+str+')');
		var year = parseInt(str.substr(0, 4));
		var month = parseInt(str.substr(4, 2)) - 1;
		var day = parseInt(str.substr(6, 2));
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		var date;
		if(str.length > 8) {
			hours = parseInt(str.substr(9, 2));
			minutes = parseInt(str.substr(11, 2));
			seconds = parseInt(str.substr(13, 2));
			date = new Date();
			date.setUTCFullYear(year);
			date.setUTCMonth(month);
			date.setUTCDate(day);
			date.setUTCHours(hours);
			date.setUTCMinutes(minutes);
			date.setUTCSeconds(seconds);
		}
		else {
			date = new Date(year, month, day, 0, 0, 0);
		}
		return date;
	},

	search: function(start, end) {
		var res = [];
		for(var i = 0; i < this.events.length; i++) {
			var event = this.events[i];
			if((event.start !== undefined) && (event.end !== undefined)) {
				if(((event.start >= start) && (event.start < end)) ||
				   ((event.end > start) && (event.end < end)) ||
				   ((event.start <= start) && (event.end >= end))) {
					res.push(event);
				}
			}
		}
		res.sort(function(a,b) {
			if(a.start < b.start)
				return -1;
			else if(a.start > b.start)
				return 1;
			else
				return 0;
		});
		return res;
	},

	searchDay: function(day) {
		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));
		return this.search(daystart, dayend);
	},

	searchWeek: function(day) {
		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var weekDay = ((daystart.getDay()) - 1) % 7;
		var weekStart = new Date(daystart.getTime() - (24 * 60 * 60 * 1000 * weekDay));
		var weekEnd = new Date(weekStart.getTime() + (24 * 60 * 60 * 1000 * 7));
		return this.search(weekStart, weekEnd);
	}

});

Ui.CarouselableLoader.extend('Ui.DayViewDataLoader', {
	data: undefined,
	date: undefined,
	now: undefined,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);
		this.date = new Date();

		this.now = config.now;
		delete(config.now);
	},

	getReferenceDate: function() {
		return this.date;
	},

	dayToLocaleString: function(day) {
		var res = '';
		if(day.getDay() === 1)
			res += 'lundi';
		else if(day.getDay() === 2)
			res += 'mardi';
		else if(day.getDay() === 3)
			res += 'mercredi';
		else if(day.getDay() === 4)
			res += 'jeudi';
		else if(day.getDay() === 5)
			res += 'vendredi';
		else if(day.getDay() === 6)
			res += 'samedi';
		else
			res += 'dimanche';
		res += ' '+day.getDate()+' ';

		if(day.getMonth() === 0)
			res += 'janvier';
		else if(day.getMonth() === 1)
			res += 'fevrier';
		else if(day.getMonth() === 2)
			res += 'mars';
		else if(day.getMonth() === 3)
			res += 'avril';
		else if(day.getMonth() === 4)
			res += 'mai';
		else if(day.getMonth() === 5)
			res += 'juin';
		else if(day.getMonth() === 6)
			res += 'juillet';
		else if(day.getMonth() === 7)
			res += 'août';
		else if(day.getMonth() === 8)
			res += 'septembre';
		else if(day.getMonth() === 9)
			res += 'octobre';
		else if(day.getMonth() === 10)
			res += 'novembre';
		else
			res += 'décembre';

		res += ' '+day.getFullYear();

		return res;
	},
		
	buildUi: function(day, pos) {
		var res = this.data.searchDay(day);

		var scroll = new Ui.ScrollingArea({ margin: 10 });

		var vbox = new Ui.VBox({ spacing: 10 });
		scroll.setContent(vbox);

		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var weight = 'normal';
		if((this.now >= daystart) && (this.now.getTime() < daystart.getTime() + (24 * 60 * 60 * 1000)))
			weight = 'bold';
		
		vbox.append(new Ui.Label({ horizontalAlign: 'center', fontSize: 20, fontWeight: weight, margin: 10, text: this.dayToLocaleString(day) }));

		var dayView = new Calendar.DayView({ date: day, data: res, now: this.now });
		vbox.append(dayView, true);
		return scroll;
	}

}, {
	getMin: function() {
		if(Number.MIN_SAFE_INTEGER)
			return Number.MIN_SAFE_INTEGER;
		else
			return -9007199254740991;
	},

	getMax: function() {
		if(Number.MAX_SAFE_INTEGER)
			return Number.MAX_SAFE_INTEGER;
		else
			return 9007199254740991;
	},
	
	getElementAt: function(position) {
		var day = new Date(this.date.getTime() + (position * 24 * 60 * 60 * 1000));
		return this.buildUi(day, position);
	}
});

Ui.CarouselableLoader.extend('Ui.WeekViewDataLoader', {
	data: undefined,
	date: undefined,
	now: undefined,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);
		this.date = new Date();

		this.now = config.now;
		delete(config.now);
	},

	getReferenceDate: function() {
		return this.date;
	},

	weekToLocaleString: function(day) {
		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var weekDay = ((daystart.getDay()) - 1) % 7;
		var weekStart = new Date(daystart.getTime() - (24 * 60 * 60 * 1000 * weekDay));
		var weekEnd = new Date(weekStart.getTime() + (24 * 60 * 60 * 1000 * 6));

		var res = '';
		if(weekStart.getFullYear() === weekEnd.getFullYear()) {
			if(weekStart.getMonth() === weekEnd.getMonth())
				res = weekStart.getDate()+' - '+weekEnd.getDate()+' '+Ui.WeekViewDataLoader.monthToString[weekStart.getMonth()];
			else
				res = weekStart.getDate()+' '+Ui.WeekViewDataLoader.monthToString[weekStart.getMonth()]+
					' - '+weekEnd.getDate()+' '+Ui.WeekViewDataLoader.monthToString[weekEnd.getMonth()];
			res += ' '+weekStart.getFullYear();
		}
		else {
			res = weekStart.getDate()+' '+Ui.WeekViewDataLoader.monthToString[weekStart.getMonth()]+' '+weekStart.getFullYear()+
					' - '+weekEnd.getDate()+' '+Ui.WeekViewDataLoader.monthToString[weekEnd.getMonth()]+' '+weekEnd.getFullYear();
		}
		return res;
	},
		
	buildUi: function(day, pos) {
		var res = this.data.searchWeek(day);

		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var weekDay = ((daystart.getDay()) - 1) % 7;
		var weekStart = new Date(daystart.getTime() - (24 * 60 * 60 * 1000 * weekDay));
		var weekEnd = new Date(weekStart.getTime() + (24 * 60 * 60 * 1000 * 6));

		var scroll = new Ui.ScrollingArea({ margin: 10 });

		var vbox = new Ui.VBox({ spacing: 10 });
		scroll.setContent(vbox);

		var weight = 'normal';
		if((this.now >= weekStart) && (this.now < weekEnd))
			weight = 'bold';
		vbox.append(new Ui.Label({ horizontalAlign: 'center', fontSize: 20, fontWeight: weight, margin: 10, text: this.weekToLocaleString(day) }));

		var weekView = new Calendar.WeekView({ date: day, data: res, now: this.now });
		vbox.append(weekView, true);
		return scroll;
	}

}, {
	getMin: function() {
		if(Number.MIN_SAFE_INTEGER)
			return Number.MIN_SAFE_INTEGER;
		else
			return -9007199254740991;
	},

	getMax: function() {
		if(Number.MAX_SAFE_INTEGER)
			return Number.MAX_SAFE_INTEGER;
		else
			return 9007199254740991;
	},
	
	getElementAt: function(position) {
		var day = new Date(this.date.getTime() + (position * 24 * 60 * 60 * 1000 * 7));
		return this.buildUi(day, position);
	}
}, {
	monthToString: {
		0: 'janvier',
		1: 'février',
		2: 'mars',
		3: 'avril',
		4: 'mai',
		5: 'juin',
		6: 'juillet',
		7: 'août',
		8: 'septembre',
		9: 'octobre',
		10: 'novembre',
		11: 'décembre'
	}
});

Ui.CarouselableLoader.extend('Ui.MonthViewDataLoader', {
	data: undefined,
	date: undefined,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);
		this.date = new Date();
	},

	getReferenceDate: function() {
		return this.date;
	},
			
	buildUi: function(day, pos) {
		return new Ui.Rectangle({ fill: 'red', margin: 10 });
	}

}, {
	getMin: function() {
		if(Number.MIN_SAFE_INTEGER)
			return Number.MIN_SAFE_INTEGER;
		else
			return -9007199254740991;
	},

	getMax: function() {
		if(Number.MAX_SAFE_INTEGER)
			return Number.MAX_SAFE_INTEGER;
		else
			return 9007199254740991;
	},
	
	getElementAt: function(position) {
		var day = new Date(this.date.getTime() + (position * 24 * 60 * 60 * 1000));
		return this.buildUi(day, position);
	}
});



Wn.ResourceViewer.extend('Calendar.App', {
	data: undefined,
	scroll: undefined,
	viewBar: undefined,
	dayview: undefined,
	currentDay: undefined,
	dateLabel: undefined,
	tools: undefined,
	carousel: undefined,
	loader: undefined,
	contentBox: undefined,
	bg: undefined,
	now: undefined,

	constructor: function(config) {
		this.tools = [];

		this.now = new Date();

		this.bg = new Ui.Rectangle();
		this.append(this.bg);
		this.contentBox = new Ui.LBox();
		this.append(this.contentBox);

		var button = new Ui.Button({ text: 'Aujourd\'hui'});
		this.tools.push(button);
		this.connect(button, 'press', this.onTodayPress);

		this.viewBar = new Ui.SegmentBar({
			margin: 5,
			field: 'text', data: [
				{ text: 'Jour' }, { text: 'Semaine' }
			]
		});
		this.viewBar.setCurrentPosition(1);
		this.connect(this.viewBar, 'change', this.onViewBarChange);
		this.tools.push(this.viewBar);

//		button = new Ui.Button({ icon: 'arrowleft'});
//		this.tools.push(button);
//		this.connect(button, 'press', this.onPreviousPress);

//		button = new Ui.Button({ icon: 'arrowright'});
//		this.tools.push(button);
//		this.connect(button, 'press', this.onNextPress);

		var vbox = new Ui.VBox({ verticalAlign: 'center', spacing: 10 });
		vbox.append(new Ui.Loading({ width: 50, height: 50, horizontalAlign: 'center' }));
		vbox.append(new Ui.Text({ text: 'Chargement en cours... Veuillez patienter', textAlign: 'center' }));
		this.contentBox.setContent(vbox);

		this.request = new Core.HttpRequest({ url: '/cloud/proxy?url='+encodeURIComponent(this.getResource().getData().data) });
		this.connect(this.request, 'done', this.onGetCalendarDone);
		this.connect(this.request, 'error', this.onGetCalendarError);
		this.request.send();

		this.setActionButtons(this.tools);
	},

	onGetCalendarDone: function(request) {
		var text = request.getResponseText();
		this.data = new Calendar.Data({ text: text });

		if(this.viewBar.getCurrentPosition() === 0)
			this.loader = new Ui.DayViewDataLoader({ data: this.data, now: this.now });
		else
			this.loader = new Ui.WeekViewDataLoader({ data: this.data, now: this.now });
//		this.loader = new Ui.MonthViewDataLoader({ data: this.data });

		this.carousel = new Ui.Carousel3({ loader: this.loader });
		this.contentBox.setContent(this.carousel);
	},

	onGetCalendarError: function(request) {
	},

	setCurrentDate: function(date) {
		var pos = Math.floor((date.getTime() - this.loader.getReferenceDate().getTime()) / (24 * 60 * 60 * 1000));
		this.carousel.setCurrentAt(pos);
	},

	onPreviousPress: function() {
		this.carousel.previous();
	},

	onNextPress: function() {
		this.carousel.next();
	},

	onTodayPress: function() {
		this.setCurrentDate(new Date());
	},

	onViewBarChange: function() {
		if(this.viewBar.getCurrentPosition() === 0)
			this.loader = new Ui.DayViewDataLoader({ data: this.data, now: this.now });
		else
			this.loader = new Ui.WeekViewDataLoader({ data: this.data, now: this.now });
//		this.loader = new Ui.MonthViewDataLoader({ data: this.data });

		this.carousel = new Ui.Carousel3({ loader: this.loader });
		this.contentBox.setContent(this.carousel);
	}

}, {
	onStyleChange: function() {
		this.bg.setFill(this.getStyleProperty('background'));
	}
}, {
	constructor: function() {
		this.register('calendar', this);
	}
});

