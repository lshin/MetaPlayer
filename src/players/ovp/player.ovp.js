(function () {
    var $ = jQuery;
    var ovp = window.ovp;

    var defaults = {
        // OVP main default configs
        strategy : {"order":["HTML5","Flash","Silverlight"]}, // Case is important
        sliderdelay : 5000,
        sliderspeed : "slow",
        immediately : false,
        controls: {'src_img':'/images/play.png'},
        ovp_container_class:'ovp',
        controller_keepalive_seconds: 5,
        players : {
            "Flash":{"src":"ovp-2.1.6.swf","minver":"10","controls":false, "plugins":[]},
            "Silverlight":{"src":"ovp-2.3.1.xap","minver":"4.0","controls":false, "plugins":[]},
            "HTML5":{"minver":"0","controls":false}
        },
        status_timer : 250,
        // OVP video default configs
        ovpConfig: {
            sources:[
                    {'src':'/videos/trailer.ogv', 'type':'video/ogg'},
<<<<<<< HEAD
                    {'src':'/videos/trailer.mp4','type':'video/mp4'},
=======
                    {'src':'/videos/trailer.mp4','type':'video/mp4'}
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            ],
            width : '100%', // swfobject requires width/height of player.
            height : '100%',
            posterimg:'/images/poster.png',
            autobuffer:true,
            autoplay:false,
            id: 'ovp',
            scalemode: 'fit',
            controls: false
        }
    };

    var OVPlayer = function(el, options) {
        if(!(this instanceof OVPlayer))
            return new OVPlayer(el, options);

        this.config = $.extend(true, {}, defaults, options); 
        this.__readyState = 0;
        this.__paused = (! this.config.immediately);
        this.__duration = NaN;
        this.__ended = false;
        this.__seeking = false;
        this.__controls = false;
        this.__volume = 1;
        this.__muted = false;
        this.__src = "";
        
        this._ovp = this._render( $(el).get(0) );
        this.video = this._ovp.getWrapperNode();
<<<<<<< HEAD
        MetaPlayer.proxy.proxyPlayer( this, this.video );
        this.dispatcher = MetaPlayer.dispatcher( this.video );
        
        this.video.player = this;
=======
        this.dispatcher = MetaPlayer.dispatcher( this );
        MetaPlayer.proxy.proxyPlayer( this, this.video );
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
        this._setControls();
        this._addEventListeners();
    };

    if( window.MetaPlayer ) {
        MetaPlayer.addPlayer("ovp", function ( options ) {
<<<<<<< HEAD
            var target = $("<div></div>").appendTo(this.video);
            return new OVPlayer(target, options).video;
=======
            var target = $("<div></div>").appendTo(this.layout.stage);
            this.ovp = OVPlayer(target, options);
            this.video = this.ovp.video;
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
        });
    } else {
        window.MetaPlayer = {};
    }

    MetaPlayer.ovp = function (target, options) {
<<<<<<< HEAD
        return new OVPlayer(target, options).video;
=======
        var ovp = OVPlayer(target, options);
        return ovp.video;
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
    };

    OVPlayer.prototype = {
        _render: function (el) { 
            var presetplay = this.config.immediately;
            if (! presetplay ) this.config.immediately = true;
            ovp.init(this.config);
            this.config.immediately = presetplay;
            return ovp.render(el, this.config.ovpConfig)[0];
        },
        
        _addEventListeners : function () {
            // start ovp player status check
            this._loadtimer = Ramp.timer(this.config.status_timer);
            this._loadtimer.listen('time', this._onBeforeLoad, this);
            this._loadtimer.start();
            
            this._statustimer = Ramp.timer(this.config.status_timer);
            this._statustimer.listen('time', this._onStatus, this);
            
            this.video.listen('playerready', this._onReady, this);
        },
        _onBeforeLoad : function () {
            if(typeof this._ovp.player !== "object")
                return;
<<<<<<< HEAD
            this.dispatcher.dispatch('loadstart');
=======
            this.dispatch('loadstart');
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            this._loadtimer.reset();
            this._onReady();
            this._startDurationCheck();
        },
        _onReady : function () {
            this._statustimer.start();
            this.__readyState = 4;
<<<<<<< HEAD
            this.dispatcher.dispatch("loadeddata");
            this.dispatcher.dispatch("canplay");
=======
            this.dispatch("loadeddata");
            this.dispatch("canplay");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            this.load();
            
            this.video.pause();
            if(this.config.immediately || this.config.ovpConfig.autoplay) {
                this.video.play();
            }
        },
        _startDurationCheck : function () {
            var self = this;
            if( this._durationCheckInterval ) {
                return;
            }
            this._durationCheckInterval = setInterval(function () {
                self._onDurationCheck();
            }, 1000);
        },

        _onDurationCheck : function () {
            var duration = this._ovp.getDuration();
            if( duration > 0 ) {
                this.__duration = duration;
<<<<<<< HEAD
                this.dispatcher.dispatch("loadeddata");
                this.dispatcher.dispatch("loadedmetadata");
                this.dispatcher.dispatch("durationchange");
=======
                this.dispatch("loadeddata");
                this.dispatch("loadedmetadata");
                this.dispatch("durationchange");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
                clearInterval( this._durationCheckInterval );
                this._durationCheckInterval = null;
            }
        },
        
        _onStatus : function () {
            if ( this._ovp.isPlaying() ) {
                this.__paused = false;
<<<<<<< HEAD
                this.dispatcher.dispatch("playing");
                this.dispatcher.dispatch("play");
                this.dispatcher.dispatch("timeupdate");
            } else if ( this._ovp.isEnded() ){
                this.__paused = true;
                this.dispatcher.dispatch("ended");
            } else {
                this.__paused = true;
                this.dispatcher.dispatch("pause");
=======
                this.dispatch("playing");
                this.dispatch("play");
                this.dispatch("timeupdate");
            } else if ( this._ovp.isEnded() ){
                this.__paused = true;
                this.dispatch("ended");
            } else {
                this.__paused = true;
                this.dispatch("pause");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            }
        },
        _setControls : function () {
            if ( this._ovp.controlsState === 'RENDERED' )
                this.__controls = this._ovp.controls;
        },
        _getCurrentTimeFromCache : function () {
            if (! this._ovp.player )
                return 0;
            
            var now = (new Date()).getTime();
            var then = this.__currentTimeCache;
            var diff = now - then;

            if( then && diff < this.config.status_timer )
                return this.__currentTime + (diff / 1000); // approx our position
            else
                this.__currentTimeCache = now;
            
            var ovpCurrentTime = this._ovp.getCurrentTime();
            this.__currentTime = ( ovpCurrentTime < 0 )? 0 : ovpCurrentTime;
            return this.__currentTime;
        },
        doSeek : function (time) {
            this.__seeking = true;
<<<<<<< HEAD
            this.dispatcher.dispatch("seeking");
=======
            this.dispatch("seeking");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            this._ovp.seekTo( time );
            this.__currentTime = time;

            // no seeking events exposed, so fake best we can
            // will be subject to latency, etc
            var self = this;
            setTimeout (function () {
                self.updateTime(); // trigger a time update
                self.__seeking = false;
<<<<<<< HEAD
                self.dispatcher.dispatch("seeked");
                self.dispatcher.dispatch("timeupdate");
=======
                self.dispatch("seeked");
                self.dispatch("timeupdate");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            }, 1500)
        },
        updateTime : function () {
            this.__currentTime = this._ovp.getCurrentTime();
        },
        /**
         * MetaPlayer Media Interfaces
         *
         * @Functions
         * load()
         * play()
         * pause()
         * canPlayType(type)
         *
         */
        load : function () {
            if (! this._ovp.player )
                return;
            
            var src = this.src();
            // start to play video.
        },
        play : function () {
            this.__paused = false;
            this._ovp.playpause();
        },
        pause : function () {
            this.__paused = true;
            this._ovp.playpause();
        },
        canPlayType : function (val) {
            // In ovp, it has to be changed the video sources before it checks.
            return this._ovp.canPlay();
        },
        /**
         * MetaPlayer Media Properties
         * paused()
         * duration()
         * seeking()
         * ended()
         * currentTime(val)
         * muted()
         * volume(val)
         * src(val)
         * readyState()
         * controls()
         */
        paused : function () {
            return this.__paused;
        },
        duration : function () {
            return this.__duration;
        },
        seeking : function () {
            return this.__seeking;
        },
        ended : function () {
            return this.__ended;
        },
        currentTime : function (val) {    
            if( typeof val !== 'undefined' ) {
                if( val < 0 )
<<<<<<< HEAD
                    val = 0
=======
                    val = 0;
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
                if( val > this.duration )
                    val = this.duration;
                this.doSeek(val);
            }
            
            return this._getCurrentTimeFromCache();
        },
        readyState : function (val) {
            if( val !== undefined )
                this.__readyState = val;
            return this.__readyState;
        },
        muted : function (val) {
            if( val != null ){
<<<<<<< HEAD
                this.__muted = val
=======
                this.__muted = val;
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
                if( ! this._ovp )
                    return val;
                if( val )
                    this._ovp.mutetoggle();
                else
                    this._ovp.mutetoggle();
<<<<<<< HEAD
                this.dispatcher.dispatch("volumechange");
=======
                this.dispatch("volumechange");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
                return val;
            }

            return this.__muted;
        },
        volume : function (val) {
            if( val != null ){
                this.__volume = val;
                if( ! this._ovp )
                    return val;
                // ovp doesn't support to change any volume level.
                this._ovp.mutetoggle();
<<<<<<< HEAD
                this.dispatcher.dispatch("volumechange");
=======
                this.dispatch("volumechange");
>>>>>>> bcbc96dbbdbaf17ee14954e7a78e5efb5664da0d
            }
            return this.__volume;
        },
        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
            }
            return this.__src
        },
        controls : function (val) {
            if( typeof val !== 'undefined' ) {
                this.__controls = val;
            }
            return this.__controls;
        }
    };
})();
