
Ui.Popup.extend('Calendar.EventDetail', {
	event: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		var grid = new Ui.Grid({ cols: 'auto,auto', rows: 'auto,auto,auto' });
		this.setContent(grid);

		grid.attach(new Ui.Label({ margin: 5, text: this.event.summary, horizontalAlign: 'center', fontWeight: 'bold' }), 0, 0, 2, 1);
		grid.attach(new Ui.Label({ margin: 5, text: 'Début', horizontalAlign: 'right', fontWeight: 'bold' }), 0, 1, 1, 1);
		grid.attach(new Ui.Label({ margin: 5, text: this.event.start }), 1, 1, 1, 1);
		grid.attach(new Ui.Label({ margin: 5, text: 'Fin', horizontalAlign: 'right', fontWeight: 'bold' }), 0, 2, 1, 1);
		grid.attach(new Ui.Label({ margin: 5, text: this.event.end }), 1, 2, 1, 1);
	}
});

Ui.Pressable.extend('Calendar.DayViewItem', {
	event: undefined,
	text: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		this.append(new Ui.Rectangle({ fill: 'lightgreen', margin: 2 }));

		var summary = this.event.summary;
		if(summary == undefined)
			summary = '';
		this.text = new Ui.Text({ text: summary, margin: 7 });
		this.append(this.text);
	},

	getEvent: function() {
		return this.event;
	}
});

Ui.LBox.extend('Calendar.DayView', {
	data: undefined,
	day: undefined,
	frame: undefined,
	shadow: undefined,
	background: undefined,
	eventbg: undefined,
	items: undefined,
	lines: undefined,
	interlines: undefined,
	hours: undefined,

	constructor: function(config) {
		this.shadow = new Ui.Rectangle({ fill: '#ffffff' });
		this.appendChild(this.shadow);

		var yuv = Ui.Color.create('#eeeeee').getYuv();
		var fill = new Ui.LinearGradient({ stops: [
			{ offset: 0, color: new Ui.Color({ y: yuv.y + 0.10, u: yuv.u, v: yuv.v }) },
			{ offset: 1, color: new Ui.Color({ y: yuv.y - 0.05, u: yuv.u, v: yuv.v }) }
		] });
		this.background = new Ui.Rectangle({ fill: fill });
		this.appendChild(this.background);

		this.frame = new Ui.Frame({ frameWidth: 1, fill: '#cccccc' });
		this.appendChild(this.frame);

		this.eventbg = new Ui.Rectangle({ radiusTopRight: 2, radiusBottomRight: 2, fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.03}) });
		this.appendChild(this.eventbg);

		this.items = [];

		this.lines = [];
		for(var i = 0; i < 24; i++) {
			var line = new Ui.Rectangle({ fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.1 }) });
			this.lines.push(line);
			this.appendChild(line);
		}
		this.interlines = [];
		for(var i = 0; i < 24; i++) {
			var line = new Ui.Rectangle({ fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.05 }) });
			this.interlines.push(line);
			this.appendChild(line);
		}
		this.hours = [];
		for(var i = 0; i < 24; i++) {
			var label = i.toString();
			if(label.length < 2)
				label = '0'+label;
			var hour = new Ui.Label({ color: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.3 }), text: label+':00' });
			this.hours.push(hour);
			this.appendChild(hour);
		}
	},

	setData: function(data, day) {
		this.data = data;
//		this.day = day;
		this.day = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			this.removeChild(item);
		}
		this.items = [];
		for(var i = 0; i < this.data.length; i++) {
			var event = this.data[i];
			var item = new Calendar.DayViewItem({ event: event });
			this.connect(item, 'press', this.onDayItemPress);
			this.items.push(item);
			this.appendChild(item);
		}
	},

	onDayItemPress: function(dayitem) {
		console.log('onDayItemPress '+dayitem.getEvent().summary);
		var detailpopup = new Calendar.EventDetail({ event: dayitem.getEvent() });
		detailpopup.show();
	}

}, {
	measureCore: function(width, height) {
		for(var i = 0; i < this.hours.length; i++) {
			this.hours[i].measure(0, 0);
		}
		return { width: width, height: 1000 };
	},

	arrangeCore: function(width, height) {
		// arrange background
		this.frame.arrange(0, 0, width, 1000);
		this.shadow.arrange(1, 1, width-2, 1000-2);
		this.background.arrange(2, 2, width-4, 1000-3);
		this.eventbg.arrange(2+100, 2, width-(4+100), 1000-4);
		for(var i = 0; i < this.lines.length; i++) {
			this.lines[i].arrange(3, ((i+1) * 1000 / 24), width-6, 1);
		}
		for(var i = 0; i < this.interlines.length; i++) {
			this.interlines[i].arrange(3+100, (i * 1000 / 24) + (1000/48), width-(6+100), 1);
		}
		for(var i = 0; i < this.hours.length; i++) {
			var hour = this.hours[i];
			hour.arrange(3+100 - hour.getMeasureWidth() - 2, (i * 1000 / 24) + 2, hour.getMeasureWidth(), hour.getMeasureHeight());
		}

		console.log('arrange items:');
		// arrange items
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			var event = item.getEvent();
	
			var daystart = new Date(this.day.getFullYear(), this.day.getMonth(), this.day.getDate(), 0, 0, 0, 0);
			var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));

			var eventstart = event.start;
			if(eventstart < daystart)
				eventstart = daystart;
			var eventend = event.end;
			if(eventend > dayend)
				eventend = dayend;

			console.log('start: '+eventstart+', end: '+eventend+', day: '+this.day);

			var starty = (eventstart.getTime() - this.day.getTime()) / (24 * 60 * 60 * 1000);
			var endy = (eventend.getTime() - this.day.getTime()) / (24 * 60 * 60 * 1000);
			item.arrange(100+10, starty * 1000, width - (100 + 20), (endy -starty) * 1000);
		}
	}
});

