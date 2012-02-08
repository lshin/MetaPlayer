/**
 * skinnable, touch friendly lightweight scroller
 */


(function () {

    var $ = jQuery;

    var defaults = {
        mouseDrag : false,
        inertial : false  // beta
    };
    var ScrollBar = function (container, options) {
        this.config = $.extend(true, {}, defaults, options);
        this.init(container);
        this.inertiaY = 0;
    };

    var eventX = function (e) {
        return e.pageX || e.originalEvent.touches[0].pageX;
    };
    var eventY = function (e) {
        return  e.pageY || e.originalEvent.touches[0].pageY;
    };

    ScrollBar.prototype = {
        init : function (parent) {
            this.parent = $(parent);

            var self = this;
            var children = this.parent[0].childNodes;

            this.body = $("<div></div>")
                .addClass("mp-scroll-body")
                .bind("resize DOMSubtreeModified size change", function(e) {
                    self.onResize(e);
                })
                .append( children );


            this.scroller = $("<div></div>")
                .css("width", "100%")
                .css("height", "100%")
                .css("overflow", "hidden")
                .addClass("mp-scroll")
                .append(this.body)
                .appendTo(parent);


            // memoise event callbacks
            this._touchStop = function (e) {
                self.onTouchStop(e);
            };
            this._touchMove = function (e) {
                self.onTouchMove(e);
            };

            this._knobStop = function (e) {
                self.onKnobStop(e);
            };
            this._knobMove = function (e) {
                self.onKnobMove(e);
            };

            this.knob = $("<div></div>")
                .css('position', "absolute")
                .css('background', "black")
                .css('top', 0)
                .css('right', "-10px")
                .css('border-radius', "4px")
                .css('background', "#000")
                .css('opacity', .4)
                .css('cursor', "pointer")
                .width(8)
                .addClass("mp-scroll-knob")
                .appendTo(this.parent)
                .bind("mousedown touchstart", function (e) {
                    self.onKnobStart(e);
                });

            this.parent
                .css("position", "relative")
                .css("overflow", "visible")
                .bind("mousewheel", function (e){
                    self.onScroll(e);
                })
                .bind((this.config.mouseDrag ? "mousedown" : '') + " touchstart", function (e) {
                    self.onTouchStart(e);
                });


            this.setScroll(0,0);
        },

        onScroll : function(e) {
            var x = e.originalEvent.wheelDeltaX || e.originalEvent.delta || 0;
            var y = e.originalEvent.wheelDeltaY || e.originalEvent.delta || 0;
            this.scrollBy(-x, -y);
            e.preventDefault();
        },

        scrollBy : function (x, y){
            var sl = this.scroller.scrollLeft();
            var st = this.scroller.scrollTop();
            this.setScroll( sl + x ,  st + y);
        },

        setScroll : function (x, y){
            this.scroller.scrollLeft(x);
            this.scroller.scrollTop(y);
            this.render();
        },

        render: function (animate) {
            if( ! this.body ) {
                return;
            }
            var bh = this.body.height();
            var ph = this.parent.height();
            var kh =  Math.min( ph - ( (bh - ph) / bh * ph ), ph)

            var perY = this.scroller.scrollTop() /  ( bh - ph );
            var knobY = (ph - kh) * perY;

            this.knob
                .toggle( kh < ph );

            if( animate ){
                this.knob.stop().animate({
                    height : kh,
                    top : knobY
                })
            }
            else {
                this.knob.stop()
                    .height(kh)
                    .css('top', knobY);
            }
        },

        onResize : function () {
            this.render(true);
        },

        onTouchStart : function (e) {

            this.touching = {
                lastX : this.scroller.scrollLeft(),
                lastY : this.scroller.scrollTop()
            };

            this.touching.x = eventX(e) + this.touching.lastX;
            this.touching.y = eventY(e) + this.touching.lastY;

            $(document)
                .bind("mousemove touchmove", this._touchMove )
                .bind("mouseup touchend", this._touchStop );

            if( this.config.inertial ) {
                var self = this;
                this.inertiaInterval = setInterval( function() {
                    self.onInertiaUpdate();
                },30);
            }
        },

        onInertiaUpdate : function () {
            this.inertiaY = this.inertiaY * .9;

            if( this.touching ) {
                return;
            }

            if( this.inertiaY < 1 )
                clearInterval( this.inertiaInterval );

            this.scrollBy(0, this.inertiaY);
        },

        onTouchStop : function (e) {

             $(document)
                .unbind("mousemove touchmove", this._touchMove )
                .unbind("mouseup touchend", this._touchStop );
            this.touching = null;


        },

        onTouchMove : function (e) {
            var x = (eventX(e) - this.touching.x) * -1;
            var y = (eventY(e) - this.touching.y) * -1;

            this.inertiaY += y - this.touching.lastY;

            this.touching.lastX = x;
            this.touching.lastY = y;
            this.setScroll(x, y);
            e.stopPropagation();
            e.preventDefault();
        },

        onKnobStart : function (e, inverse) {
            this.scroller.stop();

            this.dragging = {
                x : eventX(e) - this.knob.position().left,
                y : eventY(e) -  this.knob.position().top
            };

            $(document)
                .bind("mousemove touchmove", this._knobMove )
                .bind("mouseup touchend", this._knobStop );

            e.stopPropagation();
            e.preventDefault();
        },

        onKnobStop : function (e) {
             $(document)
                .unbind("mousemove touchmove", this._knobMove )
                .unbind("mouseup touchend", this._knobStop );
            this.dragging = null;

        },

        onKnobMove : function (e) {
            var x = (eventX(e) - this.dragging.x);
            var y = (eventY(e) - this.dragging.y);


            var bh = this.body.height();
            var ph = this.parent.height();
            var kh = this.knob.height();

            var perY = y / (ph - kh);
            this.setScroll(x, perY * (bh -ph) );
        }

    };

    if( ! window.MetaPlayer )
        window.MetaPlayer = {};

    MetaPlayer.scrollbar = function (target, options) {
        return new ScrollBar(target, options);
    };

})();
