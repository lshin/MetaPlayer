(function () {

    var $ = jQuery;
    var $f = window.flowplayer;

    var defaults = {
        autoplay : false,
        preload : true,
        advance : true,
        related: true,
        loop : false,
        controls : true,
        swfUrl : "flowplayer-3.2.7.swf",
        wmode : "transparent",
        statusThrottleMSec : 500,
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
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = true;

        this._pageSetup(el);
        this._addServiceListeners();

        this.__preload = this.config.preload;
        this.__autoplay = this.config.autoplay;
        this.__loop = this.config.loop;
        this.__advance = this.config.advance;
        this.__src = url;

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        var self = this;
        this._flowplayer.onLoad( function () {
            self._onLoad();
        });
    };

    Ramp.flowplayer = function (el, url, options) {
        var player = FlowPlayer(el, url, options);
        player.video._player = player;
        return player.video;
    };

    FlowPlayer.prototype = {

        _pageSetup : function (el) {
            // if passed in fp instance
            if( el.getCommonClip ) {
                this._flowplayer = el;
                var common  = this._flowplayer.getCommonClip();
                this.preload( Boolean(common.autoBuffering) );
                this.autoplay( Boolean(common.autoPlay) );
            }
            // otherwise start one up
            else {
                var config = $.extend(true, {
                    clip : {
                        autoPlay: false,
                        autoBuffering: true
                    }
                },this.config.fpConfig);
                var v = $('<div class="mp-video""></div>');
                $(el).append(v);
                this._flowplayer = $f( v.get(0), {
                    src: this.config.swfUrl,
                    wmode: this.config.wmode
                }, config );
            }
            this.video = this._flowplayer.getParent();
            this.decorate(this.video);
            Ramp.UI.ensureOffsetParent( this.video );
        },

        _addServiceListeners : function () {
            this.service.onMetaData(this._onMetaData, this);
            this.service.onTranscodes(this._onTranscodes, this);
            this.service.onRelated(this._onRelated, this);
        },


        _onMetaData : function (metadata) {
            // update clip title, desc, etc
            this._metadata = metadata;
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
            var obj = {
                autoBuffering: true,
                url : this.src(),
                title : this._metadata.title,
                description : this._metadata.description,
                thumbnail : this._metadata.thumbnail
            };

            $.each(transcodes, function (i, t) {
                if( t.name == "default")
                    obj.url = t.url;
                if( t.name == "ios.stream")
                    obj.iosUrl = t.url;
            });


            var clip = this._flowplayer.getClip();
            if( clip ) {
                clip.update(obj);
            }
            else {
                this._flowplayer.setPlaylist([
                    obj
                ]);
            }

            if( this.autoplay() )
                this.play();
            else if ( this.preload() )
                this.load();
        },

        _onLoad : function () {
            var self = this;

            // Player listeners
            this._flowplayer.onVolume( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onMute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onUnmute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onPlaylistReplace( function () {
                self.dispatch("playlistChange");
            });

            this._flowplayer.onClipAdd( function () {
                self.dispatch("playlistChange");
            });

            // Common Clip listeners
            var common = this._flowplayer.getCommonClip();

            common.onBeforeBegin( function (clip) {
                if( clip.url && clip.url.indexOf('ramp:') == 0) {
                    if( ! self.preload() && ! clip.autoBuffering ) {
                        // flowplayer.startBuffering() or flowplayer.play() called,
                        // we don't know which, so assume play()
                        self.autoplay(true);
                        self.preload(true);
                    }
                    self.service.load(clip.url);
                    return false;
                }
                else if( ! clip.url && this.src() ) {
                    return false;
                }
                self.dispatch('trackChange');
                self.dispatch('loadstart');
                return true;
            });


            common.onBegin( function (clip) {
                self._flowplayer.setVolume(100);
                self._flowplayer.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
            });

            common.onStart( function (clip) {
                self._setReady();
                self._setPlaying(true);

                self.dispatch('loadeddata');
                self.__duration = clip.duration;
                self.dispatch("durationchange");
                self.dispatch('loadedmetadata');
            });

            common.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
            });

            common.onFinish( function (clip) {
                self.__ended = true;
                self.__seeking = null;
                self._setPlaying(false);
                var pl = self._flowplayer.getPlaylist();

                if( ! self.advance() ) {
                    self._flowplayer.stop();
                }
                else if( clip.index + 1 == pl.length ) {
                    self.dispatch("playlistComplete");
                    if( self.loop() ) {
                        self._flowplayer.play(0);
                    }
                    else {
                        self._flowplayer.stop();
                    }
                }

                self.dispatch("ended");

                // force advance the player, since pause() or seek()
                // in the ended handlers can prevent default advance
                self._flowplayer.play(clip.index+1);
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
                if( self.paused() )  {
                    self.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            common.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused() )
                    self.dispatch("seeked");
            });

            this.controls( this.config.controls );

            if( this.src() ) {
                this.service.load( this.src() ); // loads related
            }
        },

        _setReady : function (){
            if( this.__readyState != 4 ) {
                this.__readyState = 4;
                this.dispatch("canplay");
            }
            else {
                this.dispatch("seeking");
                this.dispatch("seeked");
            }
        },

        _setPlaying : function ( bool ){
            this.__paused = ! bool;
            // the play and pause events fire before isPlaying() and isPaused() update
            this._statepoll.start();
        },

        /* Media Interface */

        load : function () {
            this.preload(true);
            if( this._flowplayer.isLoaded() ) {
                if( this.autoplay() ){
                    this._flowplayer.play();
                }
                else {
                    this._flowplayer.startBuffering();
                }
            }
            else {
            }
        },

        play : function () {
            this.autoplay(true);
            this.__paused = false; // helps onBeforeBegin() know to ignore clip.autoPlay == false
            this.load();
        },

        pause : function () {
            this._flowplayer.pause();
        },

        canPlayType : function (type) {
            return "probably";
        },

        paused : function (){
            return this.__paused;
        },

        duration : function () {
            return this.__duration;
        },

        seeking : function () {
            return (this.__seeking !== null );
        },

        ended : function () {
            return this.__ended;
        },

        currentTime : function (val){
            if( val !== undefined ){
                if( val < 0 )
                    val = 0
                if( val > this.duration )
                    val = this.duration;
                this.__seeking = val;
                this._flowplayer.seek(val);
            }

            if( this.__seeking !== null )
                return this.__seeking;

            // throttle the calls so we don't affect playback quality
            var now = (new Date()).getTime();
            var then = this.__currentTimeCache;
            var diff = now - then;

            if(then && diff< this.config.statusThrottleMSec )
                return this.__currentTime + (diff / 1000); // approx our position
            else
                this.__currentTimeCache = now;

            var status = this._flowplayer.getStatus(); // expensive

            this.__currentTime = status.time;
            return this.__currentTime;
        },

        muted : function (val){
            if( val !== undefined ){
                if( val )
                    this._flowplayer.mute();
                else
                    this._flowplayer.unmute();
            }
            var status = this._flowplayer.getStatus();
            return status.muted;
        },

        volume : function (val){
            if( val !== undefined )
                this._flowplayer.setVolume(val * 100);
            return this._flowplayer.getVolume() / 100;
        },

        controls : function (val) {
            if( ! this._flowplayer.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            if( val !== undefined ){
                if( val ) {
                    this._flowplayer.getControls().show();
                    this._flowplayer.getPlugin("play").show();
                }
                else {
                    this._flowplayer.getControls().hide();
                    this._flowplayer.getPlugin("play").hide();
                }
            }
            return this._flowplayer.getControls().opacity != 1;
        },

        preload : function (val) {
            if( val !== undefined )
                this.__preload = val;
            return this.__preload;
        },

        autoplay : function (val) {
            if( val !== undefined )
                this.__autoplay = val;
            return this.__autoplay;
        },

        loop : function (bool) {
            if( bool !== undefined ) {
                this.__loop = bool;
            }
            return this.__loop;
        },

        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
                if( this._flowplayer.isLoaded() ) {
                    this._flowplayer.setPlaylist([src]);
                }
            }
            return this.__src;
        },

        readyState : function (val) {
            if( val !== undefined )
                this.__readyState = val;
            return this.__readyState;
        },

        _children : function () {
            var sources = [];
            var src = document.createElement('source');
            src.setAttribute('type', "video/ramp");
            src.setAttribute('src', this.src);
            return [src];
        },

        /* Playlist Interface */

        index : function (i) {
            var clip =  this._flowplayer.getClip();
            if( ! clip )
                return 0;

            if( i == undefined )
                return clip.index; // Player.getIndex() is buggy

            var paused = this.paused();

            i = this._resolveIndex(i);
            this._flowplayer.play(i);

            if( paused )
                this._flowplayer.pause();

            return i;
        },

        _resolveIndex : function (i) {
            var pl = this._flowplayer.getPlaylist();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop() )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return;
            }
            return i;
        },

        advance : function (bool) {
            if( bool !== undefined ) {
                this.__advance = bool;
            }
            return this.__advance;
        },

        queue : function ( media ) {
            this._flowplayer.addClip( media );
        },

        clear: function (){
            this._flowplayer.play([]);
        },

        next : function () {
            this.index( this.index() + 1);
        },

        previous : function () {
            this.index( this.index() - 1);
        },

        nextTrack : function () {
            return this.track( this.nextTrackIndex() );
        },

        nextTrackIndex : function () {
            return this._resolveIndex(this.index() + 1);
        },

        track : function (i) {
            if( i == undefined )
                i = this.index();
            var pl = this._flowplayer.getPlaylist();
            return pl[ this._resolveIndex(i) ];
        },

        tracks : function () {
            return this._flowplayer.getPlaylist();
        },

        decorate : function (obj) {
            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted seeking seekable" +
                " paused played controls autoplay preload src ended index advance readyState" +
                " children service",
                this.video, this);

            Ramp.Utils.Proxy.proxyFunction("load play pause canPlayType " +
                "next previous track tracks queue clear " +
                "nextTrack nextTrackIndex onPlaylistChange onTrackChange",this, this.video);

            Ramp.Utils.Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange ended " +
                "trackChange playlistChange ",this, this.video);
        },

        /* Timer Handlers */

        _onPlayStatePoll : function () {
            if( this._flowplayer.isPlaying() === this.paused() )
                return;

            this._statepoll.reset();
            if( this.paused()  ) {
                this.dispatch("pause");
                this._timeupdater.reset();
            }
            else {
                this.autoplay(true);
                this.dispatch("playing");
                this.dispatch("play");
                this._timeupdater.start();
            }
        },

        _onTimeUpdate : function  () {
            this.dispatch("timeupdate");
        }

    };
})();