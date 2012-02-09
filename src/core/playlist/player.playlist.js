
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoAdvance : true,
        linkAdvance : false,
        autoPlay : true,
        autoBuffer : true,
        related: true,
        loop : false
    };

    var Playlist = function (video, options ){

        if( !(this instanceof Playlist ))
            return new Playlist(video, options);

        this.config = $.extend({}, defaults, options);
        this.video = video;
        this._haveRelated = false;
        this._tracks = [];
        this._index = 0;
        this.loop = this.config.loop;
        this.autoplay = this.config.autoPlay;
        this.preload = this.config.autoBuffer;
        this.advance = this.config.autoAdvance;
        this.linkAdvance = this.config.linkAdvance;

        this.dispatcher = MetaPlayer.dispatcher(video);

        this._addDataListeners(this.video);
        this._addMediaListeners(this.video);
    };

    MetaPlayer.playlist = function (video, options) {
        return Playlist( $(video).get(0), options);
    };

    MetaPlayer.addPlugin('playlist', function (options) {
        return MetaPlayer.playlist(this.video, options);
    });

    Playlist.prototype = {

        index : function ( i ) {
            i = this._resolveIndex(i);
            if( i != null ) {
                this._index = i;
                this.load( this.track() );
            }
            return this._index;
        },

        queue : function ( tracks ) {
            if( ! (tracks instanceof Array) )
                tracks = [tracks];

            var wasEmpty = (this._tracks.length == 0);

            var self = this;
            $(tracks).each( function (i, track) {
                self._addTrack(track, true)
            });
            this.dispatcher.dispatch("playlistchange");

            if( wasEmpty )
                this.load( this.track() )
        },

        load : function (track) {
            this.video.pause();

            // let services cancel loading if they need to do something
            var ok = this.dispatcher.dispatch("trackchange", track);
            if( ok ) {
                this._setSrc( track );
            }
        },

        empty : function ( tracks ) {
            this._tracks = [];
            this._index = 0;
            this.dispatcher.dispatch("playlistchange");
            this.dispatcher.dispatch("trackchange");
        },

        next  : function () {

            var i = this._index + 1;
            var t = this.track(i);

            if( this.linkAdvance ) {
                var link = t.link || t.linkURL;
                if( link ) {
                    window.top.location = link;
                    return;
                }
            }

            this.index(i )
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

        _addTrack : function ( track, silent ) {
            this._tracks.push(track);
            if( ! silent )
                this.dispatcher.dispatch("playlistchange");
        },

        _resolveIndex : function (i) {
            if( i == null)
                return null;
            var pl = this.tracks();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return null;
            }
            return i;
        },

        _addDataListeners : function (dispatcher) {
            dispatcher.listen("metadata", this._onMetaData, this);
            dispatcher.listen("transcodes", this._onTranscodes, this);
            dispatcher.listen("related", this._onRelated, this);
        },

        _addMediaListeners : function () {
            var self = this;
            $(this.video).bind('ended error', function(e) {
                self._onEnded()
            });
        },

        _onMetaData: function (e, metadata) {
            var idx = this.index();
            // replace a plain url with updated metadata
            if ( typeof this._tracks[idx] == "string" ) {
                this._tracks[idx] = metadata;
            }
        },

        _onRelated : function (e, related) {
            if( this._haveRelated || ! this.config.related )
                return;
            this.queue( related );
            this._haveRelated = true;
        },

        _onTranscodes : function (e, transcodes) {
            var self = this;
            var video = this.video;
            this.transcodes = transcodes;
            var probably = [];
            var maybe = [];
            var sources = [];

            $.each(transcodes, function (i, source) {
                video.appendChild( self._createSource(source.url, source.type) );

                var canPlay = video.canPlayType(source.type);
                if( ! canPlay )
                    return;

                if( canPlay == "probably" )
                    probably.push(source.url);
                else
                    maybe.push(source.url);

            });

            var src = probably.shift() || maybe .shift();
            if( src)
                this._setSrc(src);
        },

        _setSrc : function ( src ) {
            this.video.src = src;
            if( this.video.autoplay || this.index() > 0 ) {
                this.video.play();
            }
            else if( this.video.preload ) {
                this.video.load()
            }
        },

        _createSource : function (url, type) {
            var src = $('<source>')
                .attr('type', type || '')
                .attr('src', url) ;
            return src[0];
        },

        _onEnded : function () {
            if(! this.advance )
                return;

            if( this.index() == this.tracks().length - 1 ) {
                this.dispatcher.dispatch('playlistComplete');
            }

            this.next();
        }

    };

})();