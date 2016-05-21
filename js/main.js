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
    var canvas = new fabric.StaticCanvas('game');
    var objects = {
        blobs: [], //{id, blob, position: {x, y}, radius, step: {x, y}, stepCount, steps, dest: {x, y}, next: [{x, y},{x, y}]}
        spikes: []
    };
    function pix(pos){
        return pos*($(window).width()/opts.horCount);
    }
    function createBlob(blobData){
        blobData.blob = new fabric.Circle({
            fill: 'rgba(255,0,0,1)',
            radius: 20
        });
        canvas.add(blobData.blob);
        objects.blobs.push(blobData);
    }
    function render(){
        for(var i = 0; i < objects.blobs.length; i++){
            objects.blobs[i].blob.setRadius(pix(objects.blobs[i].radius));
            objects.blobs[i].blob.setLeft(pix(objects.blobs[i].position.x - objects.blobs[i].radius));
            objects.blobs[i].blob.setTop(pix(objects.blobs[i].position.y - objects.blobs[i].radius));
            objects.blobs[i].stepCount++;
            if(objects.blobs[i].stepCount >= objects.blobs[i].steps){
                objects.blobs[i].position = objects.blobs[i].dest;
                objects.blobs[i].stepCount = 0;
                objects.blobs[i].step = {x: 0, y: 0};
                if(objects.blobs[i].next.length > 0){
                    objects.blobs[i].dest = objects.blobs[i].next[0];
                    var dx = (objects.blobs[i].dest.x - objects.blobs[i].position.x);
                    var dy = (objects.blobs[i].dest.y - objects.blobs[i].position.y);
                    objects.blobs[i].steps = Math.round(Math.sqrt(dx*dx+dy*dy)/(opts.speedFactor/objects.blobs[i].radius)*opts.fps);
                    objects.blobs[i].step.x = dx/objects.blobs[i].steps;
                    objects.blobs[i].step.y = dy/objects.blobs[i].steps;
                    objects.blobs[i].next.shift();
                }
            }
            objects.blobs[i].position.x += objects.blobs[i].step.x;
            objects.blobs[i].position.y += objects.blobs[i].step.y;
        }
        canvas.renderAll();
    }
    var winWidth = $(window).width();
    var winHeight = $(window).height();
    for(var i = 0; i < opts.height; i++){
        var top = pix(i);
        console.log(top);
        canvas.add(new fabric.Line([0, top, winWidth, top], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 }));
    }
    for(var i = 0; i < opts.width; i++){
        var left = pix(i);
        canvas.add(new fabric.Line([left, 0, left, winHeight], { stroke: 'rgba(200,200,200,1)', strokeWidth: 1 }));
    }
    setInterval(render, 1000/opts.fps);
    canvas.setDimensions({width: $(window).width(), height: $(window).height()});
    fabric.Object.prototype.transparentCorners = false;
    createBlob({id: -1, position: {x: 5, y: 5}, radius: 10, step: {x: 0, y: 0}, stepCount: 0, steps: 0, dest: {x: 5, y: 5}, next: [{x: 20, y: 20}, {x: 40, y: 10}]});
    $(window).resize(function(){
        canvas.setDimensions({width: $(window).width(), height: $(window).height()});
    });
}
$(init);