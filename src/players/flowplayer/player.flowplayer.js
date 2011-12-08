(function () {

    var $ = jQuery;
    var $f = flowplayer;

    var defaults = {
        autoplay : true,
        preload : true,
        related: true,
        loop : false,
        controls : true,
        swfUrl : "flowplayer-3.2.7.swf",
        wmode : "transparent",
        fpConfig : {
        }
    };

    function FlowplayerLoader (el, options, ramp) {

        if( !(this instanceof FlowplayerLoader ))
            return new FlowplayerLoader(el, options, ramp);

        this.config = $.extend(true, {}, defaults, options);
        this.container = el;
        this.playlist = [];
        this.transcodes = [];

        this.__seeking = null;
        this.readyState = 0;
        this.ended = false;
        this._loading = true;
        this.__playing = false;

        this.__preload  = this.config.preload;
        this.__autoplay = this.config.autoplay;

        Ramp.EventDispatcher(this);

        this._addMediaProxy();
        this._playerSetup();
        this._addPlayerListeners();
        this._addContainerProxy();

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        this.ramp = ramp;
        if( this.ramp ) {
            this.ramp.service.metadata(this._onMetadata, this);
            this.ramp.service.transcodes(this._onTranscodes, this);
            this.ramp.service.related(this._onRelated, this);
            this.ramp.media = this;
        }
    }

    Ramp.Players.FlowplayerLoader = FlowplayerLoader;

    Ramp.prototype.flowplayer = function (el, options){
        this.media = FlowplayerLoader(el, options, this);
        return this.media;
    };

    $f.addPlugin("ramp", function (rampId, rampHost) {
        this.ramp = Ramp(rampId, rampHost);
        Ramp.Players.FlowplayerLoader( this, {}, this.ramp );
        return this;
    });

    FlowplayerLoader.prototype = {

        load : function () {
            this.preload = true;
            if( this.media.isLoaded()  ) {
                this.media.startBuffering();
                this.dispatch('loadstart');
            }
        },

        play : function () {
            this.preload = true;
            this.autoplay = true;
            this.__playing = true; // helps onBeforeBegin() know to ignore clip.autoPlay == false
            this.media.play();
        },

        pause : function () {
            this.media.pause();
        },

        _playerSetup : function () {

            // if passed in fp instance
            if( this.container.getCommonClip ) {
                this.media = this.container;
                this.container = this.media.getParent();
                var common  = this.media.getCommonClip();
                this.preload = Boolean( common.autoBuffering );
                this.autoplay = Boolean( common.autoPlay );
            }
            // otherwise start one up
            else {
                var config = $.extend(true, {
                    clip : {
                        autoPlay: this.config.autoplay,
                        autoBuffering: this.config.preload
                    }
                },this.config.fpConfig);
                this.media = $f( this.container.substr(1), {
                    src: this.config.swfUrl,
                    wmode: this.config.wmode
                }, config );
            }
        },

        _onMetadata : function (metadata) {
            if( this._hasPlaylist )
                return;
            this.playlist.push( metadata );
        },

        _onRelated : function (related) {
            if( this._hasPlaylist || ! this.config.related )
                return;

            this.playlist = this.playlist.concat(related);
            this._hasPlaylist = true;
            this.dispatch("playlistChange", this.playlist);
        },

        _onTranscodes : function (transcodes) {
            this._transcodes = transcodes;
            if( this.media.isLoaded() )
                this._setPlaylist();
        },

        _setPlaylist: function () {
            var self = this;
            var clip = this.media.getClip();

            var obj = {
            };

            $.each(this._transcodes, function (i, t) {
                if( t.name == "default")
                    obj.url = t.url;
                if( t.name == "ios.stream")
                    obj.iosUrl = t.url;
            });

            if( clip && clip.url )
                clip.update(obj);
            else
                this.media.setPlaylist([obj]);

            if( this.autoplay )
                this.media.play();
            else
                this.media.startBuffering();
        },

        _addPlayerListeners : function () {
            var self = this;

            this.media.onBeforeLoad( function () {
            });

            this.media.onLoad( function () {
                self._onLoad();
            });
        },

        _onLoad : function () {
            var self = this;

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

            var common = this.media.getCommonClip();

            common.onBeforeBegin( function (clip) {
                if( clip.url && clip.url.indexOf('ramp:') == 0) {
                    var rampId = clip.url.substr(5);

                    if( ! self.preload && ! clip.autoBuffering) {
                        // flowplayer.startBuffering() or flowplayer.play() called,
                        // we don't know which, so assume play()
                        self.autoplay = true;
                        self.preload = true;
                    }
                    self.ramp.service.load(rampId, clip.rampHost);
                    return false;
                }
                return true;
            });

            common.onBegin( function (clip) {
                self.media.setVolume(100);
                self.media.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
                if( ! this.autoplay && self.media.getClip().autoPlay )
                    self._setReady();
            });

            common.onStart( function (clip) {
                self.dispatch('loadeddata');
                self.dispatch('loadedmetadata');
                self.dispatch("durationchange");
                self._setPlaying(true);
            });

            common.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
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
                self.dispatch("seeking");
                self.dispatch("timeupdate");

                // fp doesn't do seeks while paused until playing again
                if( self.paused )
                    self.dispatch("seeked");
            });

            common.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused  )
                    self.dispatch("seeked");
            });

            this.controls = this.config.controls;

            if( this._transcodes )
                this._setPlaylist();

            if( this.preload )
                this.load();
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
            if( this.media.isPlaying() != this.__playing )
                return;

            this._statepoll.reset();

            if( this.__playing ) {
                this.dispatch("playing");
                this.dispatch("play");
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

        _addContainerProxy : function () {
            var container = $(this.container).get(0);
            var parent = this.media.getParent();

            Ramp.Utils.Proxy.proxyProperty("parentNode clientHeight clientWidth offsetHeight" +
                " clientTop clientLeft scrollTop scrollLeft offsetWidth style className id",
                parent, this);

            Ramp.Utils.Proxy.proxyFunction("getBoundingClientRect getElementsByTagName",
                parent, this);

            Ramp.Utils.Proxy.proxyEvent("click mousedown mouseup mouseover mouseoout" +
                " touchstart touchend touchmove",
                parent, this);
        },

        _addMediaProxy : function () {
            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted buffered seeking seekable" +
                " paused played defaultPlaybackRate playbackRate controls autoplay loop preload",
                this);
        },

        /* Properties */
        _duration : function (){
            if(! this.media.isLoaded() )
                return NaN;
            var clip = this.media.getClip();
            return clip ? clip.duration : NaN;
        },

        _currentTime : function (val){
            if( val !== undefined ){
                this.__seeking = val;
                this.media.seek(val);
            }
            var status = this.media.getStatus();
            if( this.__seeking !== null )
                return this.__seeking;
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

        _paused : function (){
            /// use local --flowplayer.isPaused() is still false during onPause()!
            return ! this.__playing;
        },

        _preload : function (val) {
            if( val !== undefined )
                this.__preload = val;
            return this.__preload;
        },

        _autoplay : function (val) {
            if( val !== undefined )
                this.__autoplay = val;
            return this.__autoplay;
        },

        _controls : function (val) {
            if( ! this.media.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            if( val !== undefined ){
                if( val )
                    this.media.getControls().show();
                else
                    this.media.getControls().hide();
            }
            return this.media.getControls().opacity != 1;
        },

        _seeking : function (val) {
            return Boolean( this.__seeking !== null );
        }

//        _buffered : function (){},
//        _seekable : function (){},
//        _played : function (){},
//        _defaultPlaybackRate : function (){},
//        _playbackRate : function (){},

    };

})();