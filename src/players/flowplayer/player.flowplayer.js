(function () {

    var $ = jQuery;
    var $f = window.flowplayer;

    var defaults = {
        autoplay : false,
        preload : true,
        autoAdvance : true,
        related: true,
        loop : false,
        controls : true,
        swfUrl : "flowplayer-3.2.7.swf",
        wmode : "transparent",
        fpConfig : {
            clip : {
                scaling : "fit"
            }
        }
    };

    var FlowPlayer = function (el, url, options){

        if( !(this instanceof FlowPlayer ))
            return new FlowPlayer(el, url, options);

        this.config = $.extend(true, {}, defaults, options);

        this.dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this.dispatcher.attach(this);

        // set up service, have it use our event dispatcher
        this.service = Ramp.data({
            dispatcher : this.dispatcher
        });
        this.service.attach(this);
        this.onPlaylistChange = this.dispatcher.observer("playlistChange");
        this.onTrackChange = this.dispatcher.observer("trackChange");

        this.__seeking = null;
        this.readyState = 0;
        this.ended = false;
        this._loading = true;
        this.__playing = false;

        Ramp.Utils.Proxy.mapProperty("index loop", this);

        this._addMediaProxy();
        this._pageSetup(el);
        this._addPlayerListeners();
        this._addServiceListeners();
        this._addContainerProxy();

        this.preload  = this.config.preload;
        this.autoplay = this.config.autoplay;
        this.loop = this.config.loop;
        this.src = url;

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);
    };

    Ramp.flowplayer = function (el, url, options) {
        return FlowPlayer(el, url, options);
    };

    Ramp.metaplayer = Ramp.flowplayer;

    if( $f ) {
        $f.addPlugin("ramp", function (url, options) {
            this._ramp = FlowPlayer(this, url, options);
            return this;
        });
    }

    FlowPlayer.prototype = {

        load : function () {
            this.preload = true;
            if( this._flowplayer.isLoaded() && this._flowplayer.getClip() ) {
                this.dispatch('loadstart');
                if( this.autoplay )
                    this._flowplayer.play();
                else
                    this._flowplayer.startBuffering();
            }
        },

        play : function () {
            this.autoplay = true;
            this.__playing = true; // helps onBeforeBegin() know to ignore clip.autoPlay == false
            this.load();
        },

        pause : function () {
            this._flowplayer.pause();
        },

        _pageSetup : function (el) {

            var c = $('<div class="mp-player" style="position:relative;top:0;left:0;width:100%;height:100%"></div>');
            this.container = c;

            // if passed in fp instance
            if( el.getCommonClip ) {
                this._flowplayer = el;
                c.append(el);
                var common  = this._flowplayer.getCommonClip();
                this.preload = Boolean( common.autoBuffering );
                this.autoplay = Boolean( common.autoPlay );
            }
            // otherwise start one up
            else {
                var config = $.extend(true, {
                    clip : {
                        autoPlay: false,
                        autoBuffering: true
                    }
                },this.config.fpConfig);
                $(el).append(c);
                var v = $('<div class="mp-video" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>');
                $(c).append(v);
                this._flowplayer = $f( v.get(0), {
                    src: this.config.swfUrl,
                    wmode: this.config.wmode
                }, config );
            }
        },

        _onMetaData : function (metadata) {
            // update clip title, desc, etc
        },

        _onRelated : function (related) {
            if( this._hasPlaylist || ! this.config.related )
                return;

            this._hasPlaylist = true;
            var fp = this._flowplayer;

            $.each(related, function (i, rel) {
                fp.addClip({
                    autoBuffering : true,
                    autoPlay : true,
                    title : rel.title,
                    description : rel.description,
                    thumbnail : rel.thumbnail,
                    url : "ramp::"+rel.rampId
                });
            });
        },

        _onTranscodes : function (transcodes) {
            var clip = this._flowplayer.getClip();
            var obj = {
                autoBuffering: true
            };

            $.each(transcodes, function (i, t) {
                if( t.name == "default")
                    obj.url = t.url;
                if( t.name == "ios.stream")
                    obj.iosUrl = t.url;
            });

            if( clip && ! clip.isCommon )
                clip.update(obj);

            if( this.autoplay ) {
                this.play();
            }
            else {
                this.load();
            }
        },

        _addPlayerListeners : function () {
            var self = this;

            this._flowplayer.onBeforeLoad( function () {
            });

            this._flowplayer.onLoad( function () {
                self._onLoad();
            });
        },

        _addServiceListeners : function () {
            this.onTrackChange(this._onTrackChange, this);
            this.onMetaData(this._onMetaData, this);
            this.onTranscodes(this._onTranscodes, this);
            this.onRelated(this._onRelated, this);
        },
        _onTrackChange : function () {
//            console.log("_onTrackChange");
        },
        _onLoad : function () {
            var self = this;

            this._flowplayer.onVolume( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onMute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onUnmute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onError( function () {
            });
            this._flowplayer.onPlaylistReplace( function () {
                self.dispatch("playlistChange");
            });
            this._flowplayer.onClipAdd( function () {
            });
            this._flowplayer.onBufferFull( function () {
//                self.dispatch("canplaythrough");
            });

            this._flowplayer.onBufferEmpty( function () {
//                console.log("onBufferEmpty")
            });
            this._flowplayer.onBufferStop( function () {
//                console.log("onBufferStop")
            });
            this._flowplayer.onClipAdd( function (clip) {
            });

            var common = this._flowplayer.getCommonClip();

            common.onBeforeBegin( function (clip) {
                if( clip.url && clip.url.indexOf('ramp:') == 0) {
                    if( ! self.preload && ! clip.autoBuffering) {
                        // flowplayer.startBuffering() or flowplayer.play() called,
                        // we don't know which, so assume play()
                        self.autoplay = true;
                        self.preload = true;
                    }
                    self.service.load(clip.url);
                    return false;
                }
                self.dispatch("trackChange");
                return true;
            });

            common.onBegin( function (clip) {
                self._flowplayer.setVolume(100);
                self._flowplayer.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
                if( ! this.autoplay && self._flowplayer.getClip().autoPlay ) {
                    self._setReady();
                }
                else
                    self._setPlaying(true);
            });

            common.onStart( function (clip) {
                self.dispatch('loadeddata');
                self.dispatch('loadedmetadata');
                self.dispatch("durationchange");
            });

            common.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
            });

            common.onFinish( function (clip) {
                self.ended = true;
                self._setPlaying(false);

                var pl = self._flowplayer.getPlaylist();

                if( ! self.config.autoAdvance ) {
                    self._flowplayer.stop();
                }
                else if( clip.index + 1 == pl.length ) {

                    self.dispatch("playlistComplete");
                    if( self.loop ) {
                        self._flowplayer.play(0);
                    }
                    else {
                        self._flowplayer.stop();
                    }
                }
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

                // fp doesn't do seeks while paused until it plays again, so we fake
                if( self.paused )  {
                    self.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            common.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused  )
                    self.dispatch("seeked");
            });

            this.controls = this.config.controls;

            if( this.src ) {
                this._flowplayer.setPlaylist([{ url : this.src }]);
                this.service.load(this.src);
            }
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
            if( this._flowplayer.isPlaying() != this.__playing )
                return;

            this._statepoll.reset();

            if( this.__playing ) {
                this.autoplay = true;
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
            var parent = this._flowplayer.getParent();

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
                " paused played defaultPlaybackRate playbackRate controls autoplay preload src",
                this);
        },

        /* Properties */
        _duration : function (){
            if(! this._flowplayer.isLoaded() )
                return NaN;
            var clip = this._flowplayer.getClip();
            return clip ? clip.duration : NaN;
        },

        _currentTime : function (val){
            if( val !== undefined ){
                this.__seeking = val;
                this._flowplayer.seek(val);
            }
            var status = this._flowplayer.getStatus();
            if( this.__seeking !== null )
                return this.__seeking;
            return status.time;
        },

        _volume : function (val){
            if( val !== undefined )
                this._flowplayer.setVolume(val * 100);
            return this._flowplayer.getVolume() / 100;
        },

        _muted : function (val){
            if( val !== undefined ){
                if( val )
                    this._flowplayer.mute();
                else
                    this._flowplayer.unmute();
            }
            var status = this._flowplayer.getStatus();
            return status.muted;
        },

        _paused : function (){
            /// use local --flowplayer.isPaused() is still false during onPause()!
            return ! this.__playing;
        },

        _src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
                if( this._flowplayer.isLoaded() )
                    this._flowplayer.setPlaylist([src]);
            }
            return this.__src;
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
            if( ! this._flowplayer.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            if( val !== undefined ){
                if( val )
                    this._flowplayer.getControls().show();
                else
                    this._flowplayer.getControls().hide();
            }
            return this._flowplayer.getControls().opacity != 1;
        },

        _seeking : function (val) {
            return Boolean( this.__seeking !== null );
        },

