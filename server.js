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
var port = 8080;

var grid = {
	width: 500,
	height: 500	
};

var srcPath = __dirname;
var destPath = __dirname;

app.use(morgan('dev'));

var spikes = Map();
var blobs = Map();

var spikeId = 0;
var blobId = 0;

for (var i = 0; i < Constants.NUM_OF_SPIKES; i++) {
	var x = Math.random() * (grid.width-20) + 10;
	var y = Math.random() * (grid.height-20) + 10;
	spikes = spikes.set(spikeId, new Point({id: spikeId, position: {x:x, y:y}, radius: 2.5}));
	spikeId++;
}

var SpikeTimer = new Timer(2000, function () {
	var data = [];

	var spikeArray = spikes.toArray();
	spikeArray.forEach(function (spike) {
		spike.attrs.dest = {
			x: Math.max(0, Math.min(1000, spike.attrs.position.x + Math.random()*10 - 5)), 
			y: Math.max(0, Math.min(1000, spike.attrs.position.y + Math.random()*10 - 5))
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

SpikeTimer.start();

io.on('connection', function (socket) {
	console.log('a user has connected', socket.id);

	socket.on('disconnect', function () {
		blobs = blobs.removeIn([socket.id]);

		io.emit('game:remove-blob', {attrs: {id: socket.id}});
	});

	socket.on('game:enter', function (data) {
		var x = Math.round(Math.random() * (grid.width-20) + 10);
		var y = Math.round(Math.random() * (grid.height-20) + 10);
		var radius = 5;
		var newBlob = new Point({id: socket.id, position: {x:x, y:y}, radius:radius, step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x:x, y:y}, next: []});
		blobs = blobs.set(socket.id, newBlob);
		socket.broadcast.emit('game:add-object', newBlob);
		socket.emit('game:set-id', {id: socket.id});
		var myList = blobs.toArray();
		socket.emit('game:add-objects', myList);
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

http.listen(port, hostname, function () {
	console.log("Server is listening on http://" + hostname + ":" + port);
});
