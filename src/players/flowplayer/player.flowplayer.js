(function () {

    var $ = jQuery;


    var defaults = {
    };

    function Plugin (player, options, callbacks) {

        var services = this.service = new Ramp(options, callbacks);
        var self = this;


        this.config = $.extend({}, defaults, options);
        this.playing = false;
        this.seeking = false;

        player.onBeforeLoad (function () {
        });

        player.onLoad (function () {
        });

        player.onBeforeBegin(function (e) {
            return self.onBeforeBegin(e);
        });

        player.onBegin (function () {
            self.dispatch("load", self._clipData);
        });

        player.onStart (function () {
            self.playing = true;
            self.dispatch("playback");
        });

        player.onFinish (function () {
            self.playing = false;
            self.dispatch("playback");
        });

        player.onResume (function () {
            self.playing = true;
            self.dispatch("playback");
        });

        player.onPause (function () {
            self.playing = false;
            self.dispatch("playback");
        });

        player.getCommonClip().onSeek (function () {
            self.seeking = false;
            self._seekTarget = null;
            self.dispatch("seek");
        });

        player.getCommonClip().onBufferEmpty(function () {
            self.playing = false;
            self.dispatch("playback");
        });


        if( options.playlist ) {
            // replace/append playlist
        }

        Ramp.Player(this);

        this.player = player;
        this.services = services;

    }

    Plugin.prototype = {

        container : function () {
            return this.player.getParent();
        },

        seek : function (time) {
            this._seekTarget = time;
            this.seeking = true;
            this.player.seek(this.seeking);
            this.player.seek(time);
            this.dispatch("seeking", {time : time});
        },

        toggle : function ( bool ) {
            if( bool == null )
                this.player.toggle();
            else if( bool )
                this.player.resume();
            else
                this.player.pause();
        },

        status : function () {
            var status = this.player.getStatus();
            return {
                target : this._seekTarget,
                time : status.time,
                buffer : {
                    start : status.bufferStart,
                    end : status.bufferEnd
                }
            };
        },

        duration : function () {
            if(! this._duration ) {
                var clip = this.player.getClip();
                this._duration = clip.duration
            }
            return this._duration
        },

        onBeforeBegin : function (e) {
            var clip = player.getClip();

            if(! clip.rampId  )
                return;

            if(clip.ramp === null ) // already loading
                return;

            if( clip.ramp && clip.ramp.transcodes.length > 0 ) // already fully loaded
                return;

            clip.ramp = null;

            var host = clip.rampHost || this.config.rampHost;

            this.services.getMedia(host, clip.rampId, this.onMediaLoaded, clip, this);
            this._duration = null; // clear memoization

            return false;
        },

        onMediaLoaded : function (data, clip) {
            clip.update({
                originalUrl : clip.url,
                url : data[0].video.src,
                iosUrl : data[0].video.metadata.iosURL,
                ramp : data
            });

            this._clipData = data[0];

            if( clip.autoPlay )
                this.player.play();

            else if( clip.autoBuffering )
                this.player.startBuffering();
        }
    };

    Ramp.Plugin = Plugin;

    $f.addPlugin("ramp", function (options, callbacks) {
        this.ramp = new Plugin(this, options, callbacks);
        return this;
    });
})();