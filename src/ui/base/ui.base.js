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
        if( !(this instanceof Layout) )
            return new Layout(video, options);

        this.config = $.extend(true, {}, defaults, options);
        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

        this.decorate( video);
    };

    if(! window.Ramp )
        window.Ramp = function () {};

    Ramp.layout = Layout;

    Layout.prototype = {
        decorate : function (target) {

            var t = $(target);

            if(! t.is('.metaplayer') ) {
                t.addClass('metaplayer');
            }

            var mpv = t.find('.metaplayer-video');
            var v = t.find('video');

            if(! mpv.length ) {
                mpv = $('<div></div>')
                    .addClass('metaplayer-video')
                    .appendTo(t)
                    .append(v);

                if( v.length  ){
                    if( this._iOS ) {
                        // ipad video breaks upon reparenting, so needs resetting
                        // jquery listeners will be preserved, but not video.addEventListener
                        v.clone(true, true).appendTo( v.parent() );
                        v.remove();
                    }
                }
            }

            v.width('100%').height('100%');
        }

    };

})();
