
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
        this._addListeners();
        this._addMediaListeners();

        if( url )
            this.playlist.queue(url);

    };


    Ramp.html5 = function (el, url, options) {
        var player = Html5Player(el, url, options);
        player.video._player = player;
        return player.video;
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

            this.video.load();
        },

        decorate : function (el) {
            var  mapProperty =  Ramp.Utils.Proxy.mapProperty;
            var proxyFunction =  Ramp.Utils.Proxy.proxyFunction;
            mapProperty('index service', el, this);
            proxyFunction('next previous track tracks', this, el);
        },

        _createMarkup : function ( parent ) {
            var p = $(parent);
            if( p.is('video') ) {
                this.video = p.get(0);
                Ramp.UI.ensureOffsetParent( this.video, true);
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
                this.video = video;
                p.append(video);
                Ramp.UI.ensureOffsetParent( this.video);
            }
            this.video.style.position = "absolute";
            this.decorate(this.video);
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
            if( this.video.children.length )
                return this.video.children;

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
                return this.video.canPlayType(type);
        },

        _src : function (val) {
            if( val !== undefined ) {
                this.playlist.clear();
                this.playlist.queue(val);
            }
            return this.track().src;
        },

        _addSources : function () {
            var media = $(this.video);
            media.find('source').remove();
            $.each(this._transcodes, function (i, source) {
                var src = document.createElement('source');
                src.setAttribute('type', source.type);
                src.setAttribute('src', source.url);
                media.append(src);
            });
        },

        _selectSource : function () {
            var media = this.video;
            $.each(this._transcodes, function (i, source) {
                if( media.canPlayType(source.type) ){
                    media.src = source.url;
                    return false;
                }
            });
        },

        _addMediaListeners : function () {
            var self = this;
            $(this.video).bind('ended', function(){
                self._onEnded()
            });
            $(this.video).bind('playing', function(){
                self.autoplay = true;
            });
        },

        _onEnded : function () {
            if(! this.advance )
                return;
            this.autoplay = true;
            this.playlist.next();
        },


        decorate : function (obj) {
            Ramp.Utils.Proxy.mapProperty("index advance service",
                this.video, this);

            Ramp.Utils.Proxy.proxyFunction("next previous track tracks queue clear " +
                "nextTrack nextTrackIndex onPlaylistChange onTrackChange",this, this.video);

            Ramp.Utils.Proxy.proxyEvent("trackChange playlistChange ",this, this.video);
        }


    };

})();