//        _seekable : function (){},
//        _played : function (){},
//        _defaultPlaybackRate : function (){},
//        _playbackRate : function (){},

        /* Playlist */

        _index : function (i) {
            var clip =  this._flowplayer.getClip();
            if( ! clip ) {
                return 0;
            }

            var index = clip.index; // getIndex() is buggy
            if( i !== undefined ) {
                i = this._resolveIndex(i);
                var paused = this.paused;
                this._flowplayer.play(i);
                if( paused ) {
                    this._flowplayer.pause();
                }

            }

            return index;
        },

        _resolveIndex : function (i) {
            var pl = this._flowplayer.getPlaylist();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return;
            }
            return i;
        },

        _loop : function (bool) {
            if( bool !== undefined ) {
                this.__loop = bool;
            }
            return this.__loop;
        },

        queue : function ( media ) {
            this._flowplayer.addClip(media);
        },
        clear: function (){
            this._flowplayer.play([]);
        },
        next : function () {
            this.index++;
        },
        previous : function () {
            this.index--;
        },
        nextTrack : function () {
            return this.track( this.nextTrackIndex() );
        },
        nextTrackIndex : function () {
            return this._resolveIndex( this.index + 1);
        },
        track : function (i) {
            if( i == undefined )
                i = this.index;
            var pl = this._flowplayer.getPlaylist();
            return pl[ this._resolveIndex(i) ];
        },
        tracks : function () {
            return this._flowplayer.getPlaylist();
        },

        _toMediaRss : function (clip) {
            var item = {
                title : clip.title,
                description : '',
                content : [{
                    isDefault : true,
                    type : '',
                    bitRate : '',
                    url : ''
                }],
                text : [] // transcript
            }
        }
    };

})();