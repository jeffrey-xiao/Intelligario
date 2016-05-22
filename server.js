var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var morgan = require('morgan');
var bodyParser = require('body-parser');
var sassMiddleware = require('node-sass-middleware');

var Point = require('./lib/point');
var Constants = require('./lib/constants');
var Timer = require('./lib/timer');

var Immutable = require('immutable');

var Map = Immutable.Map;
var List = Immutable.List;

var hostname = 'localhost';

app.set('port', (process.env.PORT || 8080));

var grid = {
	width: 250,
	height: 250	
};

function randColor(){
	var colors = [ '#1BDDE0', '#1B42E0', '#E0DA22', '#E0723A', '#E03AE0'];
	return colors[Math.floor(Math.random()*colors.length)];
}

var totalFood = 0;

var srcPath = __dirname;
var destPath = __dirname;

app.use(morgan('dev'));

var spikes = Map();
var blobs = Map();
var food = Map();

var spikeId = 0;
var foodId = 0;

for (var i = 0; i < Constants.NUM_OF_SPIKES; i++) {
	var x = Math.random() * (grid.width - 2 * Constants.SPIKE_RADIUS) + Constants.SPIKE_RADIUS;
	var y = Math.random() * (grid.height - 2 * Constants.SPIKE_RADIUS) + Constants.SPIKE_RADIUS;
	spikes = spikes.set(spikeId, new Point({id: spikeId, position: {x:x, y:y}, radius: Constants.SPIKE_RADIUS}));
	spikeId++;
}

var SpikeTimer = new Timer(2000, function () {
	var data = [];

	var spikeArray = spikes.toArray();
	spikeArray.forEach(function (spike) {
		spike.attrs.dest = {
			x: Math.max(0, Math.min(1000, spike.attrs.position.x + Math.random()* 2 * (Constants.SPIKE_RANGE) - Constants.SPIKE_RANGE)), 
			y: Math.max(0, Math.min(1000, spike.attrs.position.y + Math.random()* 2 * (Constants.SPIKE_RANGE) - Constants.SPIKE_RANGE))
		};
		data.push(spike);
	});
	
	io.sockets.emit('game:change-spikes', data);
	for (var i = 0; i < data.length; i++) {
		spikes = spikes.updateIn([data[i].attrs.id], function (spike) {
			spike.attrs.position = data[i].attrs.dest;
			return spike;
		});
	}
});

var BlobTimer = new Timer(10000, function () {
	if(food.toArray().length < Constants.MAX_FOOD && totalFood < Constants.MAX_TOTAL_FOOD){ //don't crash the damn site
		var data = [];
		for (var i = 0; i < Constants.NUM_OF_FOOD; i++) {
			var x = Math.random() * (grid.width - 2 * Constants.FOOD_RADIUS) + Constants.FOOD_RADIUS;
			var y = Math.random() * (grid.height - 2 * Constants.FOOD_RADIUS) + Constants.FOOD_RADIUS;
			food = food.set(foodId, new Point({id: foodId, position: {x:x, y:y}, name: "", radius: Constants.FOOD_RADIUS, color: '#E30E11', step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x:x, y:y}, next: []}));
			foodId++;
			totalFood++;
		}
	}
	var foodArray = food.toArray();
	
	io.sockets.emit('game:add-objects', foodArray);
});

SpikeTimer.start();
BlobTimer.start();

io.on('connection', function (socket) {
	console.log('a user has connected', socket.id);

	socket.on('disconnect', function () {
		blobs = blobs.removeIn([socket.id]);

		io.emit('game:remove-blob', {attrs: {id: socket.id}});
	});

	socket.on('game:enter', function (data) {
		var x = Math.round(Math.random() * (grid.width-2*Constants.BLOB_RADIUS) + Constants.BLOB_RADIUS);
		var y = Math.round(Math.random() * (grid.height-2*Constants.BLOB_RADIUS) + Constants.BLOB_RADIUS);
		var radius = Constants.BLOB_RADIUS;
		var newBlob = new Point({id: socket.id, name: data.name, position: {x:x, y:y}, color: randColor(), radius:radius, step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x:x, y:y}, next: []});
		blobs = blobs.set(socket.id, newBlob);
		socket.broadcast.emit('game:add-object', newBlob);
		socket.emit('game:set-id', {id: socket.id});
		var myList = blobs.toArray();
		socket.emit('game:add-objects', myList);
	});
	
	socket.on('game:remove', function (data) {
		blobs = blobs.removeIn([data.id]);
		food = food.removeIn([data.id]);
		socket.broadcast.emit('game:remove-blob', {attrs: {id: data.id}});
		
	});

	socket.on('game:change', function (data) {
		blobs = blobs.update(data.id, function (blob) {
			blob.attrs = data;
			return blob;
		});

		socket.broadcast.emit('game:change-blob', {attrs: data});
	});
});

app.use('/', express.static(__dirname + '/public/'));

http.listen(app.get('port'), hostname, function () {
	console.log("Server is listening on http://" + hostname + ":" + port);
});
