
(function () {

    // save reference for no conflict support
    var $ = jQuery;

    var defaults = {
        autoplay : false,
        preload : true,
        controls : true,
        chromeless : false,
        loop : false,
        hd : true,
        annotations: false,
        modestbranding : true,
        related : false,
        showinfo : false,
        captions : false,
        apiUrl  : "http://www.youtube.com/apiplayer", // chromeless
        videoUrl : "http://www.youtube.com/v/Y7dpJ0oseIA", // controls, need some id
        updateMsec : 500
    };

    // play nice in the global context by preserving other listeners, hope they do the same for us
    var oldReady = window.onYouTubePlayerReady;

    window.onYouTubePlayerReady = function (id){
        if( oldReady ){
            oldReady.apply(this, arguments);
        }
        var instance = MetaPlayer.youtube.instances[id];
        if( instance )
            instance.onReady();
    };


    var YouTubePlayer = function (target, options) {
        var config = $.extend(true, {}, defaults, options);

        this.video = $(target).get(0);

        this.apiUrl = config.apiUrl;
        this.videoUrl = config.videoUrl;

        this.__seeking = false;
        this.__readyState = 0;
        this.__ended = false;
        this.__muted = false;
        this.__paused = true;
        this.__duration = NaN;
        this.__currentTime = 0;
        this.__volume = 1;
        this.__loop = config.loop;
        this.__src = "";

        this.preload = config.preload;
        this.controls = config.controls;
        this.autoplay = config.autoplay;
        this.updateMsec = config.updateMsec;

        this.apiId = "YT" + YouTubePlayer.embedCount++ + "T" + (new Date()).getTime() ;
        this.hd = config.hd;
        this.annotations = config.annotations;
        this.modestbranding = config.modestbranding;
        this.showinfo = config.showinfo;
        this.related = config.related;
        this.captions = config.captions;
        this.chromeless = config.chromeless;

        MetaPlayer.proxy.proxyPlayer(this, this.video );
        this.doEmbed(  this.video );
        this.dispatcher = MetaPlayer.dispatcher( this.video );
        MetaPlayer.youtube.instances[ this.apiId ] = this;

        this.video.player = this;
    };


    if( window.MetaPlayer ) {
        MetaPlayer.addPlayer("youtube", function ( options ) {
            var el = $("<div></div>").appendTo(this.video);
            return new YouTubePlayer(el, options).video;
        });
    }
    else {
        // allow stand-alone use
        window.MetaPlayer = {};
    }

    MetaPlayer.youtube = function (target, options) {
        return new YouTubePlayer(target, options).video;
    };

    MetaPlayer.youtube.instances = {};

    YouTubePlayer.embedCount = 0;

    YouTubePlayer.prototype = {
        doEmbed : function (target) {
            var url = this.getEmbedUrl();

            var video = $(target);

            video.empty();

            var replace = $("<div></div>")
                .attr("id", this.apiId)
                .appendTo(this.video);

            var params = {
                wmode : "transparent",
                allowScriptAccess: "always"

            };
            var atts = {
                id:  this.apiId
            };
            swfobject.embedSWF(url,
                 this.apiId, "100%", "100%", "8", null, null, params, atts);
        },

        getEmbedUrl : function () {
            var url =  this.chromeless ?
                this.apiUrl :
                this.videoUrl;

            var params = {
                enablejsapi : 1,
                version : 3,
                playerapiid : this.apiId,
                autohide : 0,
                autoplay : this.autoplay ? 1 : 0,
                controls : this.controls ? 1 : 0,
                fs : 1,
                hd : this.hd ? 1 : 0,
                rel : this.related ? 1 : 0,
                showinfo : this.showinfo? 1 : 0,
                iv_load_policy : this.annotations ? 1 : 0,
                cc_load_policy : this.captions ? 1 : 1
            };

            return url + "?" + $.param(params,true);
        },

        getCallbackString : function ( fnName ) {
            var str = "MetaPlayer.youtube.instances['" + this.apiId +"']";
            if( fnName != null )
                str = str.concat( "."+fnName );
            return str;
        },

        onReady : function () {
            var video = $(this.video);

            this.youtube = document.getElementById( this.apiId );

            if(! this.youtube.playVideo ) {
                this.error = "unabled to find youtube player";
                return;
            }

            // flash implemented, works in IE?
            // player.addEventListener(event:String, listener:String):Void
            this.youtube.addEventListener("onStateChange", this.getCallbackString("onStateChange") );
            this.startVideo();
        },


        onStateChange : function (state) {
            // http://code.google.com/apis/youtube/js_api_reference.html#Events
            switch(state) {
                case -1: // unstarted
                    break;
                case 0: //ended
                    this.__ended = true;
                    this.video.dispatch("ended");
                    break;
                case 1: // playing
                    this.__paused = false;
                    this.video.dispatch("playing");
                    this.video.dispatch("play");
                    break;
                case 2: // paused
                    this.__paused = true;
                    this.video.dispatch("pause");
                    break;
                case 3: // buffering
                    this.startDurationCheck();
                    this.startTimeCheck(); // check while paused to handle event-less seeks
                    break;
                case 5: // queued
                    this.video.dispatch("canplay");
                    this.video.dispatch("loadeddata");
                    break;
            }
        },

        startTimeCheck : function () {
            var self = this;
            if( this._timeCheckInterval ) {
                return;
            }

            this._timeCheckInterval = setInterval(function () {
                self.onTimeUpdate();
            }, this.updateMsec);

            // set an initial value, too
            this.updateTime();
        },

        stopTimeCheck : function () {
            clearInterval(this._timeCheckInterval);
            this._timeCheckInterval = null;
        },

        onTimeUpdate: function () {
            this.updateTime();
            this.video.dispatch("timeupdate");
        },

        updateTime : function () {
            this.__currentTime = this.youtube.getCurrentTime();
            console.log("TIME: " + this.__currentTime);
        },

        startDurationCheck : function () {
            var self = this;
            if( this.__duration )
                return;

            if( this._durationCheckInterval ) {
                return;
            }
            this._durationCheckInterval = setInterval(function () {
                self.onDurationCheck();
            }, this.updateMsec);
        },

        onDurationCheck : function () {
            var duration = this.youtube.getDuration();
            if( duration > 0 ) {
                this.__duration = duration;
                this.video.dispatch("loadedmetadata");
                this.video.dispatch("durationchange");
                clearInterval( this._durationCheckInterval );
                this._durationCheckInterval = null;
            }
        },

        startVideo : function () {
            // not loaded yet
            if( ! this.youtube )
                return;

            this.__ended = false;

            if( this.__muted ) {
                this.youtube.mute();
            }
            // volume works, this is too early to set mute
            this.youtube.setVolume(this.__volume);

            var src = this.src();
            if( ! src ) {
                return;
            }

            if( this.__readyState < 4 ){
                this.video.dispatch("loadstart");
                this.__readyState = 4;
            }

            if( src.match(/^http:/) )
                this.youtube.cueVideoByUrl( src );
            else
                this.youtube.cueVideoById( src );

            if( this.autoplay )
                this.play();
            else if( this.preload )
                this.load();

        },

        doSeek : function (time) {
            this.__seeking = true;
            this.video.dispatch("seeking");
            this.youtube.seekTo( time );
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

        /* Media Interface */

        load : function () {
            this.preload = true;

            if( ! this.youtube )
                return;

            if( this.youtube.getPlayerState() != -1 )
                return;

            var src = this.src();
            // kickstart the buffering so we get the duration
            this.youtube.playVideo();
            this.youtube.pauseVideo();
        },

        play : function () {
            this.autoplay = true;
            if( ! this.youtube )
                return;

            this.youtube.playVideo()
        },

        pause : function () {
            if(! this.youtube  )
                return false;
            this.youtube.pauseVideo()
        },

        canPlayType : function (type) {
            return Boolean  ( type.match( /\/youtube$/ ) );
        },

        paused : function (){
            return this.__paused;
        },

        duration : function () {
            return this.__duration;
        },

        seeking : function () {
            return this.__seeking;
        },

        ended : function () {
            if(! this.youtube  )
                return false;
            return (this.youtube.getPlayerState() == 0);
        },

        currentTime : function (val){
            if(! this.youtube  )
                return 0;
            if( val != undefined ) {
                this.__ended = false;
                this.doSeek(val);
            }
            return this.__currentTime;
        },

        muted : function (val){
            if( val != null ){
                this.__muted = val
                if( ! this.youtube )
                    return val;
                if( val  )
                    this.youtube.mute();
                else
                    this.youtube.unMute();
                this.video.dispatch("volumechange");
                return val;
            }

            return this.__muted;
        },

        volume : function (val){
            if( val != null ){
                this.__volume = val;
                if( ! this.youtube )
                    return val;
                this.youtube.setVolume(val * 100)
                this.video.dispatch("volumechange");
            }
            return this.__volume;
        },

        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
                this.startVideo();
            }
            return this.__src
        },

        readyState : function () {
            return this.__readyState;
        }
    }

})();