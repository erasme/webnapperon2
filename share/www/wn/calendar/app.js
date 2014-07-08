
Ui.Dialog.extend('Calendar.EventDetail', {
	event: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		this.setCancelButton(new Ui.DialogCloseButton());
		this.setTitle('Détail');
		this.setFullScrolling(true);
		this.setPreferredWidth(500);
		this.setPreferredHeight(400);

		var sflow = new Ui.SFlow({ itemAlign: 'stretch', stretchMaxRatio: 10, spacing: 10 });
		this.setContent(sflow);

		sflow.append(new Wn.TextField({ title: 'Titre', value: this.event.summary, width: 400, disabled: true }));
		sflow.append(new Wn.DateField({ title: 'Début', value: this.event.start, width: 150, disabled: true }));
		sflow.append(new Wn.DateField({ title: 'Fin', value: this.event.end, width: 150, disabled: true }));
		sflow.append(new Wn.TextField({ title: 'Lieu', value: this.event.location, width: 400, disabled: true }));
		sflow.append(new Wn.TextAreaField({ title: 'Description', value: this.event.description, width: 400, disabled: true }));
	}
});

Ui.Pressable.extend('Calendar.DayViewItem', {
	event: undefined,
	text: undefined,

	constructor: function(config) {
		this.event = config.event;
		delete(config.event);

		this.append(new Ui.Rectangle({ fill: '#b0b0f0', margin: 2 }));

		var summary = this.event.summary;
		if(summary == undefined)
			summary = '';
		this.text = new Ui.Text({ text: summary, margin: 7 });
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

Ui.VBox.extend('Calendar.DayView', {
	data: undefined,
	graph: undefined,
	day: undefined,
	dayEvents: undefined,

	constructor: function(config) {

		this.setSpacing(10);

		var vbox = new Ui.VBox({ spacing: 4 });
		this.append(vbox);

		vbox.append(new Ui.Rectangle({ fill: 'rgba(0,0,0,0.4)', height: 2, marginLeft: 100 }));

		var hbox = new Ui.HBox();
		vbox.append(hbox);

		hbox.append(new Ui.Text({
			text: 'journée', verticalAlign: 'center', 
			textAlign: 'right', width: 95, opacity: 0.6, marginRight: 5
		}));

		this.dayEvents = new Ui.VBox();
		hbox.append(this.dayEvents, true);

		vbox.append(new Ui.Rectangle({ fill: 'rgba(0,0,0,0.4)', height: 2, marginLeft: 100 }));

		var scroll = new Ui.ScrollingArea();
		this.append(scroll, true);

		this.graph = new Calendar.DayGraph();
		scroll.setContent(this.graph);
	},

	setData: function(data, day) {
		this.data = data;
		this.day = day;

		var timeEvents = [];
		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));

		this.dayEvents.clear();

		for(var i = 0; i < this.data.length; i++) {
			var event = this.data[i];
			if((event.start <= daystart) && (event.end >= dayend)) {
				console.log('day event');
				console.log(event);

				var item = new Calendar.DayViewItem({ event: event });
				this.dayEvents.append(item);
			}
			else {
				timeEvents.push(event);
			}
		}
		this.graph.setData(timeEvents, day);
	}
});

Ui.Container.extend('Calendar.DayGraph', {
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
//		this.shadow = new Ui.Rectangle({ fill: '#ffffff' });
//		this.appendChild(this.shadow);

//		var yuv = Ui.Color.create('#eeeeee').getYuv();
//		var fill = new Ui.LinearGradient({ stops: [
//			{ offset: 0, color: new Ui.Color({ y: yuv.y + 0.10, u: yuv.u, v: yuv.v }) },
//			{ offset: 1, color: new Ui.Color({ y: yuv.y - 0.05, u: yuv.u, v: yuv.v }) }
//		] });
//		this.background = new Ui.Rectangle({ fill: fill });
//		this.appendChild(this.background);

//		this.frame = new Ui.Frame({ frameWidth: 1, fill: '#cccccc' });
//		this.appendChild(this.frame);

//		this.eventbg = new Ui.Rectangle({ radiusTopRight: 2, radiusBottomRight: 2, fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.03}) });
//		this.appendChild(this.eventbg);

		this.items = [];

		this.lines = [];
		for(var i = 0; i < 24; i++) {
			var line = new Ui.Rectangle({ fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.4 }) });
			this.lines.push(line);
			this.appendChild(line);
		}
		this.interlines = [];
		for(var i = 0; i < 24; i++) {
			var line = new Ui.Rectangle({ fill: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.1 }) });
			this.interlines.push(line);
			this.appendChild(line);
		}
		this.hours = [];
		for(var i = 0; i < 24; i++) {
			var label = i.toString();
			if(label.length < 2)
				label = '0'+label;
			var hour = new Ui.Label({ color: new Ui.Color({ r: 0, g: 0, b: 0, a: 0.4 }), text: label+':00' });
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
			this.items.push(item);
			this.appendChild(item);
		}
	}

}, {
	measureCore: function(width, height) {
		var fontSize = this.getStyleProperty('fontSize');
		for(var i = 0; i < this.hours.length; i++) {
			this.hours[i].measure(0, 0);
		}
		return { width: width, height: 1000+(fontSize/2) };
	},

	arrangeCore: function(width, height) {
		var fontSize = this.getStyleProperty('fontSize');
		// arrange background
//		this.frame.arrange(0, 0, width, 1000);
//		this.shadow.arrange(1, 1, width-2, 1000-2);
//		this.background.arrange(2, 2, width-4, 1000-3);
//		this.eventbg.arrange(2+100, 2, width-(4+100), 1000-4);
		for(var i = 0; i < this.lines.length; i++) {
			this.lines[i].arrange(3+100, (i * 1000 / 24)+fontSize/2, width-(6+100), 1);
		}
		for(var i = 0; i < this.interlines.length; i++) {
			this.interlines[i].arrange(3+100, (i * 1000 / 24) + (1000/48) + fontSize/2, width-(6+100), 1);
		}
		for(var i = 0; i < this.hours.length; i++) {
			var hour = this.hours[i];
			hour.arrange(3+100 - hour.getMeasureWidth() - 2, (i * 1000 / 24) + 2  + (fontSize - hour.getMeasureHeight())/2, hour.getMeasureWidth(), hour.getMeasureHeight());
		}

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

			//console.log('start: '+eventstart+', end: '+eventend+', day: '+this.day);

			var starty = (eventstart.getTime() - this.day.getTime()) / (24 * 60 * 60 * 1000);
			var endy = (eventend.getTime() - this.day.getTime()) / (24 * 60 * 60 * 1000);
			item.arrange(100+10, starty * 1000 + fontSize/2, width - (100 + 20), (endy -starty) * 1000);
		}
	}
}, {
	style: {
		fontSize: 16
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
					event.start = this.parseDate(val, params);
				}
				else if(cmd == 'DTEND') {
					event.end = this.parseDate(val, params);
				}
				else if(cmd == 'SUMMARY') {
					event.summary = val;
				}
				else if(cmd == 'DESCRIPTION') {
					event.description = val;
				}
				else if(cmd == 'LOCATION') {
					event.location = val;
				}
			}
		}
		//console.log('NB LINES: '+lines.length);
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
			console.log(date);
		}
		return date;
	},

	searchDay: function(day) {
		//console.log('search for day: '+day);

		var daystart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
		var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));

		var res = [];
		for(var i = 0; i < this.events.length; i++) {
			var event = this.events[i];
			if((event.start !== undefined) && (event.end !== undefined)) {
				if(((event.start >= daystart) && (event.start < dayend)) ||
				   ((event.end > daystart) && (event.end < dayend)) ||
				   ((event.start <= daystart) && (event.end >= dayend))) {
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
	}
});

