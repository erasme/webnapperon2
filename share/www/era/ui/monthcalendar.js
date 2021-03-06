Ui.VBox.extend('Ui.MonthCalendar',
/**@lends Ui.MonthCalendar#*/
{
	selectedDate: undefined,
	date: undefined,
	title: undefined,
	leftarrow: undefined,
	rightarrow: undefined,
	grid: undefined,
	dayFilter: undefined,
	dateFilter: undefined,

	/**
	* @constructs
	* @class The MonthCalendar is a small month calendar which allow
	* to select a day.
	* @extends Ui.VBox
	*/
	constructor: function(config) {
		this.addEvents('dayselect');

		if('date' in config) {
			this.date = new Date(config.date.getTime());
			delete(config.date);
		}
		else
			this.date = new Date();
		if('selectedDate' in config) {
			this.selectedDate = config.selectedDate;
			delete(config.selectedDate);
		}

		var hbox = new Ui.HBox();
		this.append(hbox);

		var button = new Ui.Pressable({ verticalAlign: 'center' });
		this.leftarrow = new Ui.Icon({ icon: 'arrowleft', width: 24, height: 24 });
		button.append(this.leftarrow);
		hbox.append(button);
		this.connect(button, 'press', this.onLeftButtonPress);

		this.title = new Ui.Label({ fontWeight: 'bold', fontSize: 18, margin: 5 });
		hbox.append(this.title, true);

		button = new Ui.Pressable({ verticalAlign: 'center' });
		this.rightarrow = new Ui.Icon({ icon: 'arrowright', width: 24, height: 24 });
		button.append(this.rightarrow);
		hbox.append(button);
		this.connect(button, 'press', this.onRightButtonPress);

		this.grid = new Ui.Grid({ cols: 'auto,auto,auto,auto,auto,auto,auto', rows: 'auto,auto,auto,auto,auto,auto,auto', horizontalAlign: 'center' });
		this.append(this.grid);

		this.updateDate();
	},

	/**
	 * @param {Number[]} Array of day to disable (from 0 to 6), 0 is sunday
	 */
	setDayFilter: function(dayFilter) {
		this.dayFilter = dayFilter;
		this.updateDate();
	},

	/**
	 * @param {String[]} Array of dates to disable. This dates must always be in yyyy/mm/dd format and will be converted to regex
	 * so you can do a lot of things
	 * @ example
	 * var calendar = new Ui.MonthCalendar();
	 * calendar.setDateFilter([ '2011/11/2[1-5]', '2011/12/*', '2012/0[2-3]/.[4]' ]);
	 */
	setDateFilter: function(dateFilter) {
		this.dateFilter = dateFilter;
		this.updateDate();
	},

	/**#@+
	* @private
	*/

	onLeftButtonPress: function() {
		this.date.setMonth(this.date.getMonth() - 1);
		this.updateDate();
	},

	onRightButtonPress: function() {
		this.date.setMonth(this.date.getMonth() + 1);
		this.updateDate();
	},

	getSelectedDate: function() {
		return this.selectedDate;
	},

	onDaySelect: function(button) {
		this.selectedDate = button.monthCalendarDate;
		this.updateDate();
		this.fireEvent('dayselect', this, this.selectedDate);
	},

	updateDate: function() {
		var i;
		var dayPivot = [ 6, 0, 1, 2, 3, 4, 5 ];
		var dayNames = [ 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di' ];
		var monthNames = [ 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre' ];

		this.title.setText(monthNames[this.date.getMonth()]+' '+this.date.getFullYear());

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
	/**#@-*/
},
/** @lends Ui.MonthCalendar# */
{
	onStyleChange: function() {
		var color = this.getStyleProperty('color');
		var dayColor = this.getStyleProperty('dayColor');
		var currentDayColor = this.getStyleProperty('currentDayColor');
		this.title.setColor(color);
		this.leftarrow.setFill(color);
		this.rightarrow.setFill(color);

		for(var i = 0; i < this.grid.getChildren().length; i++) {
			var child = this.grid.getChildren()[i];
			if(Ui.Label.hasInstance(child))
				child.setColor(color);
			else if(Ui.Pressable.hasInstance(child)) {
				for(var i2 = 0; i2 < child.getChildren().length; i2++) {
					var child2 = child.getChildren()[i2];
					if(Ui.Label.hasInstance(child2))
						child2.setColor(color);
					else if(Ui.Rectangle.hasInstance(child2)) {
						if(child.monthCalendarCurrent)
							child2.setFill(currentDayColor);
						else
							child2.setFill(dayColor);
					}
				}
			}
		}
	}
},
/** @lends Ui.MonthCalendar */
{
    /** @fieldOf*/
	style: {
		color: 'black',
		dayColor: new Ui.Color({ r: 0.81, g: 0.81, b: 0.81, a: 0.5 }),
		currentDayColor: new Ui.Color({ r: 1, g: 0.31, b: 0.66, a: 0.5 })
	}
});

