
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoPlay : true,
        autoBuffer : true,
        autoAdvance : true,
        related: true,
        loop : false,
        controls : true
    };

    var Html5Player = function (el, url, options ){

        if( !(this instanceof Html5Player ))
            return new Html5Player(el, url, options);

        Ramp.Utils.EventDispatcher(this);

        this._config = $.extend({}, defaults, options);

        this._transcodes = [];


        this._data = Ramp.data();
        this._data.onMetaData(this._onMetaData, this);
        this._data.onTranscodes(this._onTranscodes, this);
        this._data.onRelated(this._onRelated, this);

        this._playlist = Ramp.playlist();
        this._playlist.onTrackChange(this._onTrackChange, this);
        this._playlist.add(url);
        this._haveRelated = false;
//        playlist.onPlaylistChange();

        this._createMarkup( el );
        this._addMediaProxy();
        this._addMediaListeners();
    };


    Ramp.html5 = function (el, options) {
        return Html5Player(el, options, this);
        // ... copy over intalled plugins
    };

    Ramp.metaplayer = Ramp.html5;
    Ramp.Players.Html5Player = Html5Player;

    Html5Player.prototype = {

        load : function () {
            if( this._config.applySources )
                this._addSources();

            if( this._config.selectSource )
                this._selectSource();

            this._config.preload = true; // can be called before transcodes available

            var media = $(this._video).get(0);
            media.load();
        },

        _onTrackChange : function () {
            console.log("track change");
            this._data.load( this._playlist.track().url  )
        },

        _createMarkup : function ( parent ) {
            debugger;
            var c = $('<div class="mp-player"></div>');
            c.css('position', 'relative');
            c.css('left', '0');
            c.css('top', '0');
            c.css('width', '100%');
            c.css('height', '100%');

            var p = $(parent);

            // if is video, wrap with div
            if( p.is('video') ) {
                this._video = parent;
                p.parent().append(c);
            }

            // else append the wrapper to the target, create video element
            else {
                p.append(c);
                var video = document.createElement('video');
                video.autoplay = this._config.autoplay;
                video.preload = this._config.preload;
                video.controls = this._config.controls;
                video.style.width = "100%";
                video.style.height = "100%";
                this._video = video;
            }

            // append video to wrapper
            c.append(this._video);
        },

        _onMetaData : function (metadata) {

        },

        _onRelated : function (related) {
            if( this._haveRelated || ! this._config.related )
                return;
            this._playlist = this._playlist.add( related );
            this._haveRelated = true;
            console.log("related");
        },

        _onTranscodes : function (transcodes) {
            this._transcodes = transcodes;
            if( this._config.preload )
                this.load();
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
            this.dispatch("trackChange");
        },

        _addMediaListeners : function () {
            var self = this;
            $(this._video).bind('ended', function(){
                self.onEnded()
            });

        },

        _onEnded : function () {
            if(! this._config.autoAdvance )
                return;
            console.log("auto advance!")
            this.next();
        },


    };

})();