Wn.ResourceViewer.extend('Calendar.App', {
	data: undefined,
	vbox: undefined,
	scroll: undefined,
	dayview: undefined,
	currentDay: undefined,
	dateLabel: undefined,
	tools: undefined,

	constructor: function(config) {
		this.tools = [];

		this.vbox = new Ui.VBox();
		this.setContent(this.vbox);

		var hbox = new Ui.HBox({ margin: 10, spacing: 5 });
		this.vbox.append(hbox);

		var button = new Ui.Button({ text: 'Aujourd\'hui'});
		this.tools.push(button);
		//hbox.append(button);
		this.connect(button, 'press', this.onTodayPress);

		button = new Ui.Button({ icon: 'arrowleft'});
		this.tools.push(button);
		//hbox.append(button);
		this.connect(button, 'press', this.onPreviousPress);

		button = new Ui.Button({ icon: 'arrowright'});
		this.tools.push(button);
		//hbox.append(button);
		this.connect(button, 'press', this.onNextPress);

		this.dateLabel = new Ui.Label({ horizontalAlign: 'center', fontSize: 20 });
		hbox.append(this.dateLabel, true);

//		var segmentbar = new Ui.SegmentBar({ field: 'text', horizontalAlign: 'right', verticalAlign: 'center', data: [
//			{ text: 'Jour' }, { text: 'Semaine' }, { text: 'Mois' }
//		]});
//		hbox.append(segmentbar);

		this.scroll = new Ui.ScrollingArea({ margin: 20, scrollHorizontal: false });
		this.vbox.append(this.scroll, true);

		this.dayview = new Calendar.DayView();
		this.scroll.setContent(this.dayview);

		this.request = new Core.HttpRequest({ url: '/cloud/proxy?url='+encodeURIComponent(this.getResource().getData().data) });
		this.connect(this.request, 'done', this.onGetCalendarDone);
		this.connect(this.request, 'error', this.onGetCalendarError);
		this.request.send();

		this.setActionButtons(this.tools);
	},

	onGetCalendarDone: function(request) {
		//console.log('Calendar DONE');

		var text = request.getResponseText();
		this.data = new Calendar.Data({ text: text });

		console.log(this.data);

		this.setCurrentDate(new Date());
//		this.setCurrentDate(new Date('2012/01/24'));
	},

	onGetCalendarError: function(request) {
	},

	setCurrentDate: function(date) {
//		this.currentDay = date;
		this.currentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
		var res = this.data.searchDay(this.currentDay);

		//console.log(res);

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

