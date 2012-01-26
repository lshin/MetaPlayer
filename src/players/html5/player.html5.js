
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
        volume: 1,
        controls : true
    };

    var Html5Player = function (el, options ){
        if( !(this instanceof Html5Player ))
            return new Html5Player(el, options);

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.config = $.extend({}, defaults, options);
        this._createMarkup(el);
    };

    MetaPlayer.html5 = function (video, options) {
        return Html5Player(video, options).video;
    };

    MetaPlayer.addPlayer("html5", function (options) {
       return MetaPlayer.html5(this.video, options);
    });

    Html5Player.prototype = {
        _createMarkup : function ( parent ) {
            var p = $(parent);
            var v = p.find('video');

            if( p.is('video') || parent.currentTime != null ) {
                v = p;
            }

            if( v.length > 0 ) {
                if( this._iOS ){
                    // ipad video breaks upon reparenting, so needs resetting
                    // jquery listeners will be preserved, but not video.addEventListener
                    this.video = v.clone(true, true).appendTo( v.parent() ).get(0);
                    v.remove();
                } else {
                    this.video = v.get(0);
                }
            }
            else {
                var video = document.createElement('video');
                video.autoplay = this.config.autoplay;
                video.preload = this.config.preload;
                video.controls = this.config.controls;
                video.muted = this.config.muted;
                video.volume = this.config.volume
                this.video = video;
                p.append(video);
            }

        }

    };

})();