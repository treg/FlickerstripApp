var _ = require("underscore")._;
var $ = require("jquery");
var tinycolor = require("tinycolor2");

define([],function() {
    var renderToCanvas = function (width, height, renderFunction) {
        var buffer = document.createElement('canvas');
        buffer.width = width;
        buffer.height = height;
        renderFunction(buffer.getContext('2d'));
        return buffer;
    };

    var drawLine = function(g,x,y,xx,yy) {
        g.beginPath();
        g.moveTo(x,y);
        g.lineTo(xx,yy);
        g.stroke();
    }

    var This = function(el) {
        this.init(el);
    }

    $.extend(This.prototype,{
        init:function(canvas) {
            this.canvas = canvas;
            document = this.canvas.ownerDocument;

            this.start = new Date().getTime();
            this.metrics = null;
            this.rendered = null;
            this.neopixelRenderer = null;
            
            var millis = new Date().getTime();
            var self = this;

            this.repaint();
        },
        repaint:function() {
            var g = this.canvas.getContext("2d");
            this.paint(g);
        },
        paint:function(g) {
            this.canvas.ownerDocument.defaultView.requestAnimationFrame(_.bind(this.repaint,this));

            if (!(this.metrics && this.rendered && this.neopixelRenderer)) return;
            g.clearRect(0,0,this.canvas.width,this.canvas.height);
            var currentFrame = (this.metrics.fps*((new Date().getTime() - this.start)/1000)) % this.metrics.animationLength;
        
            var padding = {top: 35, right: 20, bottom: 10, left: 20};
            var usableWidth = this.canvas.width - padding.left - padding.right;
            var separation = usableWidth / this.metrics.stripLength;

            //render LED strip at current frame
            for (var i=0; i<this.metrics.stripLength; i++) {
                var c = this.neopixelRenderer(i,currentFrame);
                g.fillStyle = c.toHexString();
                g.fillRect(padding.left+i*separation,10,separation/2,separation/2);

                //g.fillStyle = "#ccc";
                //g.strokeRect(padding.left+i*separation,10,separation/2,separation/2);
            }

            g.fillStyle = "lightGray";
            g.fillRect(padding.left,padding.top,this.width-padding.left-padding.right,this.height-padding.top-padding.bottom);
            
            g.fillStyle = "#666";
            g.fillRect(padding.left,padding.top,this.metrics.animationLength,this.metrics.stripLength);
            
            var duration = this.metrics.animationLength/this.metrics.fps;
            var tickLength = 3;
            var labelFrequency = 5;
            g.fillStyle = "black";
            g.textAlign = 'center';
            g.font = "10px Monaco";
            for (var i=0; i<=duration; i++) {
                var x = padding.left + i*this.metrics.fps;
                drawLine(g,x,padding.top-tickLength,x,padding.top);
                if (i % labelFrequency == 0) {
                    g.fillText(i+"s",x,padding.top-tickLength-10);
                }
            }
            g.drawImage(this.rendered, padding.left, padding.top);
            g.fillStyle = "white";
            drawLine(g,padding.left+currentFrame,padding.top,padding.left+currentFrame,padding.top+this.metrics.stripLength);
        },
        setMetrics:function(stripLength,length,fps) {
            this.metrics = {stripLength:stripLength,animationLength:length,fps:fps};
            this.start = new Date().getTime();
        },
        setRenderer:function(renderer) {
            this.start = new Date().getTime();
            this.neopixelRenderer = renderer;
            
            var self = this;
            this.rendered = renderToCanvas(this.metrics.animationLength,this.metrics.stripLength,function(g) {
                for (var x = 0; x<self.metrics.animationLength; x++) {
                    for (var y = 0; y<self.metrics.stripLength; y++) {
                        var c = renderer(y,x);
                        g.fillStyle = c.toHexString();
                        g.fillRect(x,y,1,1);
                    }
                }	
            });
        }
    });

    return This;
});
