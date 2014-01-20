
Ui.CanvasElement.extend('Wn.BarGraph', {
	data: undefined,
	xAxis: undefined,
	minY: undefined,
	maxY: undefined,
	xAxisLabel: undefined,
	yAxisLabel: undefined,

	constructor: function(config) {
		this.data = config.data;
		delete(config.data);
		this.xAxis = config.xAxis;
		delete(config.xAxis);
		this.xAxisLabel = config.xAxisLabel;
		delete(config.xAxisLabel);
		this.yAxisLabel = config.yAxisLabel;
		delete(config.yAxisLabel);	

		for(var i = 0; i < this.data.length; i++) {
			var c = this.data[i];
			if((this.minY === undefined) || (c < this.minY))
				this.minY = c;
			if((this.maxY === undefined) || (c > this.maxY))
				this.maxY = c;
		}
	}
}, {
	
	updateCanvas: function(ctx) {
		var w = this.getLayoutWidth();
		var h = this.getLayoutHeight();
		var colW = (w - (40)) / this.xAxis.length;
		
		var tmp = this.maxY;
		var powerLevel = 0;
		while(tmp > 10) {
			tmp /= 10;
			powerLevel++;
		}
		var topY = Math.pow(10, powerLevel+1);
		if(topY > this.maxY * 2)
			topY /= 2;		
		if(topY > this.maxY * 2)
			topY /= 2;
	
		ctx.fillStyle = '#444444';
		ctx.font = 'normal 10px Sans-Serif';
		ctx.textBaseline = 'top';
		ctx.textAlign = 'center';
	
		// draw x axis
		ctx.fillRect(40, h-20, w-(40), 1);
		for(var i = 0; i < this.xAxis.length; i++) {
			var text = this.xAxis[i];
			ctx.fillText(text, 40+(i*colW)+colW/2, h-20+4, colW);
			if(i > 0)
				ctx.fillRect(40+(i*colW), h-20, 1, 4);
		}
		
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'right';
		// draw y axis
		for(var i = 0; i < 5; i++) {
			var text = (topY*i)/5;
			ctx.fillText(text, 40-4, (h-20) - (((h-40)*i)/5));
			ctx.fillRect(40, (h-20) - (((h-40)*i)/5), w-(40), 1);
		}
	
		// draw values
		ctx.fillStyle = '#88c888';
		for(var i = 0; i < this.data.length; i++) {
			var cX = 40 + (colW * i) + colW/2;
			var cH = (h-40)*this.data[i]/topY;
			var cW = colW/2;
			ctx.fillRect(cX-(cW/2), 20+(h-40)-cH , cW, cH);
		}		
	}
});

Wn.OptionSection.extend('Wn.UserStatsSection', {
	contact: undefined,

	constructor: function(config) {
		this.contact = config.contact;
		delete(config.contact);
	
		this.setTitle('Statistiques d\'utilisation');
		this.setContent(new Wn.UserStats({ contact: this.contact }));
	}
});
	
