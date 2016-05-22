var opts = {
    height: 500,
    width: 500,
    horCount: 500,
    fps: 60,
    speedFactor: 70,
    spikeTime: 2,
    sendInterval: 2000
};
function init(){
    var win = {
      height: 0,
      width: 0
    }
    var socket = io('/');
    var myBlob = null;
    var canvas = new fabric.StaticCanvas('game');
    var objects = {
        blobs: {}, //{id, blob, position: {x, y}, radius, step: {x, y}, stepCount, steps, dest: {x, y}, next: [{x, y},{x, y}]}
        spikes: {}, //{id, spike, position: {x, y}, new
        lines: {}
    };
    function pix(pos){
        return Math.round(pos*($(window).width()/opts.horCount));
    }
    function createBlob(id, blobData){
        blobData.blob = new fabric.Circle({
            fill: 'rgba(255,0,0,1)',    
            radius: blobData.radius
        });
        canvas.add(blobData.blob);
        blobData.blob.moveTo(1000);
        objects.blobs[id] = blobData;
    }
    function render(){
        if(myBlob == null) return;
        var camera = objects.blobs[myBlob].position;
        var pix1 = pix(1);
        var top = pix(camera.y) % pix1;
        var left = pix(camera.x) % pix1;
        for(var i = 0; i < objects.hLines.length; i++){
          var t = pix1 * i - top;
          objects.hLines[i].set({y1: t, y2: t});
          objects.hLines[i].setCoords();
        }
        for(var i = 0; i < objects.vLines.length; i++){
          var l = pix1 * i - left;
          objects.vLines[i].set({x1: l, x2: l});
          objects.vLines[i].setCoords();
        }
        _.each(objects.blobs, function(curBlob){
            curBlob.blob.setRadius(pix(curBlob.radius));
            curBlob.blob.setLeft(pix(curBlob.position.x - curBlob.radius - camera.x) + win.width/2);
            curBlob.blob.setTop(pix(curBlob.position.y - curBlob.radius - camera.y) + win.height/2);
            curBlob.stepCount++;
            if(curBlob.stepCount > curBlob.steps){
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
                    if(curBlob.id == myBlob){
                        socket.emit('game:change', {
                            id: curBlob.id,
                            position: curBlob.position, 
                            radius: curBlob.radius, 
                            step: curBlob.step, 
                            stepCount: curBlob.stepCount, 
                            steps: curBlob.steps, 
                            dest: curBlob.dest, 
                            next: curBlob.next
                        });
                    }
                }
            }
            curBlob.position.x += curBlob.step.x;
            curBlob.position.y += curBlob.step.y;
        });
        _.each(objects.spikes, function(curSpike){
            curSpike.spike.setLeft(pix(curSpike.position.x - curSpike.radius - camera.x) + win.width/2);
            curSpike.spike.setTop(pix(curSpike.position.y - curSpike.radius - camera.y) + win.height/2);
            curSpike.position.x += curSpike.step.x;
            curSpike.position.y += curSpike.step.y;
        });
        canvas.renderAll();
    }
    var winWidth = $(window).width();
    var winHeight = $(window).height();
    setInterval(function(){
        if(myBlob == null) return;
        var curBlob = objects.blobs[myBlob];
        socket.emit('game:change', {
            id: curBlob.id,
            position: curBlob.position, 
            radius: curBlob.radius, 
            step: curBlob.step, 
            stepCount: curBlob.stepCount, 
            steps: curBlob.steps, 
            dest: curBlob.dest, 
            next: curBlob.next
        });
    }, opts.sendInterval);
    setInterval(render, 1000/opts.fps);
    fabric.Object.prototype.transparentCorners = false;
    $(window).resize(function(){
        win.height = $(window).height();
        win.width = $(window).width();
        canvas.setDimensions({width: win.width, height: win.height});
        _.each(objects.hLines, function(line){
          line.remove();
        });
        _.each(objects.vLines, function(line){
          line.remove();
        });
        objects.hLines = [];
        objects.vLines = [];
        opts.verCount = win.width/pix(1);
        /*for(var i = 0; i < opts.horCount; i++){
          var line = new fabric.Line([0,0,win.width,0], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 });
          canvas.add(line);
          line.moveTo(0);
          objects.hLines.push(line);
        }
        for(var i = 0; i < opts.verCount; i++){
          var line = new fabric.Line([0,0,0,win.height], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 });
          canvas.add(line);
          line.moveTo(0);
          objects.vLines.push(line);
        }*/
    });
    $(document).keydown(function(e) {
        objects.blobs[myBlob].next.push({x: 0, y: 0});
    });
    socket.emit('game:enter', {clientId: Math.round(Math.random()*10000)});
    socket.on('game:add-object', function (data) {
      createBlob(data.attrs.id, data.attrs);
    });
    socket.on('game:change-spikes', function (data) {
        _.each(data, function(spike){
            spike = spike.attrs;
            console.log(spike);
            spike.step = {x: (spike.dest.x - spike.position.x)/opts.spikeTime/opts.fps, y: (spike.dest.y - spike.position.y)/opts.spikeTime/opts.fps}; 
            console.log(spike.step);
            if(!(spike.id in objects.spikes)){
                fabric.Image.fromURL('img/spike.png', function(img) {
                    spike.spike = img;
                    img.set({width: pix(spike.radius * 2), height: pix(spike.radius * 2)});
                    canvas.add(img);
                    objects.spikes[spike.id] = spike;
                });
            }else{
                _.extend(objects.spikes[spike.id], spike);
            }
        });
    });
    socket.on('game:add-objects', function (blobs) {
        _.each(blobs, function(data){
            createBlob(data.attrs.id, data.attrs);
        });
        $(window).trigger('resize');
    });
    socket.on('game:change-blob', function (blob) {
        _.extend(objects.blobs[blob.attrs.id], blob.attrs);
    });
    socket.on('game:set-id', function (data) {
      myBlob = data.id;
    });
    socket.on('game:remove-blob', function (data) {
      if(data.attrs.id in objects.blobs){
        objects.blobs[data.attrs.id].blob.remove();
        delete objects.blobs[data.attrs.id];
      }
    });
}

$(init);
