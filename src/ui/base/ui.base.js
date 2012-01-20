/*
    ui.base.js
    - establishes a basic html structure for adding player UI elements
    - ui elements can reliably position themselves using css
    - resizing is handled by css and the browser, not javascript calculations
    - components can adjust video size by adjusting css top/bottom/etc properties of metaplayer-video

    Basic structure:
        <div class="metaplayer" style="postion: relative">

            <!-- video element is stretched to fit parent using absolute positioning -->
            <div class="metaplayer-video" style="position: absolute: top: 0; left: 0; right: 0; bottom: 0>
                <--- any object or video child elements are height: 100%, width: 100% -->
            </div>

            <!-- example bottom-aligned control bar -->
            <div class="sample-controls" style="position: absolute: bottom: 0; height: 32px">
                ...
            </div>

        </div>
 */

( function () {
    var $ = jQuery;

    var defaults = {
        cssPrefix : "metaplayer"
    };

    var Layout = function (video, options) {
        if( !(this instanceof MetaPlayer) )
            return new MetaPlayer(video, options);

        this.config = $.extend(true, {}, defaults, options);
        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

        this.decorate( video);
    };

    if(! window.Ramp )
        window.Ramp = {};

    Ramp.layout = Layout;

    Ramp.prototype.layout = function (options) {
        Layout(this.video, options);
    };

    Layout.prototype = {
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
