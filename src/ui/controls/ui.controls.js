
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
        createMarkup : true,
        renderTags : true,
        renderMetaq : false
    };

    var Controls = function (player, service, options) {

        if( !(this instanceof Controls) )
            return new Controls(player, service, options);

        this.config = $.extend(true, {}, defaults, options);

        // two-argument constructor(player, options)
        if( options == undefined && player.service ) {
            options = service;
            service = player.service;
        }

        this.service = service;

        var target = $(this.config.container || $(player).parent() );
        this.container = this.create('controls');
        target.append(this.container );

        if( typeof player == "string")
            player = document.getElementById( player.substr(1) );
        this.player = player;
        this.player.controls = false;

        this.annotations = [];

        if( this.config.createMarkup )
            this.createMarkup();

        this.addPlayerListeners();
        this.addUIListeners();
        this.addDataListeners();

        this.trackTimer = Ramp.Timer(this.config.trackIntervalMsec);
        this.trackTimer.listen('time', this.render, this);

        this.clockTimer = Ramp.Timer(this.config.clockIntervalMsec);
        this.clockTimer.listen('time', this.onClockTimer, this);
    };

    Ramp.controls = function (player, options) {
        return  Controls(player, options);
    };

    Controls.prototype = {

        addPlayerListeners : function () {
            var self = this;
            $(this.player).bind('pause play seeked seeking', function(){
                self.onPlayStateChange()
            });
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
            if(! this.service.onMetaData )
                return;
            if( this.config.renderTags )
                this.service.onTags(this._onTags, this);

            if( this.config.renderMetaq )
                this.service.onMetaQ(this._onMetaq, this);
        },

        _onTags : function (tags) {
            this.clearAnnotations();
            var self = this;
            $.each(tags, function (i, tag){
                $.each(tag.timestamps, function (j, time){
                    self.addAnnotation(time, null, tag.term, "tag");
                });
            });
            this.renderAnnotations();
        },

        _onMetaq : function (popcorn) {
            var self = this;
            $.each(popcorn, function (type, events){
                $.each(events, function (i, event){
                    self.addAnnotation(event.start, event.end, event.text || event.term, "metaq");
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
                self.seek(time);
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
//            buffer.animate( { width : bufferPercent + "%"}, this.config.clockIntervalMsec, 'linear');
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

            var msec = this.config.trackIntervalMsec;

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

            if( ! this.player.paused && this.config.leading && !(this.player.seeking || this.dragging) ){
                fill.animate( { width : toPercent + "%"}, msec, 'linear');
                knob.animate( { left : toPercent + "%"}, msec, 'linear');
            }

        },

        addAnnotation : function (start, end, title, cssClass) {
            var overlay = this.find('track-overlay');
            var marker = this.create("track-marker");

            marker.hide();

            var self = this;
            marker.click( function (e) {
                return self.seek(parseFloat(start) + self.options.annotationSeekOffsetSec);
            });

            if( title  )
                marker.attr('title', this.formatTime(start) + "  " + title);

            if( cssClass)
                marker.addClass( this.cssName(cssClass) );

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

            var box = this.create('box');
            controls.append(box)

            var play = this.create('play');
            play.append( this.create('icon-play') );
            box.append( play);
            box.append( this.create('fullscreen') );

            var time = this.create('time');
            time.append( this.create('time-current') );
            time.append( this.create('time-duration') );
            controls.append(time);

            var track = this.create('track');
            track.append( this.create('track-buffer') );
            track.append( this.create('track-fill') );
            track.append( this.create('track-overlay') );
            track.append( this.create('track-knob') );
            box.append(track);
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

        /* core */
        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className){
            return $("<div></div>").addClass( this.cssName(className) );
        },

        cssName : function (className){
            return  this.config.cssPrefix + className;
        }

    };

})();
