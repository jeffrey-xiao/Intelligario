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

var srcPath = __dirname;
var destPath = __dirname;

app.use(morgan('dev'));

var spikes = Map();
var blobs = Map();

var spikeId = 0;
var blobId = 0;

for (var i = 0; i < Constants.NUM_OF_SPIKES; i++) {
	var x = Math.random() * 980 + 10;
	var y = Math.random() * 980 + 10;
	var radius = 10;
	
	spikes = spikes.set(spikeId, new Point(spikeId, x, y, radius, Constants.SPIKE));
	spikeId++;
}

var SpikeTimer = new Timer(2000, function () {
	var data = [];
	
	var spikeArray = spikes.toArray();
	spikeArray.forEach(function (spike) {
		var newX = Math.random() * 1000;
		var newY = Math.random() * 1000;
		data.push({spike: spike, newX: newX, newY: newY});
	});
	
	io.sockets.emit('game:change-spike', {data: data});
});

SpikeTimer.start();

io.on('connection', function (socket) {
	console.log('a user has connected', socket.id);
	
	socket.on('disconnect', function () {
		blobs = blobs.removeIn([socket.id]);
		
		io.emit('game:remove-blob', {blobId: socket.id});
	});
	
	socket.on('game:enter', function (data) {
		var x = Math.random() * 980 + 10;
		var y = Math.random() * 980 + 10;
		var radius = 10;
		
		var newBlob = new Point(socket.id, x, y, radius, Constants.BLOB);
		
		blobs = blobs.set(socket.id, newBlob);
		io.emit('game:add-object', {blob: newBlob});
	});
	
	socket.on('game:change', function (data) {
		var newBlob;
		blobs = blobs.update(data.blobId, function (blob) {
			blob.setX(data.x);
			blob.setY(data.y);
			newBlob = blob;
			return blob;
		});
		
		io.emit('game:change-blob', {type: Constants.BLOB, blob: newBlob});
	});
});

app.use('/', express.static(__dirname + '/'));

http.listen(port, hostname, function () {
	console.log("Server is listening on http://" + hostname + "/" + port);
});