Ui.LBox.extend('Wn.UserStats', {
	contact: undefined,
	logs: undefined,
	cbox: undefined,

	constructor: function(config) {
		this.contact = config.contact;
		delete(config.contact);
					
		// query for the user path logs
		var request;
		if(this.contact !== undefined)
			request = new Core.HttpRequest({ method: 'GET', url: '/cloud/pathlog?user='+this.contact.getId()+'&limit=10000' });
		else
			request = new Core.HttpRequest({ method: 'GET', url: '/cloud/pathlog?limit=100000' });

		this.connect(request, 'done', this.onRequestDone);
		this.connect(request, 'error', this.onRequestError);
		request.send();
	},
		
	formatDate: function(date) {
		var res = '';
		if(date.getDate() < 10)
			res += '0'+date.getDate();
		else
			res += date.getDate();
		res += '/';
		if((date.getMonth()+1) < 10)
			res += '0'+(date.getMonth()+1);
		else
			res += (date.getMonth()+1);
		res += '/'+date.getFullYear()+' ';
		if(date.getHours() < 10)
			res += '0'+date.getHours();
		else
			res += date.getHours();
		res += ':';
		if(date.getMinutes() < 10)
			res += '0'+date.getMinutes();
		else
			res += date.getMinutes();
		res += ':';
		if(date.getSeconds() < 10)
			res += '0'+date.getSeconds();
		else
			res += date.getSeconds();
		return res;
	},
	
	onRequestDone: function(request) {
		this.logs = request.getResponseJSON();
		
		this.cbox = new Ui.VBox({ spacing: 10 });
		this.setContent(this.cbox);
		
		this.cbox.append(new Ui.Text({ text: 'Les 20 derniers évènements', fontWeight: 'bold', textAlign: 'left' }));
		var grid = new Ui.Grid({ cols: 'auto,*', rows: 'auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto,auto', margin: 10 });
		for(var i = 0; i < Math.min(20, this.logs.length); i++) {
			var log = this.logs[i];
			var date = new Date(log.create*1000);
			grid.attach(new Ui.Label({ horizontalAlign: 'right', text: this.formatDate(date), margin: 2, marginRight: 10 }), 0, i);
			grid.attach(new Ui.Text({ horizontalAlign: 'left', text: log.path, margin: 2 }), 1, i);
		}
		this.cbox.append(grid);
 
 		this.hourActivity();
		this.dayActivity();
		this.monthActivity();
	},
	
	onRequestError: function(request) {
		this.setContent(new Ui.Text({ text: 'Erreur lors de la récupération des logs...' }));
	},
	
	hourActivity: function() {
		var now = new Date();
		var weekend = new Date(now.getTime() - (7*24*60*60*1000));
		var hours = [];
		var xAxis = [];
		for(var i = 0; i < 24; i++) {
			hours.push(0);
			xAxis.push(i+'h');
		}
		var total = 0;
		for(var i = 0; i < this.logs.length; i++) {
			var log = this.logs[i];
			var date = new Date(log.create*1000);
			if(date < weekend)
				break;
			hours[date.getHours()]++;
			total++;
		}
		this.cbox.append(new Ui.Text({ text: 'Activité par heure sur une semaine glissante ('+total+')', fontWeight: 'bold', textAlign: 'left' }));
		this.cbox.append(new Wn.BarGraph({ xAxis: xAxis, data: hours, height: 250 }));
	},
	
	dayToString: function(day) {
		if(day === 0)
			return 'dim';
		else if(day === 1)
			return 'lun';
		else if(day === 2)
			return 'mar';
		else if(day === 3)
			return 'mer';
		else if(day === 4)
			return 'jeu';
		else if(day === 5)
			return 'ven';
		else if(day === 6)
			return 'sam';
	},
		
	dayActivity: function() {
		var now = new Date();
		var daystart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
		var dayend = new Date(daystart.getTime() + (24 * 60 * 60 * 1000));
		var weekend = new Date(dayend.getTime() - (7*24*60*60*1000));
		var days = {};
		var xAxis = [];
		var dOrder = [];
		for(var i = 0; i < 7; i++) {
			var day = new Date(now.getTime() + ((i-6) * (24*60*60*1000)));
			days[day.getDay()] = 0;
			dOrder.push(day.getDay());
			xAxis.push(this.dayToString(day.getDay()));
		}
		var total = 0;
		for(var i = 0; i < this.logs.length; i++) {
			var log = this.logs[i];
			var date = new Date(log.create*1000);
			if(date < weekend)
				break;
			days[date.getDay()]++;
			total++;
		}
		var data = [];
		for(var i = 0; i < dOrder.length; i++)
			data.push(days[dOrder[i]]);
		this.cbox.append(new Ui.Text({ text: 'Activité par jour sur une semaine glissante ('+total+')', fontWeight: 'bold', textAlign: 'left' }));
		this.cbox.append(new Wn.BarGraph({ xAxis: xAxis, data: data, height: 250 }));
	},

	monthToString: function(month) {
		if(month === 0)
			return 'jan';
		else if(month === 1)
			return 'fev';
		else if(month === 2)
			return 'mar';
		else if(month === 3)
			return 'avr';
		else if(month === 4)
			return 'mai';
		else if(month === 5)
			return 'jui';
		else if(month === 6)
			return 'jui';
		else if(month === 7)
			return 'aou';
		else if(month === 8)
			return 'sep';
		else if(month === 9)
			return 'oct';
		else if(month === 10)
			return 'nov';
		else if(month === 11)
			return 'dec';
	},

	monthActivity: function() {
		var now = new Date();
		var monthstart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		var monthend;
		if(now.getMonth() == 11)
			var monthend = new Date(now.getFullYear()+1, 0, 1, 0, 0, 0, 0);
		else
			var monthend = new Date(now.getFullYear(), now.getMonth()+1, 1, 0, 0, 0, 0);
		var yearend = new Date(monthend.getTime() - (365*24*60*60*1000));
		var months = {};
		var xAxis = [];
		var mOrder = [];
		for(var i = 0; i < 12; i++) {
			var month = (now.getMonth()-11+i+12) % 12;
			months[month] = 0;
			mOrder.push(month);
			xAxis.push(this.monthToString(month));
		}
		var total = 0;
		for(var i = 0; i < this.logs.length; i++) {
			var log = this.logs[i];
			var date = new Date(log.create*1000);
			if(date < yearend)
				break;
			months[date.getMonth()]++;
			total++;
		}
		var data = [];
		for(var i = 0; i < mOrder.length; i++)
			data.push(months[mOrder[i]]);
		this.cbox.append(new Ui.Text({ text: 'Utilisation sur l\'année ('+total+')', fontWeight: 'bold', textAlign: 'left' }));
		this.cbox.append(new Wn.BarGraph({ xAxis: xAxis, data: data, height: 250 }));
	}
});

Ui.Dialog.extend('Wn.UserStatsDialog', {

	constructor: function(config) {
		this.setTitle('Statistiques d\'utilisation globales');
		this.setFullScrolling(true);
		this.setPreferedWidth(700);
		this.setPreferedHeight(600);
		this.setCancelButton(new Ui.Button({ text: 'Fermer' }));

		this.setContent(new Wn.UserStats());
	}	
});
