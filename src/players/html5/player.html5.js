
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
        this.service = Ramp.data({});
        this.service.attach(this);
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

    Ramp.metaplayer = Ramp.html5;
    Ramp.Players.Html5Player = Html5Player;

    Html5Player.prototype = {

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
        }

    };

})();