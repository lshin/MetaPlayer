/**
 Metaplayer - A media player framework for HTML5/JavaScript for use with RAMP services.

 Copyright (c) 2011 RAMP Holdings, Inc.

 Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 Created: 2011 by Greg Kindel <greg@gkindel.com>

 Dependencies: jQuery
 */
(function () {

    var $ = window.jQuery;
    var Popcorn = window.Popcorn;

    /**
     * Sets up player plugin container, playlist, and DOM scaffolding
     * @constructor
     * @target an HTML5 Media element
     */
    var defaults = {
        debug : "",
        useLayout : true,
        useMetaData: true,
        useCues: true,
        useSearch: true
    };

    var MetaPlayer = function (video, options ) {

        if( ! (this instanceof MetaPlayer) )
            return new MetaPlayer( video, options );

        this.config = $.extend({}, defaults, options );

        MetaPlayer.dispatcher(this);

        this._plugins = {};
        this._loadQueue = [];
        this.target = video;

        // metadata interface
        if( this.config.useMetaData )
            this.metadata = new MetaPlayer.MetaData(this, this.config );

        // search interface
        if( this.config.useSearch )
            this.search = new MetaPlayer.Search(this, this.config );

        // cues interface
        if( this.config.useCues )
            this.cues = new MetaPlayer.Cues(this, this.config );

        // resolve video element from string, popcorn instance, or direct reference
        if( video ) {
            if( typeof video == "string")
                video = $(video).get(0);

            if( video.getTrackEvents instanceof Function ) {
                // is popcorn instance
                this.video = video.media;
                this.popcorn = video;
            }

            else if( video.play instanceof Function ) {
                // is already a media element
                this.video = video;
            }

            // optional layout disabling, use at own risk for player UI layout
            if( this.config.useLayout ) {
                this.layout = MetaPlayer.layout(video);
            }
        }

        // video-dependent core plugins
        if( this.video ){
            // video gets a Popcorn instance, if available
            if( ! this.popcorn && Popcorn != null )
                this.popcorn = Popcorn(this.video);
        }

        // start loading after this execution block, can be triggered earlier by load()
        // makes sure all plugins have initialized before startup sequence
        var self = this;
        setTimeout( function () {
            self._load();
        }, 0);
    };

    /**
     * Fired when all plugins are loaded.
     * @static
     * @constant
     * @event
     */
    MetaPlayer.READY = "ready";

    /**
     * Fired when player destructor called to allow plugins to clean up.
     * @static
     * @constant
     * @event
     */
    MetaPlayer.DESTROY = "destroy";

    /**
     * Registers a non-playback plugin.
     * @static
     * @param keyword
     * @param callback
     */
    MetaPlayer.addPlugin= function (keyword, callback ) {
        var p = MetaPlayer.prototype;
        if( p[keyword] )
            throw "keyword unavailable: " + keyword;

        p[keyword] = function () {
            // wait for load()
            if( ! this.ready ) {
                this._loadQueue.push({
                    name : keyword,
                    args : arguments,
                    fn : callback
                })
            }
            else { // post load(), fire now
                 callback.apply(this, arguments);
            }
            return this;
        };
    };


    /**
     * Registers a function as a playback plugin.
     * @param keyword
     * @param callback Function reference to invoke to inititialize plugin, with player as "this"
     */
    MetaPlayer.addPlayer = function (keyword, callback ) {
        var p = MetaPlayer.prototype;

        if( p[keyword] )
            throw "keyword unavailable: " + keyword;

        p[keyword] = function () {
            callback.apply(this, arguments);
            return this;
        };
    };


    MetaPlayer.prototype = {

        destroy : function () {
            this.dispatcher.dispatch( MetaPlayer.DESTROY );

            delete this.plugins;
            delete this._loadQueue;

            // todo: iterate plugins, call destroy() if def
            // these should be made plugins

            delete this.layout;
            delete this.popcorn;

        },

        log : function (args, tag ){
            if( this.config.debug.indexOf(tag) < 0 )
                return;

            var arr = Array.prototype.slice.apply(args);
            arr.unshift( tag.toUpperCase() );
            console.log.apply(console, arr);
        },

        /**
         * Initializes requested player plugins, optionally begins playback.
         * @param url (optional) initial url or tracks
         */
        _load : function () {

            if (! this._loadQueue ) {
                // load() was already called
                return;
            }

            // fill in core interfaces were not implemented
            if( ! this.video && this.layout )
                this.html5();

            if( this.video && ! this.playlist )
                this.playlist = new MetaPlayer.Playlist(this, this.config.playlist);

            // run the plugins, any video will have been initialized by now
            var self = this;
            $( this._loadQueue ).each(function (i, plugin) {
                plugin.fn.apply(self, plugin.args);
            });
            this._loadQueue = null;


            // let plugins do any setup which requires other plugins
            this.dispatcher.dispatch( MetaPlayer.READY );

            this.ready = true;
        },

        load : function (url) {
            this._load();

            if( url ) {
                this.playlist.empty();
                this.playlist.queue(url);
            }

            // calling load() explicitly will cause the player to apply sources;
//            this.playlist.selectSource();


            return this;
        }
    };

    window.MetaPlayer = MetaPlayer;
    window.MPF = MetaPlayer;
    window.Ramp = MetaPlayer;
})();

