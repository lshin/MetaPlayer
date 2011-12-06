
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoplay : true,
        preload : true,
        autoAdvance : true,
        related: true,
        loop : true,
        controls : true
    };

    var Html5Loader = function (metaservice, el, options) {

        if( !(this instanceof Html5Loader ))
            return new Html5Loader(metaservice, el, options);

        this.config = $.extend({}, defaults, options);
        this.container = el;
        this.playlist = [];
        this.transcodes = [];

        Ramp.EventDispatcher(this);
        this.createMarkup();
        this.addMediaProxy();
        this.addMediaListeners();
        Ramp.Utils.Proxy.map("index", this, this._index);

        this.ramp = metaservice;
        this.ramp.service.metadata(this.onMetadata, this);
        this.ramp.service.transcodes(this.onTranscodes, this);
        this.ramp.service.related(this.onRelated, this);
    };

    Ramp.Loaders.HTML5 = Html5Loader;

    Ramp.prototype.html5 = function (el, options) {
        this.media = Html5Loader(this, el, options);
        return this.media;
    };

    Html5Loader.prototype = {

        load : function () {
            console.log(["load", this.transcodes.length])

            if( this.config.applySources )
                this._addSources();

            if( this.config.selectSource )
                this._selectSource();

            this.config.preload = true;
            this.media.load();
        },

        createMarkup : function () {
            var c = $(this.container);
            if( c.is('video') ) {
                this.media = this.container;
            }
            else {
                this.media = document.createElement('video');
                this.media.autoplay = this.config.autoplay;
                this.media.preload = this.config.preload;
                this.media.controls = this.config.controls;
                c.append(this.media);
            }
        },

        onMetadata : function (metadata) {
            if( this._hasPlaylist )
                return;
            this.playlist.push( metadata );
            this.__index = 0;
        },

        onRelated : function (related) {
            if( this._hasPlaylist || ! this.config.related )
                return;
            this.playlist = this.playlist.concat(related);
            this._hasPlaylist = true;
            this.dispatch("playlistChange", this.playlist);
        },

        onTranscodes : function (transcodes) {
            console.log(["have transcodes"])
            this.transcodes = transcodes;
            if( this.config.preload )
                this.load();
        },

        _addSources : function () {
            console.log(["_addSources", this.transcodes.length])
            var media = this.media;
            $(media).find('source').remove();
            $.each(this.transcodes, function (i, source) {
                var src = document.createElement('source');
                src.setAttribute('type', source.type);
                src.setAttribute('src', source.url);
                media.appendChild(src);
            });
        },

        _selectSource : function () {
            var media = this.media;
            $.each(this.transcodes, function (i, source) {
                if( media.canPlayType(source.type) ){
                    media.src = source.url;
                    return false;
                }
            });
            this.dispatch("trackChange");
        },

        addMediaListeners : function () {
            var self = this;
            $(this.media).bind('ended', function(){
                console.log("ENDED");
                self.onEnded()
            });

        },

        onEnded : function () {
            if(! this.config.autoAdvance )
                return;

            var i = this.nextTrackIndex();

            if(i == null ||  i == 0 ) {
                this.dispatch("playlistComplete");
            }

            this.nextTrack();
        },

        /* Playlist */

        _index : function ( i ) {
            if( i !== undefined ) {
                this.__index = i;
                this.ramp.service.load( this.playlist[i].rampId );
            }
            return this.__index;
        },

        nextTrackIndex : function () {
            var i = this.index;
            if( i + 1 < this.playlist.length )
                i++;
            else if(! this.config.loop )
                return;
            else
                i = 0;

            if( i == this.index )
                i = null;

            return i;
        },

        nextTrack  : function () {
            var i = this.nextTrackIndex();
            if( i !== null )
                this.index = i;
        },

        previousTrack : function () {
            var i = this.index;
            if( i - 1 >= 0 )
                i--;
            else if(! this.config.loop )
                return;
            else
                i = this.playlist.length - 1;
            this.index = i;
        },

        addMediaProxy : function () {
            // proxy entire MediaController interface
            // http://dev.w3.org/html5/spec/Overview.html#mediacontroller
            //     .. plus a few unofficial dom extras
            Ramp.Utils.Proxy.proxyProperty("duration currentTime volume muted buffered seekable" +
                " paused played seeking defaultPlaybackRate playbackRate" +
                " ended readyState parentNode offsetHeight offsetWidth style className id controls",
                this.media, this);

            Ramp.Utils.Proxy.proxyFunction("play pause" +
                " getBoundingClientRect getElementsByTagName",
                this.media, this);

            Ramp.Utils.Proxy.proxyEvent("loadstart progress suspend emptied stalled play pause " +
                "loadedmetadata loadeddata waiting playing canplay canplaythrough " +
                "seeking seeked timeupdate ended ratechange durationchange volumechange",
                this.media, this);
        }


    };

})();