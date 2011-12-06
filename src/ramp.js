/**
 * RAMP MetaPlayer
 * Requires jQuery
 *
 * Copyright (c) 2011 RAMP Holdings, Inc.
 *
 * Dual licensed under MIT and GPL 2+ licenses
 * SEE: http://www.opensource.org/licenses
 *
 * Version 3.0 alpha
 */


var Ramp;

(function () {
    // ============================================================== Ramp()

    var $ = jQuery;

    Ramp = function (mediaId, host, options){
        if( ! (this instanceof Ramp) )
            return new Ramp(mediaId, host, options);

        this.config = $.extend(true, {}, Ramp.defaults, options);

        Ramp.EventDispatcher(this);

        this.service();

        if( mediaId && host ) {
            this.service.load(mediaId, host)
        }
    };

    /* Defaults */
    Ramp.host = '';
    Ramp.defaults = {
    };

    // namespace anchors
    Ramp.Players = {};
    Ramp.Services = {};
    Ramp.Views = {};
    Ramp.Utils = {};

    Ramp.prototype = {

        bind : function (eventType, callback, data, context ){
            var events = eventType.split(/\s/);
            var self = this;
            var scope = context || this;
            $.each(events, function (i, type) {
                if( self.mediaData[type] )
                    setTimeout( function () {
                        callback.call(scope , self.mediaData[type], data );
                    });
                else
                  self.listen(type, function () {
                    callback.call(scope , self.mediaData[type], data);
                })
            });
        }
    };

    /* Static */
    Ramp._services = [];

    Ramp.addService = function (name, service ) {
        Ramp._services.push(service);
        Ramp._services[name] = service;
    };

    Ramp.getService = function (name, options) {
        return Ramp._services[name]( options );
    };



})();
