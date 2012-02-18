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
            "Flash":{"src":"ovp.swf","minver":"10","controls":false, "plugins":[]},
            "Silverlight":{"src":"ovp.xap","minver":"4.0","controls":false, "plugins":[]},
            "HTML5":{"minver":"0","controls":false}
        },
        status_timer : 250,
        // OVP video default configs
        ovpConfig: {
            sources:[
                    {'src':'/videos/trailer.ogv', 'type':'video/ogg'},
                    {'src':'/videos/trailer.mp4','type':'video/mp4'},
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
        this.dispatcher = MetaPlayer.dispatcher(el);     
        this.__readyState = 0;
        this.__paused = (! this.config.immediately);
        this.__duration = NaN;
        this.__ended = false;
        this.__seeking = false;
        this.__controls = false;
        this.__volume = 1;
        this.__muted = false;

        this._ovp = this._render($(el).get(0));
        this.video = this.attach( this._ovp.getContainer() );
        this.video.player = this;
        this._setControls();
        
        this._addEventListeners();
    };

    if( window.MetaPlayer ) {
        MetaPlayer.addPlayer("ovp", function ( options ) {
            var target = $("<div></div>").appendTo(this.video);
            return new OVPlayer(target, options).video;
        });
    } else {
        window.MetaPlayer = {};
    }

    MetaPlayer.ovp = function (target, options) {
        return new OVPlayer(target, options).video;
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
            this.video.dispatch('loadstart');
            
            this._loadtimer.stop();
            
            this._onReady();
            this._startDurationCheck();
        },
        _onReady : function () {
            this._statustimer.start();
            this.__readyState = 4;
            this.video.dispatch("loadeddata");
            this.video.dispatch("canplay");
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
                this.video.dispatch("loadedmetadata");
                this.video.dispatch("durationchange");
                this.video.dispatch("loadeddata");
                clearInterval( this._durationCheckInterval );
                this._durationCheckInterval = null;
            }
        },
        
        _onStatus : function () {
            if ( this._ovp.isPlaying() ) {
                this.__paused = false;
                this.video.dispatch("playing");
                this.video.dispatch("play");
                this.video.dispatch("timeupdate");
            } else {
                this.__paused = true;
            }
            
            if ( this._ovp.isEnded() ) {
                this.__paused = true;
                this.video.dispatch("ended");
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

            if( then && diff< this.config.status_timer )
                return this.__currentTime + (diff / 1000); // approx our position
            else
                this.__currentTimeCache = now;

            this.__currentTime = this._ovp.getCurrentTime();
            return this.__currentTime;
        },
        doSeek : function (time) {
            this.__seeking = true;
            this.video.dispatch("seeking");
            this._ovp.seekTo( time );
            this.__currentTime = time;

            // no seeking events exposed, so fake best we can
            // will be subject to latency, etc
            var self = this;
            setTimeout (function () {
                self.updateTime(); // trigger a time update
                self.__seeking = false;
                self.video.dispatch("seeked");
                self.video.dispatch("timeupdate");
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
            console.log("player load");
        },
        play : function () {
            this._ovp.playpause();
            this.__paused = false;
        },
        pause : function () {
            console.log("click paused");
            this.__paused = true;
            this._ovp.playpause();
            this.dispatcher.dispatch("pause");
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
            console.log(this.__paused);
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
                    val = 0
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
                this.__muted = val
                if( ! this._ovp )
                    return val;
                if( val )
                    this._ovp.mutetoggle();
                else
                    this._ovp.mutetoggle();
                this.video.dispatch("volumechange");
                return val;
            }

            return this.__muted;
        },
        volume : function (val) {
            if( val != null ){
                this.__volume = val;
                if( ! this._ovp )
                    return val;
                this._ovp.mutetoggle();
                this.video.dispatch("volumechange");
            }
            return this.__volume;
        },
        src : function (val) {
            // need to be implemented.
        },
        controls : function (val) {
            if( typeof val !== 'undefined' ) {
                this.__controls = val;
            }
            return this.__controls;
        },
        attach : function (target) {
            target = MetaPlayer.proxy.getProxyObject(target);
            this.dispatcher.attach(target);
            MetaPlayer.proxy.proxyPlayer(this, target);
            return target;
        }
    };
})();
