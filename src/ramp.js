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
        this.host = host || Ramp.host;
        this.config = $.extend(true, {}, Ramp.defaults, options);
        this.service = Ramp.getService( this.config.serviceType, this.host, this.config.service);
        this.mediaData = {};
        this.mediaId = mediaId;

        Ramp.EventDispatcher(this)

        if( this.config.autoLoad )
            this.load();
    };

    /* Defaults */
    Ramp.host = '';
    Ramp.defaults = {
        host : '',
        serviceType : 'json',
        service : {},
        autoLoad : true
    };

    Ramp.prototype = {
        load : function  (){
            this.service.load(this.mediaId, this._onLoad, this);
        },

        _onLoad  : function  (response) {
            this.mediaData = response;
            response.metadata && this.dispatch('metadata');
            response.transcodes && this.dispatch('transcodes');
            response.captions && this.dispatch('captions');
            response.tags && this.dispatch('tags');
            response.metaq && this.dispatch('metaq');
        },

        metadata : function ( callback, data, scope ) {
            this.bind('metadata', callback, data, scope);
        },

        captions : function ( callback, data, scope ) {
            this.bind('captions', callback, data, scope);
        },

        transcodes : function ( callback, data, scope ) {
            this.bind('transcodes', callback, data, scope);
        },

        tags : function ( callback, data, scope ) {
            this.bind('tags', callback, data, scope);
        },

        metaq : function ( callback, data, scope ) {
            this.bind('metaq', callback, data, scope);
        },

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

    Ramp.getService = function (name, host, options) {
        return Ramp._services[name]( host, options );
    };



})();
