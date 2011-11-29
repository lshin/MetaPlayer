
(function () {

    var $ = jQuery;

    var defaults = {};

    var Overlay = function (player, options) {

        if( !(this instanceof Overlay ))
            return new Overlay(player, options);

        this.config = $.extend({}, defaults, options);
        this.player = player;
    };

    Overlay.prototype = {

        addEventListeners : function () {
            var player = $(this.player);

            var logfn = function(){
                console.log(arguments)
            };

            el.bind('loadedmetadata', logfn);
            el.bind('loadedrampdata', logfn);
        }

    };

    Ramp.prototype.overlay = Overlay;
})();