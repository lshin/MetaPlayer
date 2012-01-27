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
        cssPrefix : "mp"
    };

    MetaPlayer.layout = function (target, options) {

        this.config = $.extend(true, {}, defaults, options);
        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);


        var t = $(target);
        target = t.get(0);

        var base;
        var stage = t.find('.mp-video');
        var video = t.find('video');
        var isVideo = ! (target.currentTime == null);

        // set up main wrapper
        if( isVideo ){
            base = $('<div></div>')
                .addClass('metaplayer')
                .appendTo( t.parent() );

            // assume they've set the dimensions on the target
            base.width( t.width() );
            base.height( t.height() );
        } else {
            base = t;
        }
        base.addClass('metaplayer');


        // set up the video playback area "stage"
        if( stage.length == 0) {
            stage = $('<div></div>')
                .addClass('mp-video');
            stage.appendTo(base);
        }

        // move any child video objects over
        if( video.length > 0 ) {
            stage.append(video);
        }

        if( isVideo )
            stage.append(t);

        // steal the id for sizing
//        base.attr('id', t.attr('id') );
//        t.attr('id', '');

        return {
            base : base.get(0),
            stage : stage.get(0)
        }
    }
})();