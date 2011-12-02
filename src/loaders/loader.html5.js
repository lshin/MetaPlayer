
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoplay : true,
        preload : true,
        controls : true
    };

    var Video = function (metaservice, el, options) {
        if( !(this instanceof Video ))
            return new Video(metaservice, el, options);

        this.config = $.extend({}, defaults, options);
        this.container = el;

        Ramp.EventDispatcher(this);

        this.createMarkup();

        this.load(metaservice);
    };

    Video.prototype = {
        load: function  (metaservice){
            this.ramp = metaservice;
            this.ramp.transcodes(this._onTranscodes, null, this);
            this.ramp.mediaChange(this.onMediaChange, null, this);
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

        onMediaChange : function () {
            this.media.autoplay = true;
        },

        _onTranscodes : function (transcodes) {
            this.transcodes = transcodes;

            if( this.config.applySources )
                this._addSources();

            if( this.config.selectSource )
                this._selectSource();
        },

        _addSources : function () {
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
        }

    };


    Ramp.Video = Video;
    Ramp.prototype.video = function (el, options) {
        return Video(this, el, options);
    };

})();