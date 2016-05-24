var opts = {
    height: 250,
    width: 250,
    horCount: 170,
    fps: 60,
    speedFactor: 90,
    spikeTime: 2,
    sendInterval: 500,
    reconsiderInterval: 500,
    minDist: 5,
    massDecayInterval: 2000,
    massDecayConstant: 0.99
};
function init(name){
    var win = {
      height: 0,
      width: 0
    }
    var worker = new Worker('js/dijkstra.js');
    var socket = io('/');
    var myBlob = null;
    var canvas = new fabric.StaticCanvas('game');
    var scoreboard = new fabric.Text('Score', {
        fill: 'black',
        left: 20,
        fontFamily: 'Lato',
        fontWeight: 'bold',
        fontSize: 25
    });
    canvas.add(scoreboard);
    var objects = {
        blobs: {}, //{id, blob, position: {x, y}, radius, step: {x, y}, stepCount, steps, dest: {x, y}, next: [{x, y},{x, y}]}
        spikes: {}, //{id, spike, position: {x, y}
        lines: {},
        paths: []
    };
    function pix(pos){
        return Math.round(pos*($(window).width()/opts.horCount));
    }
    function createBlob(id, blobData){
        if(id in objects.blobs){
            return;
        }
        blobData.blob = new fabric.Circle({
            fill: blobData.color,    
            radius: blobData.radius
        });
        blobData.text = new fabric.Text(blobData.name, {
            fill: 'white',
            fontFamily: 'Lato',
            fontSize: 25
        });
        canvas.add(blobData.blob);
        canvas.add(blobData.text);
        blobData.blob.moveTo(1000);
        blobData.text.moveTo(2000);
        objects.blobs[id] = blobData;
    }
    function die(){
        clearInterval(mInt);
        clearInterval(fInt);
        clearInterval(sInt);
        canvas.clear();
        $('#game').hide();
        $('#end').show();
        $('#slider').hide();
        $('#score').text(Math.round(objects.blobs[myBlob].radius*100)/100);
        delete objects;
    }
    function render(){
        if(myBlob == null || objects.blobs[myBlob] == null) return;
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
        scoreboard.setText("" + Math.round(objects.blobs[myBlob].radius*100)/100);
        var term = false;
        _.each(objects.blobs, function(curBlob){
            if(curBlob == null) return;
            curBlob.blob.setRadius(pix(curBlob.radius));
            curBlob.blob.setLeft(pix(curBlob.position.x - curBlob.radius - camera.x) + win.width/2);
            curBlob.blob.setTop(pix(curBlob.position.y - curBlob.radius - camera.y) + win.height/2);
            curBlob.text.setLeft(pix(curBlob.position.x - curBlob.text.getWidth()/2/pix1 - camera.x) + win.width/2);
            curBlob.text.setTop(pix(curBlob.position.y - curBlob.text.getHeight()/2/pix1 - camera.y) + win.height/2);
            curBlob.stepCount++;
            if(curBlob.id == myBlob){ //check spikes
                _.each(objects.spikes, function(spike){
                    if(spike == null) return;
                    var dx = spike.position.x - curBlob.position.x;
                    var dy = spike.position.y - curBlob.position.y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist <= Math.max(spike.radius, curBlob.radius)){
                        socket.emit('game:remove', {id: curBlob.id});
                        objects.blobs[curBlob.id].blob.remove();
                        objects.blobs[curBlob.id].text.remove();
                        die();
                        delete objects.blobs[curBlob.id];
                        term = true;
                        return;
                    }
                });
            }
            if(term) return;
            if(curBlob.stepCount > curBlob.steps){
                curBlob.position = curBlob.dest;
                curBlob.stepCount = 0;
                curBlob.step = {x: 0, y: 0};
                _.each(objects.blobs, function(eatBlob){
                    if(eatBlob == null) return;
                    if(eatBlob.id != curBlob.id){
                        var dx = eatBlob.position.x - curBlob.position.x;
                        var dy = eatBlob.position.y - curBlob.position.y;
                        var dist = Math.sqrt(dx*dx + dy*dy);
                        if(dist <= Math.max(eatBlob.radius, curBlob.radius)){
                           /*if(eatBlob.radius > curBlob.radius + 1){
                                socket.emit('game:remove', {id: curBlob.id});
                                eatBlob.radius = Math.sqrt((eatBlob.radius * eatBlob.radius)+(curBlob.radius*curBlob.radius));
                                socket.emit('game:change', {
                                    id: eatBlob.id,
                                    position: eatBlob.position, 
                                    radius: eatBlob.radius, 
                                    step: eatBlob.step, 
                                    stepCount: eatBlob.stepCount, 
                                    steps: eatBlob.steps, 
                                    dest: eatBlob.dest, 
                                    next: eatBlob.next,
                                    name: eatBlob.name,
                                    color: eatBlob.color
                                });
                                objects.blobs[curBlob.id].blob.remove();
                                objects.blobs[curBlob.id].text.remove();
                                delete objects.blobs[curBlob.id];
                                term = true;
                                return;
                            }else*/ 
                            if(curBlob.radius > eatBlob.radius + 1){
                                socket.emit('game:remove', {id: eatBlob.id});
                                curBlob.radius = Math.sqrt((curBlob.radius * curBlob.radius)+(eatBlob.radius*eatBlob.radius));
                                socket.emit('game:change', {
                                    id: curBlob.id,
                                    position: curBlob.position, 
                                    radius: curBlob.radius, 
                                    step: curBlob.step, 
                                    stepCount: curBlob.stepCount, 
                                    steps: curBlob.steps, 
                                    name: curBlob.name,
                                    color: curBlob.color,
                                    dest: curBlob.dest,  
                                    next: curBlob.next
                                });
                                objects.blobs[eatBlob.id].blob.remove();
                                objects.blobs[eatBlob.id].text.remove();
                                delete objects.blobs[eatBlob.id];
                                return;
                            }
                        }
                    } 
                });
                if(term) return;
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
                            color: curBlob.color, 
                            step: curBlob.step, 
                            stepCount: curBlob.stepCount,
                            name: curBlob.name, 
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
        function calcX(pos){
            return pix(pos - camera.x) + win.width/2;
        }
        function calcY(pos){
            return pix(pos - camera.y) + win.height/2;
        }
        var lastPos = objects.paths[0];
        for(var i = 0; i < objects.paths.length; i++){
            var line = objects.paths[i].line.set({x1: calcX(objects.paths[i].start.x), y1: calcY(objects.paths[i].start.y), x2: calcX(objects.paths[i].end.x), y2: calcY(objects.paths[i].end.y)});
            objects.paths[i].line.setCoords();
            lastPos = objects.blobs[myBlob].next[i];
        }
        _.each(objects.spikes, function(curSpike){
            curSpike.spike.setLeft(pix(curSpike.position.x - curSpike.radius - camera.x) + win.width/2);
            curSpike.spike.setTop(pix(curSpike.position.y - curSpike.radius - camera.y) + win.height/2);
            curSpike.position.x += curSpike.step.x;
            curSpike.position.y += curSpike.step.y;
        });
        canvas.renderAll();
    }
    worker.addEventListener('message', function(e){
        var ret = JSON.parse(e.data);
        if(ret.length > 0){
            objects.blobs[myBlob].dest = objects.blobs[myBlob].position;
            objects.blobs[myBlob].next = ret;
            objects.blobs[myBlob].steps = 0;
            objects.blobs[myBlob].stepCount = 0;
            for(var i = 0; i < objects.paths.length; i++){
                objects.paths[i].line.remove();
                delete objects.paths[i];
            }
            var camera = objects.blobs[myBlob].position;
            function calcX(pos){
                return pix(pos - camera.x) + win.width/2;
            }
            function calcY(pos){
                return pix(pos - camera.y) + win.height/2;
            }
            objects.paths = [];
            lastPos = objects.blobs[myBlob].position;
            for(var i = 0; i < objects.blobs[myBlob].next.length; i++){
                var line = new fabric.Line([calcX(lastPos.x), calcY(lastPos.y), calcX(objects.blobs[myBlob].next[i].x), calcY(objects.blobs[myBlob].next[i].y)], { stroke: 'rgba(227,14,17,0.4)', strokeWidth: 4 });
                canvas.add(line);
                line.moveTo(100);
                objects.paths.push({line: line, start: lastPos, end: objects.blobs[myBlob].next[i]});
                lastPos = objects.blobs[myBlob].next[i];
            }
        }
        setTimeout(reconsider, 200);
    });
    function reconsider(){
        console.log("RECONSIDERING");
        worker.postMessage(JSON.stringify({objects: objects, opts: opts, myBlob: myBlob}));
    }
    var winWidth = $(window).width();
    var winHeight = $(window).height();
    var sInt = setInterval(function(){
        if(myBlob == null || objects.blobs[myBlob] == null) return;
        var curBlob = objects.blobs[myBlob];
		var realBlobs = [];
		_.each(objects.blobs, function(blob){
			console.log(blob);
			if(blob.radius > 3){
				realBlobs.push({score: Math.round(blob.radius*100)/100, name: blob.name});
			}
		});
		realBlobs.sort(function(a,b) {
			return (a.score < b.score) ? 1 : ((b.score < a.score) ? -1 : 0);
		}); 
		var text = "";
		for(var i = 0; i < realBlobs.length; i++){
			if(i > 9) break;
			text += (i+1)+". "+realBlobs[i].name+" | "+realBlobs[i].score+"<br/>";
		}
		text += "<br/><br/>Total Players: "+realBlobs.length;
		$('#scoreboard-text').html(text);
        socket.emit('game:change', {
            id: curBlob.id,
            color: curBlob.color,
            position: curBlob.position, 
            radius: curBlob.radius, 
            step: curBlob.step, 
            stepCount: curBlob.stepCount, 
            steps: curBlob.steps, 
            dest: curBlob.dest, 
            name: curBlob.name,
            next: curBlob.next
        });
    }, opts.sendInterval);
    var fInt = setInterval(render, 1000/opts.fps);
    function massDecay () {
        _.each(objects.blobs, function (blob) {
            if (blob.color != '#E30E11')
                blob.radius = Math.max(5, blob.radius * opts.massDecayConstant); 
        });
    }
    $('#slider').change(function(){
        opts.minDist = 10 - $(this).val()/2; 
        opts.speedFactor = 100 + 5*($(this).val() - 10);
    });
    var mInt = setInterval(massDecay, opts.massDecayInterval);
    fabric.Object.prototype.transparentCorners = false;
    var ballsTriggered = false;
    $(window).resize(function(){
        win.height = $(window).height();
        win.width = $(window).width();
        scoreboard.setTop(win.height - scoreboard.getHeight() - 20);
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
    socket.emit('game:enter', {clientId: Math.round(Math.random()*10000), name: name});
    socket.on('game:add-object', function (data) {
        console.warn("add object");
        createBlob(data.attrs.id, data.attrs);
    });
    socket.on('game:change-spikes', function (data) {
        console.warn("change spikes");
        _.each(data, function(spike){
            spike = spike.attrs;
            spike.step = {x: (spike.dest.x - spike.position.x)/opts.spikeTime/opts.fps, y: (spike.dest.y - spike.position.y)/opts.spikeTime/opts.fps}; 
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
        if(!ballsTriggered){
            $(window).trigger('resize');
            ballsTriggered = true;
            reconsider();
        }
    });
    socket.on('game:change-blob', function (blob) {
        console.warn("change blob");
        _.extend(objects.blobs[blob.attrs.id], blob.attrs);
    });
    socket.on('game:set-id', function (data) {
        console.warn("set id");
        myBlob = data.id;
    });
    socket.on('game:remove-blob', function (data) {
       console.warn("remove blob");
        if(data.attrs.id == myBlob){
            die();
            return;
        }
      if(data.attrs.id in objects.blobs){
        objects.blobs[data.attrs.id].blob.remove();
        objects.blobs[data.attrs.id].text.remove();
        delete objects.blobs[data.attrs.id];
      }
    });
}

$(function(){
    $('#start-button').click(function(){
       $('#splash').hide();
       $('#slider').show();
       init($('#name-input').val()); 
    });
    $('#name-input').keyup(function(e){
       if(event.keyCode == 13){
           $('#start-button').trigger('click');
       } 
    });
});