Core.Object.extend('Calendar.Data', {
	events: undefined,

	constructor: function(config) {
		var text = config.text;
		delete(config.text);
		this.events = [];

		var event = undefined;

		var lines = text.split('\n');
		for(var i = 0; i < lines.length; i++) {
			var pos = lines[i].indexOf(':');
			if(pos < 0)
				continue;
			var cmd = lines[i].substr(0, pos);
			var val = lines[i].substr(pos+1);

			if(val.charAt(val.length-1) == '\r')
				val = val.substr(0, val.length-1);
			
			if(cmd == 'BEGIN') {
				if(val == 'VEVENT') {
					event = {};
					this.events.push(event);
				}
			}
			else if(cmd == 'END') {
				if(val == 'VEVENT') {
					event = undefined;
				}
			}
			else if(event != undefined) {
				if(cmd == 'DTSTART') {
					event.start = this.parseDate(val);
				}
				else if(cmd == 'DTEND') {
					event.end = this.parseDate(val);
				}
				else if(cmd == 'SUMMARY') {
					event.summary = val;
				}
				else if(cmd == 'DESCRIPTION') {
					event.description = val;
				}
			}
		}
		console.log('NB LINES: '+lines.length);
	},

	parseDate: function(str) {
		var year = parseInt(str.substr(0, 4));
		var month = parseInt(str.substr(4, 2)) - 1;
		var day = parseInt(str.substr(6, 2));
		var hours = parseInt(str.substr(9, 2));
		var minutes = parseInt(str.substr(11, 2));
		var seconds = parseInt(str.substr(13, 2));
		return new Date(year, month, day, hours, minutes, seconds, 0);
	},

	searchDay: function(day) {
		console.log('search for day: '+day);

		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));

		var res = [];
		for(var i = 0; i < this.events.length; i++) {
			var event = this.events[i];
			if((event.start != undefined) && (event.end != undefined)) {
				if(((event.start >= daystart) && (event.start < dayend)) ||
				   ((event.end >= daystart) && (event.end < dayend))) {
					res.push(event);
				}
			}
		}
		return res;
	}
});

Wn.ResourceViewer.extend('Calendar.App', {
	data: undefined,
	vbox: undefined,
	scroll: undefined,
	dayview: undefined,
	currentDay: undefined,
	dateLabel: undefined,

	constructor: function(config) {
		this.vbox = new Ui.VBox();
		this.setContent(this.vbox);

		var hbox = new Ui.HBox({ margin: 10, spacing: 5 });
		this.vbox.append(hbox);

		var button = new Ui.Button({ text: 'Aujourd\'hui'});
		hbox.append(button);
		this.connect(button, 'press', this.onTodayPress);

		button = new Ui.Button({ icon: 'arrowleft'});
		hbox.append(button);
		this.connect(button, 'press', this.onPreviousPress);

		button = new Ui.Button({ icon: 'arrowright'});
		hbox.append(button);
		this.connect(button, 'press', this.onNextPress);

		this.dateLabel = new Ui.Label({ horizontalAlign: 'center', fontSize: 20 });
		hbox.append(this.dateLabel, true);

//		var segmentbar = new Ui.SegmentBar({ field: 'text', horizontalAlign: 'right', verticalAlign: 'center', data: [
//			{ text: 'Jour' }, { text: 'Semaine' }, { text: 'Mois' }
//		]});
//		hbox.append(segmentbar);

		this.scroll = new Ui.ScrollingArea({ margin: 20, directionRelease: true, scrollHorizontal: false });
		this.vbox.append(this.scroll, true);

		this.dayview = new Calendar.DayView();
		this.scroll.setContent(this.dayview);

		this.request = new Core.HttpRequest({ url: '/cloud/proxy?url='+encodeURIComponent(this.getResource().getData()) });
		this.connect(this.request, 'done', this.onGetCalendarDone);
		this.connect(this.request, 'error', this.onGetCalendarError);
		this.request.send();
	},

	onGetCalendarDone: function(request) {
		console.log('Calendar DONE');

		var text = request.getResponseText();
		this.data = new Calendar.Data({ text: text });

		this.setCurrentDate(new Date());
//		this.setCurrentDate(new Date('2012/01/24'));
	},

	onGetCalendarError: function(request) {
	},

	setCurrentDate: function(date) {
//		this.currentDay = date;
		this.currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
		var res = this.data.searchDay(this.currentDay);
		this.dayview.setData(res, this.currentDay);
		this.dateLabel.setText(this.currentDay.toDateString());
	},

	onPreviousPress: function() {
		this.setCurrentDate(new Date(this.currentDay.getTime() - (24 * 60 * 60 * 1000)));
	},

	onNextPress: function() {
		this.setCurrentDate(new Date(this.currentDay.getTime() + (24 * 60 * 60 * 1000)));
	},

	onTodayPress: function() {
		this.setCurrentDate(new Date());
	}

}, {}, {
	constructor: function() {
		this.register('calendar', this);
	}
});

