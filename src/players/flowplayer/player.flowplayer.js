(function () {

    var $ = jQuery;
    var $f = window.flowplayer;

    var defaults = {
        autoplay : false,
        preload : true,
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

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.__seeking = null;
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = true;

        this._pageSetup(el);

        this.__preload = this.config.preload;
        this.__autoplay = this.config.autoplay;
        this.__src = null;

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        var self = this;
        this._flowplayer.onLoad( function () {
            self._onLoad();
        });

        this.video = this.getInterface();

        if( Ramp.playlist )
            Ramp.playlist(this.video, url);
        else
            this.src(url);

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
        },

        _onLoad : function () {
            // fires twice on ipad
            if( this._onLoadFired )
                return;
            this._onLoadFired = true;

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

            this.controls( this.config.controls );

            self.dispatch('loadstart');

            // apply src from before we were loaded, if any
            if( this.__src )
                this.src( this.__src );

            if( this.preload() || this.autoplay()  )
                this.load();
        },

        _addClipListeners : function (clip) {
            var self = this;

            clip.onBeforeBegin( function (clip) {
                return true;
            });

            clip.onBegin( function (clip) {
                self._flowplayer.setVolume(100);
                self._flowplayer.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
            });

            clip.onStart( function (clip) {
                self._setReady();
                self._setPlaying(true);

                // ipad controls can't be hidden until after playing
                if( self._iOS && ! self.__controls ) {
                    $(self._flowplayer.getParent() ).find('video').get(0).controls = false;
                }

                self.dispatch('loadeddata');
                self.__duration = clip.duration;
                self.dispatch("durationchange");
                self.dispatch('loadedmetadata');
            });

            clip.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
            });

            clip.onFinish( function (clip) {
                self.__ended = true;
                self.__seeking = null;
                self._setPlaying(false);
                self._flowplayer.stop();
                self.dispatch("ended");
            });

            clip.onPause( function (clip) {
                self._setPlaying(false);
                self._setReady();
            });

            clip.onResume( function (clip) {
                self._setPlaying(true);
                self.dispatch("play");
            });

            clip.onBeforeSeek( function (clip) {
                self.dispatch("seeking");
                self.dispatch("timeupdate");

                // fp doesn't do seeks while paused until it plays again, so we fake
                if( self.paused() )  {
                    self.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            clip.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused() )
                    self.dispatch("seeked");
            });
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
            if( this.src() && this._flowplayer.isLoaded()  ) {
                var c =  this._flowplayer.getClip(0);

                c.update({
                    autoPlay : this.autoplay(),
                    autoBuffer : true
                });

                // if ipad()
                if(  window.flashembed.__replaced && ! this.__loaded ) {
                    // ipad() play method respects autoPlay and autoBuffering
                    // but requires an argument to update video.src correctly
                    this._flowplayer.play(0);

                    // also has regexp bug which breaks every other play() (related: http://stackoverflow.com/a/2630538/369724)
                    if( this.autoplay() ) {
                        this._flowplayer.play(0);
                    }
                    this.__loaded = true;
                    return;
                }

                if( this.autoplay() ) {
                    this._flowplayer.play();
                }
                else {
                    this._flowplayer.startBuffering();
                }
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
            if( this._iOS && type.match( /m3u8$/ ) )
                return "probably";
            if( type.match( /mov|m4v|mp4|avi$/ ) )
                return "maybe";
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

            if( ! this._flowplayer.isLoaded() )
                return 0;

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
            if( val !== undefined ) {
                this._flowplayer.setVolume(val * 100);
            }
            return this._flowplayer.getVolume() / 100;
        },

        controls : function (val) {
            if( ! this._flowplayer.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            var controls = this._flowplayer.getControls();
            var playBtn =  this._flowplayer.getPlugin("play");
            // ipad() doesn't support disabling controls through the api
            var video = $(this._flowplayer.getParent() ).find('video').get(0);

            if( val !== undefined ){
                this.__controls = val;
                if( val ) {
                    controls && ( controls.show() );
                    playBtn && playBtn.show();
                    video && (video.controls = true);
                }
                else {
                    controls && ( controls.hide() );
                    playBtn && playBtn.hide();
                    video && (video.controls = false);
                }
            }
            return this.__controls
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
                this.__loaded  = false;
                var fp = this._flowplayer;
                if( fp.isLoaded() ) {
                    fp.setClip({
                        autoPlay : false,
                        autoBuffering : false,
                        url : this.__src
                    });
                    var c = fp.getClip(0);
                    this._addClipListeners(c);
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


        getInterface : function () {

            var target = Ramp.Utils.Proxy.getProxyObject( this._flowplayer.getParent() );

            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted seeking seekable" +
                " paused played controls autoplay preload src ended readyState" +
                " children",
                target, this);

            Ramp.Utils.Proxy.proxyFunction("load play pause canPlayType" ,this, target);

            Ramp.Utils.Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange ended ",this, target);

            return target;
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