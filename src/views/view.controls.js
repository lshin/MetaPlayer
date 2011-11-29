
// timeline / control bar for HTML5 media API
// supports timeline annotations
(function () {

    var $ = jQuery;

    var defaults = {
        cssPrefix : 'metaplayer-',
        leading: true,
        trackIntervalMsec : 5000,
        clockIntervalMsec : 500,
        annotationSeekOffsetSec : -1,
        createMarkup : true
    };

    var Controls = function (video, options, ramp) {

        if( !(this instanceof Controls) )
            return new Controls(video, options, ramp);

        this.options = $.extend(true, {}, defaults, options);

        var target = $(this.options.container || $(video).parent() );
        this.container = this.create('controls');
        target.append(this.container );

        if( typeof video == "string")
            video = document.getElementById( video.substr(1) );
        this.player = video;
        this.player.controls = false;

        this.ramp = ramp;

        this.annotations = [];

        if( this.options.createMarkup )
            this.createMarkup();

        this.addPlayerListeners();
        this.addUIListeners();
        this.addDataListeners();

        this.trackTimer = Ramp.Timer(this.options.trackIntervalMsec);
        this.trackTimer.listen('time', this.render, this);

        this.clockTimer = Ramp.Timer(this.options.clockIntervalMsec);
        this.clockTimer.listen('time', this.onClockTimer, this);
    };

    Ramp.Controls = Controls;

    Ramp.prototype.controls = function (media, options) {
        return Controls(media, options, this);
    };

    if( Ramp.Video ) {
        Ramp.Video.prototype.controls = function ( options ) {
            return Controls(this.media, options, this.ramp);
        }
    }

    Controls.prototype = {

        addPlayerListeners : function () {
            var self = this;
//            this.player.listen('load', this.onLoad, this);
            $(this.player).bind('pause play seeked seeking', function(){
                self.onPlayStateChange()
            });
//            this.player.listen('seeked', this.onPlayStateChange, this);
        },

        onLoad : function (data) {
            var self = this;
            self.clearAnnotations();
            $(data.jumptags).each( function () {
                var jump = this;
                $(this.timestamps).each( function () {
                    self.addAnnotation(this, null, jump.term);
                })
            });
        },

        addUIListeners : function (el) {
            var self = this;

            this.find('play').click( function (e) {
                self.onPlayToggle(e);
            });

            this.find('track-knob').mousedown( function (e) {
                return self.onKnobMouseDown(e);
            });

            this.find('track-fill').mousedown( function (e) {
                return self.onKnobMouseDown(e);
            });

            this.find('track-buffer').mousedown( function (e) {
                return self.onKnobMouseDown(e);
            });

            this.find('track').mousedown( function (e) {
                return self.onKnobMouseDown(e);
            });

            $(document).mouseup( function (e) {
                return self.onKnobMouseUp(e);
            });

            $(document).mousemove( function (e) {
                return self.onKnobMouseMove(e);
            });

        },

        addDataListeners : function () {
            if(! this.ramp ) {
                return;
            }
            this.ramp.tags(this._onTags, null, this);
        },

        _onTags : function (tags) {
            var self = this;
            this.clearAnnotations();
            $.each(tags, function (i, tag){
                $.each(tag.timestamps, function (j, time){
                    self.addAnnotation(time, null, tag.term);
                });
            });
            this.renderAnnotations();
        },

        onClockTimer : function (e) {
            if( ! this.dragging )
                this.renderTime();
//            if( ! this.buffered )
//                this.renderBuffer();
        },

        onPlayToggle : function () {
            var p = this.player;
            if( p.paused )
                p.play();
            else
                p.pause();

            this.render();
        },

        onPlayStateChange : function () {
            // manage our timers based on play state
            if(! this.player.paused ){
                this.clockTimer.start();
                this.trackTimer.start();
            }
            else {
                this.clockTimer.reset();
                this.trackTimer.reset();
            }
            this.render();
        },

        onKnobMouseDown : function (e) {
            this.dragging = true;
            this.find('track-knob').stop();
            this.onKnobMouseMove(e);
            e.preventDefault();
            return false;
        },

        onKnobMouseUp : function (e) {
            if( ! this.dragging ) {
                return;
            }
            this.dragging = false;
            this.setByMousePosition(e);
        },

        onKnobMouseMove : function (e) {
            if( ! this.dragging )
                return;

            var buffer = this.find('track-buffer');
            var knob = this.find('track-knob');
            var track = this.find('track');

            var parent = knob.parent().offset();
            var x = e.pageX - parent.left;


            x = Math.min(x, track.width());
//            x = Math.min(x, buffer.width());
            x = Math.max(x, 0);


            var ratio = x / track.width();
            var t = ratio * this.player.duration;

            this.renderTime(t);

            knob.css('left', x + "px");
            this.setByMousePosition(e, true);
        },

        setByMousePosition : function (e, throttle) {
            var knob = this.find('track-knob');
            var track = this.find('track');
            var parent = knob.parent();
            var x = knob.position().left;

            var percent = x / parent.width();
            var time = percent * this.player.duration;

            if( throttle )
                this.throttledSeek(time);
            else
                this.seek(time);
        },

        throttledSeek : function ( time ){
            clearTimeout( this.seekDelay );
            var self = this;
            this.seekDelay = setTimeout( function () {
//                self.seek(time);
            }, 100);
        },

        seek : function (time) {
            clearTimeout( this.seekDelay );
            this.player.currentTime = parseFloat(time);
            this.render();
        },

        renderTime : function (time ) {
            if( ! time ) {
                time = this.player.currentTime; // render seek target if present
            }
            this.find("time-current").text( this.formatTime(time) );
        },

//        renderBuffer : function (){
//            var status = this.player.status();
//            var bufferPercent = status.buffer.end / this.player.duration * 100;
//            var buffer = this.find('track-buffer').stop();
//            buffer.animate( { width : bufferPercent + "%"}, this.options.clockIntervalMsec, 'linear');
//            if( bufferPercent == 100)
//                this.buffered = true;
//        },

        render : function (){
            var duration = this.player.duration;
            var time = this.player.currentTime // render seek target if present

            this.find('play').toggleClass( this.cssName('pause'), ! this.player.paused );
            this.find('time-duration').text(' / ' + this.formatTime( duration ) );

            if( duration ){
               this.renderAnnotations();
            }

            var msec = this.options.trackIntervalMsec;

            // time isn't always ok correct immediately following a seek
            this.renderTime();

            var trackPercent = time / duration * 100;
            var toPercent = (time +  (msec/1000) ) / duration * 100;
            toPercent = Math.min(toPercent, 100);


            var fill = this.find('track-fill').stop();
            var knob = this.find('track-knob').stop();

            if( this.player.paused ) {
                toPercent = trackPercent;
            }

            if( this.player.seeking ){
                msec = msec * 3; // give time and don't overshoot the animation
            }

            fill.width( trackPercent + "%");

            if( ! this.dragging ){
                knob.css('left', trackPercent + "%");
            }

            if( ! this.player.paused && this.options.leading && !(this.player.seeking || this.dragging) ){
                fill.animate( { width : toPercent + "%"}, msec, 'linear');
                knob.animate( { left : toPercent + "%"}, msec, 'linear');
            }

        },

        addAnnotation : function (start, end, title) {
            var overlay = this.find('track-overlay');
            var marker = this.create("track-marker");

            marker.hide();

            var self = this;
            marker.click( function (e) {
                return self.seek(parseFloat(start) + self.options.annotationSeekOffsetSec);
            });

            if( title  )
                marker.attr('title', this.formatTime(start) + "  " + title);

            overlay.append(marker);
            this.annotations.push({
                start : start,
                end : end,
                el : marker
            });
            return marker;
        },

        renderAnnotations : function () {
            var duration = this.player.duration;
            if( ! duration )
                return;
            $(this.annotations).each( function (i, annotation) {
                var trackPercent = annotation.start / duration * 100;
                annotation.el.css('left', trackPercent + "%");
                if( annotation.end ) {
                    var widthPercent = (annotation.end - annotation.start) / duration * 100;
                    annotation.el.css('width', widthPercent + "%");
                }
                annotation.el.show();
            });
        },

        clearAnnotations : function () {
            this.find('track-overlay').empty();
            this.annotations = [];
        },

        createMarkup : function () {
            var controls = $(this.container);
            var play = this.create('play');
            play.append( this.create('icon-play') );
            controls.append( play);
            controls.append( this.create('fullscreen') );

            var time = this.create('time');
            time.append( this.create('time-current') );
            time.append( this.create('time-duration') );
            controls.append(time);

            var track = this.create('track');
            track.append( this.create('track-buffer') );
            track.append( this.create('track-fill') );
            track.append( this.create('track-overlay') );
            track.append( this.create('track-knob') );
            controls.append(track);
        },

        // display seconds in hh:mm:ss format
        formatTime : function (time) {
            var zpad = function (val, len) {
                var r = String(val);
                while( r.length < len ) {
                    r = "0" + r;
                }
                return r;
            };
            var hr = Math.floor(time / 3600);
            var min = Math.floor( (time %  3600) / 60);
            var sec = Math.floor(time % 60);
            var parts = [
                zpad(min, 2),
                zpad(sec, 2)
            ];
            if( hr )
                parts.unshift(hr);
            return parts.join(":");
        },

        /* utils */
        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className){
            return $("<div></div>").addClass( this.cssName(className) );
        },

        cssName : function (className){
            return  this.options.cssPrefix + className;
        }

    };

})();