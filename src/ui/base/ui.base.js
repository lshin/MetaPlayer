( function () {
    var $ = jQuery;

    var defaults = {
        cssPrefix : "metaplayer"
    };

    var MetaPlayer = function (video, options) {
        if( !(this instanceof MetaPlayer) )
            return new MetaPlayer(video, options);

        this.config = $.extend(true, {}, defaults, options);
        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

        this.decorate( video);
    };

    if(! window.Ramp )
        window.Ramp = {};

    Ramp.layout = MetaPlayer;

    Ramp.prototype.layout = function (options) {
        MetaPlayer(this.video, options);
    };

    MetaPlayer.prototype = {
        decorate : function (video) {

            var v = $(video);
            video = v.get(0);


            var id = v.attr('id');

            console.log("readystate " +  video.readyState );


            var p = v.parent();

            var mp = v.parents('.metaplayer');
            if(! mp .length ) {
                mp = $('<div></div>')
                    .addClass('metaplayer')
                    .appendTo(v.parent() );
            }


            var mpv = v.parents('.metaplayer-video');
            if( ! mpv.length ) {
                if( v.is('video')  ){
                    // video elements need a wrapper to observe top/left/bottom/right
                    mp.width( v.width() );
                    mp.height( v.height() );

                    if( this._iOS ) {
                        // ipad video breaks upon reparenting, so needs resetting
                        var c = v.clone(true, true)
                            .width('100%')
                            .height('100%');
                        v.remove();
                        v = c;
                    }

                    mpv = $('<div></div>')
                        .addClass('metaplayer-video')
                        .appendTo(mp)
                        .append(v);
                }
                else {
                    // already has a wrapper
                    v.addClass('metaplayer-video');
                }
            }
        }

    };


})();
