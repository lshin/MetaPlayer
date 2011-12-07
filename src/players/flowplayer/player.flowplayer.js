(function () {

    var $ = jQuery;
    var $f = flowplayer;

    var defaults = {
    };

    function FlowplayerLoader (el, options, ramp) {


        if( !(this instanceof FlowplayerLoader ))
            return new FlowplayerLoader(el, options, ramp);

        this.config = $.extend({}, defaults, options);
        this.container = el;
        this.playlist = [];
        this.transcodes = [];


        this.seeking = false;
        this.readyState = 0;
        this.ended = false;
        this._loading = true;
        this.__playing = false;

        Ramp.EventDispatcher(this);

        this._playerSetup();
        this._addContainerProxy();
        this._addMediaProxy();
        this._addPlayerListeners();

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

    }

    Ramp.Players.FlowplayerLoader = FlowplayerLoader;

    FlowplayerLoader.prototype = {

        load : function () {
            this.config.preload = true;
            this.dispatch('loadstart');

            if( this.media.isLoaded()  ) {
                this.media.startBuffering();
            }
        },

        play : function () {
            this.media.play();
        },

        pause : function () {
            this.media.pause();
        },

        _playerSetup : function () {
            // .. instantiate player if doesn't exist
            if( this.container.getParent ) {
                this.media = this.container;
                this.container = this.media.getParent();
            }
        },

        _addPlayerListeners : function () {
            var self = this;

            this.media.onBeforeLoad( function () {
            });

            this.media.onLoad( function () {
                if( self.config.preload )
                    self.load();
            });

            this.media.onVolume( function (level) {
                self.dispatch("volumechange");
            });

            this.media.onMute( function (level) {
                self.dispatch("volumechange");
            });

            this.media.onUnmute( function (level) {
                self.dispatch("volumechange");
            });

            this.media.onError( function () {
            });

            this.media.onPlaylistReplace( function () {
            });

            this.media.onClipAdd( function () {
            });

            this.media.onBufferFull( function () {
            });

            this.media.onBufferEmpty( function () {
            });
            this.media.onBufferStop( function () {
            });

            this.addCommonListeners();
        },

        _setReady : function (){
            if( this.readyState != 4 ) {
                this.readyState = 4;
                this.dispatch("canplay");
            }
        },

        _setPlaying : function ( bool ){
            this.__playing = bool;
            // the play and pause events fire before isPlaying() and isPaused() update

            this._statepoll.start();
        },

        _onPlayStatePoll : function () {
            if( this.media.isPlaying() != this.__playing ) {
                if( ! this._statePollInterval ) {
                    var self = this;
                    this._statePollInterval = setInterval( function () {
                        self._pollPlayState();
                    }, 1000);
                }
                return;
            }
            clearInterval(this._statePollInterval);
            this._statePollInterval = null;

            if( this.__playing ) {
                this.dispatch("playing");
                this._timeupdater.start();
            }
            else {
                this.dispatch("pause");
                this._timeupdater.reset();
            }
        },

        _onTimeUpdate : function  () {
            this.dispatch("timeupdate");
        },

        addCommonListeners : function () {
            var common = this.media.getCommonClip();
            var self = this;

            common.onBegin( function (clip) {
                self.media.setVolume(100);
                self.media.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
                if( self.media.getClip().autoPlay )
                    self._setReady();
            });

            common.onStart( function (clip) {
                self.dispatch('loadeddata');
                self.dispatch('loadedmetadata');
                self.dispatch("durationchange");
                self._setPlaying(true);
            });

            common.onStop( function (clip) {
                self._setPlaying(false);
            });

            common.onFinish( function (clip) {
                self.ended = true;
                self._setPlaying(false);
                self.dispatch("ended");
            });

            common.onPause( function (clip) {
                self._setPlaying(false);
                self._setReady();
            });
            common.onResume( function (clip) {
                self._setPlaying(true);
                self.dispatch("play");
            });

            common.onBeforeSeek( function (clip) {
                self.seeking = true;
                self.dispatch("seeking");
            });

            common.onSeek( function (clip) {
                self.seeking = false;
                self.dispatch("seeked");
                self.dispatch("timeupdate");

                if( this.___playing  )
                    self.dispatch("playing");
                else
                    self.dispatch("pause");

            });

        },

        _addContainerProxy : function () {
            Ramp.Utils.Proxy.proxyProperty("parentNode offsetHeight offsetWidth style className id",
                this.container, this);

            Ramp.Utils.Proxy.proxyFunction("getBoundingClientRect getElementsByTagName",
                this.container, this);
        },

        _addMediaProxy : function () {

            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted buffered seekable" +
                " paused played defaultPlaybackRate playbackRate controls autoplay loop preload",
                this);

//            Ramp.Utils.Proxy.proxyFunction("play pause" +
//                " getBoundingClientRect getElementsByTagName",
//                this.media, this);
//
//            Ramp.Utils.Proxy.proxyEvent("loadstart progress suspend emptied stalled play pause " +
//                "loadedmetadata loadeddata waiting playing canplay canplaythrough " +
//                "seeking seeked timeupdate ended ratechange durationchange volumechange",
//                this.media, this);
        },

        /* Properties */
        _duration : function (){
            if(! this.media.isLoaded() )
                return NaN;
            return this.media.getClip().duration;
        },

        _currentTime : function (val){
            var status = this.media.getStatus();
            if( val !== undefined ){
                this.media.seek(val);
            }
            return status.time;
        },

        _volume : function (val){
            if( val !== undefined )
                this.media.setVolume(val * 100);
            return this.media.getVolume() / 100;
        },

        _muted : function (val){
            if( val !== undefined ){
                if( val )
                    this.media.mute();
                else
                    this.media.unmute();
            }
            var status = this.media.getStatus();
            return status.muted;
        },

//        _buffered : function (){},
//        _seekable : function (){},
//        _played : function (){},

        _paused : function (){
            /// use local --flowplayer.isPaused() is still false during onPause()!
            return ! this.__playing;
        },

        _preload : function (val) {
            if( val !== undefined )
                this.config.preload = val;
        }

        // seeking defaultPlaybackRate playbackRate controls



    };

    $f.addPlugin("ramp", function (el, options, ramp) {

        // ... set up ramp instance


        // ... set up flowplayer mediacontroller

        return this;
    });
})();