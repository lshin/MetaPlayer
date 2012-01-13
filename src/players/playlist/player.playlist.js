
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoAdvance : true,
        autoPlay : true,
        autoBuffer : true,
        related: true,
        loop : false
    };

    var Playlist = function (video, url, options ){

        if( !(this instanceof Playlist ))
            return new Playlist(video, url, options);

        if( options == undefined && (url instanceof Object) ){
            options = url;
            url = null;
        }

        this.config = $.extend({}, defaults, options);

        if( video.service )
            this.config.service = video.service;

        this.video = $(video).get(0);

        this.dispatcher = video.dispatcher || this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this.dispatcher.attach(this);

        this._haveRelated = false;
        this._tracks = [];
        this._index = 0;
        this.loop = this.config.loop;
        this.autoplay = this.config.autoPlay;
        this.preload = this.config.autoBuffer;
        this.advance = this.config.autoAdvance;

        if( this.config.service ) {
            console.log("recycle service")
            this.service = this.config.service;
        }
        else {
            console.log("new service")
            this.service = Ramp.data({
                dispatcher : this._dispatcher
            });
        }
        this.video.service = this.service;

        this.onPlaylistChange = this.dispatcher.observer("playlistChange");
        this.onTrackChange = this.dispatcher.observer("trackChange");

        this._addServiceListeners();
        this._addMediaListeners();

        if( url ){
            this.queue(url)
        }
        this.video.playlist = this;
    };


    Ramp.playlist = Playlist;

    Playlist.prototype = {

        index : function ( i ) {
            if( i != undefined ) {
                this._index = this._resolveIndex(i);
                this.dispatcher.dispatch("trackChange");
                this.service.load( this.track() );
            }
            return this._index;
        },

        queue : function ( tracks ) {
            if( ! (tracks instanceof Array) )
                tracks = [tracks];

            var wasEmpty = this._tracks.length == 0;

            var self = this;
            $(tracks).each( function (i, track) {
                self._addTrack(track, true)
            });
            this.dispatcher.dispatch("playlistChange");

            if( wasEmpty ) {
                this.service.load( this.track() );
            }
        },

        empty : function ( tracks ) {
            this._tracks = [];
            this._index = 0;
            this.dispatcher.dispatch("playlistChange");
            this.dispatcher.dispatch("trackChange");
        },

        next  : function () {
            this.index( this._index + 1 )
        },

        previous : function () {
            this.index( this._index - 1 )
        },

        track : function (i){
            if( i === undefined )
                i = this.index();
            return this._tracks[ this._resolveIndex(i) ];
        },

        nextTrack : function () {
            return this.track( this._index + 1);
        },

        tracks : function () {
            return this._tracks;
        },

        _addTrack : function ( track ) {
            if( typeof track == "string" )
                track = { url : track };
            this._tracks.push(track);
        },

        _resolveIndex : function (i) {
            var pl = this.tracks();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return;
            }
            return i;
        },

        _addServiceListeners : function () {
            this.service.onMetaData(this._onMetaData, this);
            this.service.onTranscodes(this._onTranscodes, this);
            this.service.onRelated(this._onRelated, this);
        },

        _addMediaListeners : function () {
            var self = this;
            $(this.video).bind('ended', function(){
                self._onEnded()
            });
        },

        _onMetaData: function (metadata) {
            $.extend( this.track(), metadata );
            this._metadata = metadata
        },

        _onRelated : function (related) {
            if( this._haveRelated || ! this.config.related )
                return;
            this.queue( related );
            this._haveRelated = true;
        },

        _onTranscodes : function (transcodes) {
            var video = this.video;

            var probably = [];
            var maybe = [];

            $.each(transcodes, function (i, source) {
                var canPlay = video.canPlayType(source.type);
                if( ! canPlay )
                    return;

                if( canPlay == "probably" )
                    probably.push(source.url);
                else
                    maybe.push(source.url);

            });

            var src = probably.shift() || maybe .shift();
            if( src )
                video.src = src;
            video.autoplay = true;

            if( video.autoplay ) {
                video.play();

            }
            else if( video.preload ) {
                video.load()
            }
        },

        _onEnded : function () {
            if(! this.advance )
                return;

            if( this.index() == this.tracks().length - 1 ) {
                this.dispatcher.dispatch('playlistComplete');
            }

            this.next();
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