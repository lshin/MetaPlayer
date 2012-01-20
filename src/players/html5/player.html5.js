
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

        this._createMarkup( el);

        // set up playlist, have it use our event dispatcher
        this.service = this.config.service || Ramp.data({});
        this.video.service = this.service;

        if( Ramp.playlist )
            Ramp.playlist(this.video, url);
        else
            this.video.src = url;
    };


    Ramp.html5 = function (el, url, options) {
        var player = Html5Player(el, url, options);
        player.video._player = player;
        return player.video;
    };

    Ramp.prototype.html5 = function (url, options) {
        this.video = Html5Player(this.target, url, options).video;
        return this;
    };

    Html5Player.prototype = {
        _createMarkup : function ( parent ) {
            var p = $(parent);
            var v = p.find('video');
            var container = p.find('.metaplayer-video') || p;

            if( p.is('video') ) {
                this.video = p.get(0);
            }
            else if( v.length ){
                this.video = v.get(0)
            }
            else {
                var video = document.createElement('video');
                video.autoplay = this.config.autoplay;
                video.preload = this.config.preload;
                video.controls = this.config.controls;
                video.muted = this.config.muted;
                this.video = video;
                container.append(video);
            }
        }

    };

})();