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

    Created: 2011 by Greg Kindel <gkindel@ramp.com>

    Dependencies: jQuery
 */
(function () {

    var $ = jQuery;

    /**
     * Sets up player plugin container, playlist, and DOM scaffolding
     * @constructor
     * @param target a DOM element, or jQuery selector (eg: "#mydiv")
     */
    var MetaPlayer = function (target, options ) {

        if( ! (this instanceof MetaPlayer ) )
            return new MetaPlayer( target );

        this._plugins = [];

        var layout = MetaPlayer.layout(target);


        this.target = $(target).get(0);
        this.dom = layout.base;
        this.video = MetaPlayer.proxy.getProxyObject(layout.stage);
        this.dispatcher = MetaPlayer.dispatcher( this.video );
        this.playlist(options);
    };

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
            if( this._plugins ) {
                this._plugins.push({
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
            var video =  callback.apply(this, arguments);
            this.player( video );
            return this;
        };
    };

    MetaPlayer.prototype = {
        /**
         * Manually set the video playback source.
         * @param video
         */
        player : function (video) {
            MetaPlayer.proxy.proxyPlayer(video, this.video);
            this.currentPlayer = video;
            return this;
        },

        /**
         * Initializes requested player plugins, optinally begins plabyack.
         * @param url (optional) initial url or tracks
         */
        load : function (url) {
            var self = this;
            $( this._plugins ).each(function (i, plugin) {
                self[plugin.name] = plugin.fn.apply(self, plugin.args);
            });
            this._plugins = null;

            this.dispatcher.dispatch("ready");

            if( url )
                this.playlist.queue(url);

            return this;
        }
    };


    window.MetaPlayer = MetaPlayer;
    window.MPF = MetaPlayer;
    window.Ramp = MetaPlayer;
})();

