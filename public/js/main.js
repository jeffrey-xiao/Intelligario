var opts = {
    height: 100,
    width: 100,
    horCount: 50,
    camera: {
        x: 500,
        y: 500
    },
    fps: 30,
    speedFactor: 100
};
function init(){
    var myBlob = null;
    var canvas = new fabric.StaticCanvas('game');
    var objects = {
        blobs: {}, //{blob, position: {x, y}, radius, step: {x, y}, stepCount, steps, dest: {x, y}, next: [{x, y},{x, y}]}
        spikes: {}
    };
    function pix(pos){
        return pos*($(window).width()/opts.horCount);
    }
    function createBlob(id, blobData){
        blobData.blob = new fabric.Circle({
            fill: 'rgba(255,0,0,1)',
            radius: blobData.radius
        });
        window.blob = objects.blobs;
        canvas.add(blobData.blob);
        objects.blobs[id] = blobData;
    }
    function render(){
        _.each(objects.blobs, function(curBlob){
            curBlob.blob.setRadius(pix(curBlob.radius));
            curBlob.blob.setLeft(pix(curBlob.position.x - curBlob.radius));
            curBlob.blob.setTop(pix(curBlob.position.y - curBlob.radius));
            curBlob.stepCount++;
            if(curBlob.stepCount >= curBlob.steps){
                curBlob.position = curBlob.dest;
                curBlob.stepCount = 0;
                curBlob.step = {x: 0, y: 0};
                if(curBlob.next.length > 0){
                    curBlob.dest = curBlob.next[0];
                    var dx = (curBlob.dest.x - curBlob.position.x);
                    var dy = (curBlob.dest.y - curBlob.position.y);
                    curBlob.steps = Math.round(Math.sqrt(dx*dx+dy*dy)/(opts.speedFactor/curBlob.radius)*opts.fps);
                    curBlob.step.x = dx/curBlob.steps;
                    curBlob.step.y = dy/curBlob.steps;
                    curBlob.next.shift();
                }
            }
            curBlob.position.x += curBlob.step.x;
            curBlob.position.y += curBlob.step.y;
        });
        canvas.renderAll();
    }
    var winWidth = $(window).width();
    var winHeight = $(window).height();
    for(var i = 0; i < opts.height; i++){
        var top = pix(i);
        canvas.add(new fabric.Line([0, top, winWidth, top], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 }));
    }
    for(var i = 0; i < opts.width; i++){
        var left = pix(i);
        canvas.add(new fabric.Line([left, 0, left, winHeight], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 }));
    }
    setInterval(render, 1000/opts.fps);
    canvas.setDimensions({width: $(window).width(), height: $(window).height()});
    fabric.Object.prototype.transparentCorners = false;
    $(window).resize(function(){
        canvas.setDimensions({width: $(window).width(), height: $(window).height()});
    });
    var socket = io('/');
    socket.emit('game:enter', {clientId: Math.round(Math.random()*10000)});
    socket.on('game:add-object', function (data) {
      createBlob(data.id, {position: {x: data.x, y: data.y}, radius: data.radius, step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x: data.x, y: data.y}, next: [], creator: data.creator});
    });
    socket.on('game:add-objects', function (blobs) {
      console.log(blobs);
      _.each(blobs, function(data){
        createBlob(data.id, {position: {x: data.x, y: data.y}, radius: data.radius, step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x: data.x, y: data.y}, next: [], creator: data.creator});
      });
    });
    socket.on('game:set-id', function (data) {
      myBlob = data.id;
    });
    socket.on('game:remove-blob', function (data) {
      if(data.id in objects.blobs){
        objects.blobs[data.id].blob.remove();
        delete objects.blobs[data.id];
      }
    });
}

$(init);
