
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        preload : true,
        muted : false,
        autoplay : false,
        autoAdvance : true,
        related: true,
        loop : false,
        controls : true
    };

    var Html5Player = function (el, url, options ){

        if( !(this instanceof Html5Player ))
            return new Html5Player(el, url, options);

        this.config = $.extend({}, defaults, options);

        this._dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this._dispatcher.attach(this);

        this._transcodes = [];
        this._haveRelated = false;

        this.advance = this.config.autoAdvance;


        // set up playlist, have it use our event dispatcher
        this.service = Ramp.data({
            dispatcher : this._dispatcher
        });
        this.service.attach(this);

        // set up playlist, have it use our event dispatcher
        this.playlist = Ramp.playlist({
            dispatcher : this._dispatcher,
            loop : this.config.loop
        });
        this.playlist.attach(this);

        this._createMarkup( el);
        this._addMediaProxy();
        this._addListeners();
        this._addMediaListeners();

        if( url )
            this.queue(url);
    };


    Ramp.html5 = function (el, url, options) {
        return Html5Player(el, url, options);
    };

    Ramp.metaplayer = Ramp.html5;
    Ramp.Players.Html5Player = Html5Player;

    Html5Player.prototype = {

        load : function () {
            if( this.config.applySources )
                this._addSources();

            if( this.config.selectSource )
                this._selectSource();

            this.config.preload = true; // can be called before transcodes available

            var media = $(this._video).get(0);
            media.load();
        },


        _createMarkup : function ( parent ) {
            var p = $(parent);
            if( p.is('video') ) {
                this._video = parent;
            }
            else {
                var video = document.createElement('video');
                video.autoplay = this.config.autoplay;
                video.preload = this.config.preload;
                video.controls = this.config.controls;
                video.muted = this.config.muted;
                video.style.position = "absolute";
                video.style.top = 0;
                video.style.left = 0;
                video.style.width = "100%";
                video.style.height = "100%";
                this._video = video;
                p.append(video);
            }

            Ramp.UI.ensureOffsetParent(this._video);
        },

        _addListeners : function () {
            this.onTrackChange(this._onTrackChange, this);
            this.onMetaData(this._onMetaData, this);
            this.onTranscodes(this._onTranscodes, this);
            this.onRelated(this._onRelated, this);
        },

        _onTrackChange : function () {
            this.service.load( this.playlist.track()  )
        },

        _onMetaData : function (metadata) {
            $.extend( this.track(), metadata );
        },

        _onRelated : function (related) {
            if( this._haveRelated || ! this.config.related )
                return;
            this.playlist.queue( related );
            this._haveRelated = true;
        },

        _onTranscodes : function (transcodes) {
            this._transcodes = transcodes;
            if( this.config.preload )
                this.load();
        },

        _children : function () {
            if( this._video.children.length )
                return this._video.children;

            var t = this.track();
            var src = document.createElement('source');
            src.setAttribute('type', "video/ramp");
            src.setAttribute('src', t.url);
            return [src];
        },

        canPlayType : function (type) {
            if( type == "video/ramp" )
                return "probably";
            else
                return this._video.canPlayType(type);
        },

        _src : function (val) {
            if( val !== undefined ) {
                this.playlist.clear();
                this.playlist.queue(val);
            }
            return this.track().src;
        },

        _addSources : function () {
            var media = $(this._video);
            media.find('source').remove();
            $.each(this._transcodes, function (i, source) {
                var src = document.createElement('source');
                src.setAttribute('type', source.type);
                src.setAttribute('src', source.url);
                media.append(src);
            });
        },

        _selectSource : function () {
            var media = $(this._video).get(0);
            $.each(this._transcodes, function (i, source) {
                if( media.canPlayType(source.type) ){
                    media.src = source.url;
                    return false;
                }
            });
        },

        _addMediaListeners : function () {
            var self = this;
            $(this._video).bind('ended', function(){
                self._onEnded()
            });
            $(this._video).bind('playing', function(){
                self.autoplay = true;
            });
        },

        _onEnded : function () {
            if(! this.advance )
                return;
            this.autoplay = true;
            this.playlist.next();
        },

        _addMediaProxy : function () {
            var media = $(this._video).get(0);
            // proxy entire MediaController interface
            // http://dev.w3.org/html5/spec/Overview.html#mediacontroller
            //     .. plus a few unofficial dom extras

            Ramp.Utils.Proxy.mapProperty("children src", this);

            Ramp.Utils.Proxy.proxyProperty("duration currentTime volume muted buffered seekable" +
                " paused played seeking defaultPlaybackRate playbackRate autoplay preload " +
                " ended readyState parentNode offsetHeight offsetWidth offsetParent style className id controls",
                media, this);

            Ramp.Utils.Proxy.proxyFunction("play pause" +
                " getBoundingClientRect getElementsByTagName",
                media, this);

            Ramp.Utils.Proxy.proxyEvent("loadstart progress suspend emptied stalled play pause " +
                "loadedmetadata loadeddata waiting playing canplay canplaythrough " +
                "seeking seeked timeupdate ended ratechange durationchange volumechange",
                media, this);
        }


    };

})();