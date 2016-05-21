var Timer = function (delta, callback) {
	var interval = null;
	function start () {
		stop();
		interval = setInterval(function () {
			callback();
		}, delta);
	};
	
	function stop () {
		if (interval != null) {
			clearInterval(interval);
			interval = null;
		}
	};
	
	
	return {
		start: function () {
			start();
		},
		
		stop: function () {
			stop();
		}
	}
}

module.exports = Timer;