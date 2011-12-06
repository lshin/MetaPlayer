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


        this.readyState = 0;


        Ramp.EventDispatcher(this);

        this.playerSetup();
        this.addContainerProxy();
        this.addMediaProxy();
        this.addPlayerListeners();

    }

    Ramp.Players.FlowplayerLoader = FlowplayerLoader;

    FlowplayerLoader.prototype = {

        load : function () {
            this.config.preload = true;
            this.dispatchEvent('loadstart');
            this.media.load();

        },

        playerSetup : function () {
            // .. instantiate player if doesn't exist
            if( this.container.getParent ) {
                this.media = this.container;
                this.container = this.media.getParent();
            }
        },

        addPlayerListeners : function () {
            var self = this;
            this.media.onBeforeLoad( function () {
                return self.config.preload;

            });

            this.media.onLoad( function () {
                self.readyState = 4;
            });

            this.addCommonListeners();
        },

        addCommonListeners : function () {
            var common = this.media.getCommonClip();
            var self = this;

            common.onBegin( function (clip) {
                self.media.setVolume(100);
                self.dispatch('loadstart');
            });

            common.onStart( function (clip) {
                self.dispatch("playing");
                self.dispatch('loadeddata');
                self.dispatch('loadedmetadata');
                self.dispatch("durationchange");
            });

            common.onStop( function (clip) {
                self.dispatch("paused");
            });

            common.onFinish( function (clip) {
                self.dispatch("paused");
                self.dispatch("ended");
            });

            common.onPause( function (clip) {
                self.dispatch("pause");
            });
            common.onResume( function (clip) {
                self.dispatch("playing");
                self.dispatch("play");
            });

            common.onBeforeSeek( function (clip) {
                self.dispatch("seeking");
            });

            common.onSeek( function (clip) {
                self.dispatch("seeked");
            });

            common.onBufferFull( function (clip) {
                self.dispatch("canplay");
            });

            common.onBufferFull( function (clip) {
                self.dispatch("canplay");
            });

        },

        addContainerProxy : function () {
            Ramp.Utils.Proxy.proxyProperty("parentNode offsetHeight offsetWidth style className id",
                this.container, this);

            Ramp.Utils.Proxy.proxyFunction("getBoundingClientRect getElementsByTagName",
                this.container, this);
        },

        addMediaProxy : function () {

            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted buffered seekable" +
                " paused played seeking defaultPlaybackRate playbackRate controls",
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

        _currentTime : function (){
            var status = this.media.getStatus();
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

        _paused : function (){
            return this.media.isPaused();
        },

        _playing : function (){
            return this.media.isPlaying();
        }

        // seeking defaultPlaybackRate playbackRate controls

        /* Methods */


    };

    $f.addPlugin("ramp", function (el, options, ramp) {

        // ... set up ramp instance


        // ... set up flowplayer mediacontroller

        return this;
    });
})();