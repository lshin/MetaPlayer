
(function () {

    var $ = jQuery;

    var defaults = {
        autoLoad : true,
        related: true,
        loop : false,
        dispatcher : null
    };

    var Playlist = function (urls, options) {
        if( ! (this instanceof Playlist) )
            return new Playlist(urls, options);

        if( urls instanceof Object && ! (urls instanceof Array )){
            options = urls;
            urls = null;
        }

        this.config = $.extend({}, defaults, options);

        this._tracks = [];
        this.__index = 0;
        this.__loop = this.config.loop;

        this.autoLoad = this.config.autoLoad;

        Ramp.Utils.Proxy.mapProperty("index loop", this);

        this.dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this.onPlaylistChange = this.dispatcher.observer("playlistChange");
        this.onTrackChange = this.dispatcher.observer("trackChange");
        this.dispatcher.attach(this);

        if( urls )
            this.add(urls);
    };


    Playlist.prototype = {
        _interface : "empty queue next previous track tracks nextTrack nextTrackIndex onPlaylistChange onTrackChange",

        attach : function (target) {
            var self = this;
            var methods = this._interface.split(/\s+/g);

            $.each(methods, function (i, key) {
                var val = self[key];
                if( key[0] == "_" || ! (val instanceof Function))
                    return;
                target[key] = function () {
                    return self[key].apply(self, arguments);
                }
            });

            Ramp.Utils.Proxy.mapProperty("index loop", target, this);
        },

        empty : function ( tracks ) {
            this._tracks = [];
            this.index = 0;
            this.dispatcher.dispatch("playlistChange");
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

            if( wasEmpty )
                this.dispatcher.dispatch("trackChange");
        },

        _addTrack : function ( track, trackChange ) {
            if(typeof track == "string" )
                track = { url : track };
            this._tracks.push(track);
        },

        _index : function ( i ) {
            if( i != undefined ) {
                i = i % this._tracks.length;
                var old = i;
                this.__index = i;
                this.dispatcher.dispatch("trackChange");
            }
            return this.__index;
        },

        _loop : function ( val ) {
            if( val !== undefined )
                this.__loop = val;
            return this.__loop;
        },

        track : function (i){
            if( i === undefined )
                i = this.index;
            return this._tracks[i];
        },

        tracks : function () {
            return this._tracks;
        },

        nextTrack : function () {
            return this.track( this.nextTrackIndex() );
        },

        nextTrackIndex : function () {
            var i = this.index;
            if( i + 1 < this._tracks.length )
                i++;
            else if(! this.__loop )
                return null;
            else
                i = 0;
            return i;
        },

        next  : function () {
            var i = this.nextTrackIndex();
            if( i !== null )
                this.index = i;
        },

        previous : function () {
            var i = this.index;
            if( i - 1 >= 0 )
                i--;
            else if(! this.__loop )
                return;
            else
                i = this._tracks.length - 1;
            this.index = i;
        }
    };

})();
