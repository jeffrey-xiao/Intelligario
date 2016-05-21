var Point = function (id, x, y, radius, type) {
	function getX () {
		return x;
	};
	
	function setX (newX) {
		x = newX;
	};
	
	function getY () {
		return y;
	};
	
	function setY (newY) {
		y = newY;
	};
	
	function getRadius () {
		return radius;
	};
	
	function setRadius (newRadius) {
		radius = newRadius;
	}
	
	function getType () {
		return type;
	};
	
	function setType (newType) {
		type = newType;
	}
	
	return {
		getX: getX,
		setX: setX,
		getY: getY,
		setY: setY,
		getRadius: getRadius,
		setRadius: setRadius,
		getType: getType,
		setType: setType
	};
}

module.exports = Point;