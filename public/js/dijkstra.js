importScripts('underscore.js');
importScripts('priority-queue.min.js');
self.addEventListener('message', function(e){
    
    var data = JSON.parse(e.data);
    var sums = [0, 0];
    var currBlob = data.objects.blobs[data.myBlob];
    if(currBlob == null) return;
    _.each(data.objects.blobs, function(blob){
        if(blob == null) return;
        if(blob.id == currBlob.id || blob.radius < currBlob.radius+1) return;
        var dy = blob.position.y - currBlob.position.y;
        var dx = blob.position.x - currBlob.position.x;
        var dist = Math.sqrt(dy*dy+dx*dx) - currBlob.radius - blob.radius;
        if(dist < data.opts.minDist - 1){
            sums[0] += data.opts.minDist - dx;
            sums[1] += data.opts.minDist - dy;
        }
    });
    _.each(data.objects.spikes, function(spike){
        if(spike.id == currBlob.id) return;
        var dy = spike.position.y - currBlob.position.y;
        var dx = spike.position.x - currBlob.position.x;
        var dist = Math.sqrt(dy*dy+dx*dx) - currBlob.radius - spike.radius;
        if(dist < data.opts.minDist - 1){
            sums[0] += data.opts.minDist - dx;
            sums[1] += data.opts.minDist - dy;
        }
    });
    if(sums[0] != 0 || sums[1] != 0){
        console.error("Freak!");
        var newPos = [{x: currBlob.position.x + sums[0], y: currBlob.position.y + sums[1]}];
        self.postMessage(JSON.stringify(newPos));
        return; 
    }
    
    var cost = new Array(data.opts.height + 1);
    var prev = new Array(data.opts.height + 1);
    for(var i = 0; i <= data.opts.height; i++){
        cost[i] = new Array(data.opts.width + 1);
        prev[i] = new Array(data.opts.width + 1);
        for (var j = 0; j <= data.opts.width; j++) {
            cost[i][j] = 1 << 30;
        }    
    }
    var pq = new PriorityQueue({
        comparator: function (a, b) {
            return a.cost - b.cost;
        }
    });
    var roundedPositions = {
        x: Math.floor(currBlob.position.x),  
        y: Math.floor(currBlob.position.y)
    };
    pq.queue({x: roundedPositions.x, y: roundedPositions.y, cost: 0});
    cost[roundedPositions.x][roundedPositions.y] = 0;
    prev[roundedPositions.x][roundedPositions.y] = {x: -1, y: -1};
    var endX = -1;
    var endY = -1;
    var cnt = 0;
    var bId = null;
    var vis = [];
    while(pq.length){
        var curr = pq.dequeue();
        cnt++;
        if (cost[curr.x][curr.y] < curr.cost)
            continue;
        
        vis.push({x: curr.x, y: curr.y});
        
        var found = false;
        var count = 0;
        _.each(data.objects.blobs, function (blob) {
            if (Math.floor(blob.position.x) == curr.x && Math.floor(blob.position.y) == curr.y && blob.radius + 1 < currBlob.radius && blob.id != currBlob.id) {
                bId = blob.id;
                found = true;
                endX = curr.x;
                endY = curr.y;
                return;
            }
            count++;
        });
        if(count < 1){
            self.postMessage("[]");
            return;
        }
        if (found)
            break;
        
        for (var i = curr.x - 1; i <= curr.x + 1; i++) {
            for (var j = curr.y - 1; j <= curr.y + 1; j++) {
                var dist = Math.abs(curr.x - i) + Math.abs(curr.y - j);
                if (dist == 0)
                    continue;
                var next = {
                    x: i,
                    y: j,
                    cost: curr.cost + (dist == 1 ? 1 : 1.5)
                };
                
                if (next.x < 1 || next.x > data.opts.height || next.y < 1 || next.y > data.opts.width)
                    continue;
                if (cost[next.x][next.y] <= next.cost)
                    continue;
                var valid = true;
                _.each(data.objects.spikes, function(spike){
                    var dx = (spike.position.x - next.x);
                    var dy = (spike.position.y - next.y);
                    if (Math.sqrt(dx * dx + dy * dy) - spike.radius - currBlob.radius <= data.opts.minDist) {
                        valid = false;
                        return;
                    }
                });
                
                _.each(data.objects.blobs, function(blob){
                    var dx = (blob.position.x - next.x);
                    var dy = (blob.position.y - next.y);
                    if (blob.radius > currBlob.radius + 1 && Math.sqrt(dx * dx + dy * dy) - blob.radius - currBlob.radius <= data.opts.minDist) {
                        valid = false;
                        return;
                    }
                });
                
                if (!valid)
                    continue;
                
                cost[next.x][next.y] = next.cost;
                prev[next.x][next.y] = {x: curr.x, y: curr.y};
                pq.queue(next);
            }
        }
    }
    if(bId == null){
        console.log(data.objects.blobs);
        console.log(vis);
        self.postMessage("[]");
        return;
    }
    var ret = [];
    while (endX != -1 && endY != -1) {
        ret.unshift({x: endX, y: endY});
        var newX = prev[endX][endY].x;
        var newY = prev[endX][endY].y;
        
        endX = newX;
        endY = newY;
    }
    ret.shift();
    ret[ret.length-1] = _.extend({}, data.objects.blobs[bId].position);
    var realRet = [];
    if(ret.length > 2){
        for(var i = 1; i < ret.length-1; i++){
            var slopeA = (ret[i].y-ret[i-1].y)/(ret[i].x-ret[i-1].x);
            var slopeB = (ret[i+1].y-ret[i].y)/(ret[i+1].x-ret[i].x);
            if(Math.abs(Math.atan(slopeA) - Math.atan(slopeB)) > 0.17){
                realRet.push(ret[i]);
            }
        }
    }else{
        realRet = ret;
    }
    realRet.push(ret[ret.length-1]);
    self.postMessage(JSON.stringify(realRet));
});