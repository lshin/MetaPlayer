/**
 Metaplayer - A standards-based, multiple player, UI and Event framework for JavaScript.

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
/**
 * @fileOverview A media player framework for HTML5/JavaScript for use with RAMP services.
 * @author Greg Kindel <greg@gkindel.com>
 * @version 1.0
 */

(function () {

    var $ = window.jQuery;
    var Popcorn = window.Popcorn;


    var defaults  = {
        debug : "",
        layout : {},
        metadata : {},
        search : {},
        cues : {}
    };

    /**
     * Create a MetaPlyer instance. Sets up core player plugins, and DOM scaffolding.
     * By default, search, metadata, and cues interfaces are queued for load(). If a DOM element is passed,
     * then the layout and playlist interfaces are queued as well.
     *
     * Example:
     * In the page
     * <code><pre>
     *      &lt;video id="myVideo" src="myvideo.mp4" /&gt;
     * </pre></code>
     *
     *
     * In JavaScript, after DOM loaded:
     * <code><pre>
     *      var mp = MetaPlayer("#myVideo")
     *          .pluginA()
     *          .pluginB()
     *          .load()
     * </pre></code>
     *
     * @name MetaPlayer
     * @constructor
     * @this {MetaPlayer}
     * @param {MediaElement,String} [video] An HTML5 Media element, a DIV element, or jQuery selector string.
     * @param {Object} [options] A map of configuration options
     * @param {Object} options.layout Default options passed in to Layout module, defaults to empty object.
     * @param {Object} options.metadata Default options passed in to MetaDat module, defaults to empty object.
     * @param {Object} options.search Default options passed in to Search module, defaults to empty object.
     * @param {Object} options.cues Default options passed in to Cues module, defaults to empty object.
     */
    var MetaPlayer = function (video, options ) {

        if( ! (this instanceof MetaPlayer) )
            return new MetaPlayer( video, options );

        this.config = $.extend({}, defaults, options );

        MetaPlayer.dispatcher(this);

        this._plugins = {};
        this._loadQueue = [];
        this.target = video;

        // metadata interface
        if( this.config.metadata )
            this.metadata = new MetaPlayer.MetaData(this, this.config);

        // search interface
        if( this.config.search )
            this.search = new MetaPlayer.Search(this, this.config );

        // cues interface
        if( this.config.cues )
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

        }

        // optional layout disabling, use at own risk for player UI layout
        if( video && this.config.layout ) {
            this.layout = MetaPlayer.layout(video);
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
     * @constant
     */
    MetaPlayer.READY = "ready";

    /**
     * Fired when player destructor called to allow plugins to clean up.
     * @constant
     */
    MetaPlayer.DESTROY = "destroy";


    MetaPlayer.prototype = {

        /**
         * Initializes requested player plugins, optionally begins playback.
         * @this {MetaPlayer}
         */
        load : function () {
            this._load();
            return this;
        },

        /**
         * Disabled MP instance, frees up memory resources. Fires DESTROY event for plugin notification.
         * @this {MetaPlayer}
         */
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

        _load : function () {

            if (! this._loadQueue ) {
                // load() was already called
                return;
            }

            // fill in core interfaces were not implemented
            if( ! this.video && this.layout )
                this.html5();

            if( this.video && ! this.playlist )
                this.playlist = new MetaPlayer.Playlist(this, this.config);

            if( this.video && ! this.popcorn && Popcorn != null )
                this.popcorn = Popcorn(this.video);


            // run the plugins, any video will have been initialized by now
            var self = this;
            $( this._loadQueue ).each(function (i, plugin) {
                plugin.fn.apply(self, plugin.args);
            });
            this._loadQueue = null;


            // let plugins do any setup which requires other plugins
            this.dispatcher.dispatch( MetaPlayer.READY );

            this.ready = true;
        }

    };

    /**
     * Registers a plugin.
     *
     * For example:
     * <code><pre>
     *      MetaPlayer.addPlugin("foo", function (id) {
     *          this.video.src = id + ".mp4";
     *      });
     *      var mp = MetaPlayer("#mydiv").foo("trailer").load();
     * </pre></code>
     * @param {String} keyword The name to be use
     * @param {Function} callback Function reference to invoke to initialize plugin,
     *  with metaplayer instance as "this". All args are passed through.
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
     * Registers a function as a playback plugin.  Playback plugins are initialized earlier than other plugins.
     *
     * For example:
     * <code><pre>
     *      MetaPlayer.addPlayer("foo", function (id) {
     *          this.video = document.getElementById(id);
     *      });
     *      var mp = MetaPlayer("#mydiv").foo("myVid").load();
     * </pre></code>
     * @param {String} keyword The name to be use
     * @param {Function} callback Function reference to invoke to initialize plugin,
     *  with metaplayer instance as "this". All args are passed through.
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

    window.MetaPlayer = MetaPlayer;
    window.Ramp = MetaPlayer;
    window.MPF = MetaPlayer;

})();


(function () {

    var $ = jQuery;

    var defaults = {
    };

    var Cues = function (player, options){

        this.config = $.extend({}, defaults, options);
        MetaPlayer.dispatcher(this);
        this._cues = {};

        this._rules = {
            // default rule mapping "captions" to popcorn "subtitle"
            "subtitle" : { clone : "captions" }
        };

        this.player = player;
        this._addListeners();
    };

    MetaPlayer.Cues = Cues;

    /**
     * Fired when cues are available for the focus uri.
     * @name CUES
     * @event
     * @param data The cues from a resulting load() request.
     * @param uri The focus uri
     * @param plugin The cue type
     */
    Cues.CUES = "cues";

    Cues.prototype = {
        /**
         * Bulk adding of cue lists to a uri.
         * @param cuelists a dictionary of cue arrays, indexed by type.
         * @param uri (optional) Data uri, or last load() uri.
         */
        setCueLists : function ( cuelists , uri) {
            var self = this;
            $.each(cuelists, function(type, cues){
                self.setCues(type, cues, uri)
            });
        },

        /**
         * Returns a dictionary of cue arrays, indexed by type.
         * @param uri (optional) Data uri, or last load() uri.
         */
        getCueLists : function ( uri) {
            var guid = uri || this.player.metadata.getFocusUri();
            return this._cues[guid];
        },

        /**
         * For a given cue type, adds an array of cues events, triggering a CUE event
         * if the uri has focus.
         * @param type The name of the cue list (eg: "caption", "twitter", etc)
         * @param cues An array of cue obects.
         * @param uri (optional) Data uri, or last load() uri.
         */
        setCues : function (type, cues , uri){
            var guid = uri || this.player.metadata.getFocusUri();

            if( ! this._cues[guid] )
                this._cues[guid] = {};

            this._cues[guid][type] = cues;

            this._dispatchCues(guid, type)
        },

        /**
         * Returns an array of caption cues events. Shorthand for getCues("caption")
         * @param uri (optional) Data uri, or last load() uri.
         */
        getCaptions : function ( uri ){
            return this.getCues("captions", uri);
        },

        /**
         * Returns an array of cue objects for a given type. If no type specified, acts
         * as alias for getCueLists() returning a dictionary of all cue types and arrays.
         * @param type The name of the cue list (eg: "caption", "twitter", etc)
         * @param uri (optional) Data uri, or last load() uri.
         */
        getCues : function (type, uri) {
            var guid = uri || this.player.metadata.getFocusUri();

            if( ! type ) {
                return this.getCueLists();
            }

            if( this._rules[type] && this._rules[type].clone ){
                type = this._rules[type].clone;
            }

            if(! this._cues[guid]  || ! this._cues[guid][type])
                return [];
            return this._cues[guid][type];
        },

        /**
         * Enables popcorn events for a cue type
         * @param type Cue type
         * @param overrides Optional object with properties to define in each popcorn event, such as target
         * @param rules (advanced) Optional rules hash for cloning, sequencing, and more.
         */
        enable : function (type, overrides, rules) {
            var r = $.extend({}, this._rules[type], rules);
            r.overrides = $.extend({}, r.overrides, overrides);
            r.enabled = true;
            this._rules[type] = r;

            this._renderCues(type, this.getCues( r.clone || type) )
        },

        /**
         * Disables popcorn events for a cue type
         * @param type Cue type
         */
        disable : function (type) {
            if( ! type )
                return;

            if( this._rules[type] )
                this._rules[type].enabled = false;

            this._removeEvents(type);
        },

        /**
         * Frees external references for manual object destruction.
         * @destructor
         */
        destroy : function  () {
            this._removeEvents();
            this.dispatcher.destroy();
            delete this.player;
        },

        /* "private" */

        // broadcasts cue data available for guid, if it matches the current focus uri
        // defaults to all known cues, or can have a single type specified
        // triggers attachment of popcorn events
        _dispatchCues : function ( guid, type ) {

            // only focus uri causes events
            if( guid != this.player.metadata.getFocusUri() ) {
                return;
            }

            var self = this;
            var types = [];

            // specific cue type to be rendered
            if( type ) {
                types.push(type)
            }

            // render all cues
            else if( this._cues[guid] ){
                types = $.map(this._cues[guid], function(cues, type) {
                    return type;
                });
            }

            $.each(types, function(i, type) {
                var cues = self.getCues(type);

                var e = self.createEvent();
                e.initEvent(Cues.CUES, false, true);
                e.uri = guid;
                e.plugin = type;
                e.cues = cues;

                if( self.dispatchEvent(e) ) {
                   // allow someone to cancel, blocking popcorn scheduling
                    self._renderCues(type, cues)
                }
            });
        },

        _addListeners : function () {
            var player = this.player;
            var metadata = player.metadata;
            player.listen( MetaPlayer.DESTROY, this.destroy, this);
            metadata.listen( MetaPlayer.MetaData.FOCUS, this._onFocus, this)
        },

        _onFocus : function (e) {
            //... remove all popcorn events because the track has changed
            this._removeEvents();
            this._dispatchCues( e.uri );
        },

        _removeEvents : function ( type ) {
            var popcorn = this.player.popcorn;
            if( popcorn ) {
                var events = popcorn.getTrackEvents();
                $.each(events, function (i, e){
                    if( !type || type == e._natives.type )
                        popcorn.removeTrackEvent(e._id);
                });
            }
        },

        _renderCues : function (type, cues){
            var self = this;

            this._scheduleCues(type, cues);

            // additionally schedule any clones
            $.each( this._rules, function (plugin, rules){
                if( rules.clone == type ){
                    self._scheduleCues(plugin, cues)
                }
            });
        },

        _scheduleCues : function (type, cues) {
            var rules = this._rules[type] || {};
            var lastCue;

            if(! rules.enabled ) {
                return;
            }

            // deep copy of cues
            var events = $.extend(true, [], cues );

            // "sequence" automatically fills in missing cue end times with next cue start
            if( rules.sequence ) {
                $.each(events, function (i, event) {
                    if( lastCue )
                        lastCue.end = event.start;
                    lastCue = event;
                });
            }

            // "duration" sets a fixed length for any cue
            if( rules.duration ) {
                $.each(events, function (i, event) {
                    event.end = event.start + rules.duration;
                });
            }

            // "overrides" allow for page-specific event overrides
            if( rules.overrides ) {
                $.each(events, function (i, event) {
                    $.extend(true, event, rules.overrides)
                });
            }

            // schedule with popcorn instance
            var popcorn = this.player.popcorn;
            if( popcorn && popcorn[type] instanceof Function  ) {
                $.each(events, function(i, cue){
                    popcorn[type].call(popcorn, $.extend({}, cue) );
                });
            }
        }

    };

})();/*
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

        // on ipad, target might be an object created by MetaPlayer.proxy.proxyVideo
        var t = $(target._proxyNode || target);
        var elem  = t.get(0);

        var base;
        var stage = t.find('.mp-stage');
        var video = t.find('video');
        var isVideo = (target.play instanceof Function);
        var isFrame = (elem.tagName.toUpperCase() == "IFRAME");

        // set up main wrapper
        if( isVideo || isFrame ){
            base = $('<div></div>')
                .addClass('metaplayer')
                .insertAfter( t );

            // assume they've set the dimensions on the target
            base.width( t.width() );
            base.height( t.height() );
        }
        else {
            base = t;
        }
        base.addClass('metaplayer');


        // set up the video playback area "stage"
        if( stage.length == 0) {
            stage = $('<div></div>')
                .addClass('mp-stage');
            stage.appendTo(base);
        }

        // move any child video objects over
        if( video.length > 0 ) {
            stage.append(video);
        }

        if( base !== t )
            stage.append(t);

        return {
            target : target,
            base : base.get(0),
            stage : stage.get(0)
        }
    }
})();
(function () {

    var $ = jQuery;

    var defaults = {
    };

    var MetaData = function (player, options){
        if( !(this instanceof MetaData ))
            return new MetaData(options);

        this.config = $.extend({}, defaults, options);
        MetaPlayer.dispatcher(this);
        this._data = {};
        this._callbacks = {};
        this._lastUri = null;
    };

    MetaPlayer.MetaData = MetaData;


    /**
     * Fired when a uri becomes the focus, broadcasting events on updates.
     * @name FOCUS
     * @event
     * @param uri The new focus uri
     */
    MetaData.FOCUS = "focus";

    /**
     * Fired when MetaData needs a resource to be defined.
     * @name LOAD
     * @event
     * @param uri Opaque string which can be used by a service to load metadata.
     */
    MetaData.LOAD = "load";

    /**
     * Fired when new metadata is received as a result of a load() request.
     * @name LOAD
     * @event
     * @param data The metadata from a resulting load() request.
     */
    MetaData.DATA = "data";


    MetaData.prototype = {

        /**
         * Request MetaData for an uri
         * @param uri
         * @param callback (optional)  If specified will suppress the DATA event
         */
        load : function ( uri, callback, scope) {
            var e;

            // calling  w/ a callback will not trigger a focus change or DATA events
            if( callback ) {
                this._queue(uri, callback, scope);
            }

            // no callback, let others know focus has changed, that a DATA event is coming
            else {
                this.setFocusUri(uri);
            }

            if( this._data[uri] ){
                // cache hit; already loaded. respond immediately
                if( this._data[uri]._cached ) {
                    this._response(uri);
                    return true;
                }
                // load in progress, skip
                else if ( this._data[uri]._loading ) {
                    return true;
                }
            }

            // flag as loading
            if( ! this._data[uri] )
                this._data[uri] = {};
            this._data[uri]._loading =  (new Date()).getTime();

            // send a loading request, with any data we have
            e = this.createEvent();
            e.initEvent(MetaData.LOAD, false, true);
            e.uri = uri;
            e.data = this.getData(uri);

            // see if anyone caught our request, return accordingly
            var caught = ! this.dispatchEvent(e);
            if( ! caught ) {
                this._data[uri]._loading = false;
            }
            return caught;
        },

        /**
         * Returns the uri for which events are currently being fired.
         */
        getFocusUri : function () {
            return this._lastUri;
        },

        /**
         * Sets the uri for which events are currently being fired.
         */
        setFocusUri : function (uri) {

            if( this._lastUri == uri )
                return;

            this._lastUri = uri;
            e = this.createEvent();
            e.initEvent(MetaData.FOCUS, false, true);
            e.uri = uri;
            this.dispatchEvent(e);
        },

        /**
         * Returns any for a URI without causing an external lookup.
         * @param uri Optional argument specifying media guid. Defaults to last load() uri.
         */
        getData : function ( uri ){
            var guid = uri || this._lastUri;
            return this._data[guid]
        },

        /**
         * Sets the data for a URI, triggering DATA if the uri has focus.
         * @param data
         * @param uri (optional) Data uri, or last load() uri.
         * @param cache (optional) allow lookup of item on future calls to load(), defaults true.
         */
        setData : function (data, uri, cache ){
            var guid = uri || this._lastUri;
            this._data[guid] = $.extend(true, {}, this._data[guid], data);
            this._data[guid]._cached = ( cache == null ||  cache ) ? true : false;
            this._response(guid);
        },

        /**
         * Frees external references for manual object destruction.
         * @destructor
         */
        destroy : function  () {
            this.dispatcher.destroy();
            delete this.player;
            delete this._callbacks;
            delete this._data;
            delete this.config;
        },

        // registers a callback
        _queue : function ( uri, callback, scope ) {
            if( ! this._callbacks[uri] )
                this._callbacks[uri] = [];
            this._callbacks[uri].push({ fn : callback, scope : scope });
        },

        // handles setting data, firing event and callbacks as necessary
        _response : function ( uri ){
             var data = this._data[uri];

            if( this._lastUri == uri ) {
                var e = this.createEvent();
                e.initEvent(MetaData.DATA, false, true);
                e.uri = uri;
                e.data = data;
                this.dispatchEvent(e);
            }

            if( this._callbacks[uri] ) {
                $.each( this._callbacks[uri] || [], function (i, callback ) {
                    callback.fn.call(callback.scope, data);
                });
                delete this._callbacks[uri];
            }
        }
    };


})();
(function () {

    var $ = jQuery;

    var defaults = {
        sourceTags : true,
        selectSource : true,
        linkAdvance : false,
        autoAdvance : true,
        autoBuffer : true,
        related: true,
        loop : false
    };

    var Playlist = function (player, options ){

        this.config = $.extend({}, defaults, options);
        this.player = player;
        this._tracks = [];
        this._index = 0;

        this.loop = this.config.loop;
        this.preload = this.config.autoBuffer;
        this.advance = this.config.autoAdvance;
        this.linkAdvance = this.config.linkAdvance;

        MetaPlayer.dispatcher(this);

        this._addListeners();
    };

    MetaPlayer.Playlist = Playlist;

    Playlist.prototype = {

        index : function ( i ) {
            i = this._resolveIndex(i);
            if( i != null ) {
                this._index = i;
                this._select( this.track() );
            }
            return this._index;
        },

        queue : function ( tracks ) {
            if( ! (tracks instanceof Array) )
                tracks = [tracks];

            var wasEmpty = (this._tracks.length == 0);

            var self = this;
            $(tracks).each( function (i, track) {
                self._addTrack(track, true)
            });
            this.dispatcher.dispatch("playlistchange");

            if( wasEmpty )
                this._select( this.track() )
        },

        // begins the process of changing video source, starting with fetching metadata
        _select : function ( uri ) {
            this.dispatcher.dispatch("trackchange");
            this.player.video.pause();
            if(! this.player.metadata.load(uri) ){
                // if have no data, and no one will look it up, just play the url
                this._setSrc( uri );
            }
        },

        empty : function ( tracks ) {
            this.player.video.pause();
            this.player.video.src = "";
            this._tracks = [];
            this.transcodes = null;
            this._index = 0;
            this.dispatcher.dispatch("playlistchange");
            this.dispatcher.dispatch("trackchange");
        },

        next  : function () {

            var i = this._index + 1;
            var t = this.track(i);

            if( this.linkAdvance ) {
                var link = t.link || t.linkURL;
                if( link ) {
                    window.top.location = link;
                    return;
                }
            }

            this.index(i )
        },

        previous : function () {
            this.index( this._index - 1 )
        },

        track : function (i){
            if( i === undefined )
                i = this.index();
            return this._tracks[ this._resolveIndex(i) ];
        },

        nextTrack : function () {
            return this.track( this._index + 1);
        },

        tracks : function () {
            return this._tracks;
        },

        _addTrack : function ( track, silent ) {
            this._tracks.push(track);
            if( ! silent )
                this.dispatcher.dispatch("playlistchange");
        },

        _resolveIndex : function (i) {
            if( i == null)
                return null;
            var pl = this.tracks();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return null;
            }
            return i;
        },

        _addListeners : function () {
            var player = this.player;
            var metadata = this.player.metadata;
            var video = this.player.video;

            player.listen(MetaPlayer.DESTROY, this.destroy, this);
            metadata.listen(MetaPlayer.MetaData.DATA, this._onMetaData, this);

            var self = this;
            $(player.video).bind('ended error', function(e) {
                self._onEnded()
            });
        },


        _onMetaData : function (e) {
            if( e.uri != this.track() ){
                return;
            }

            this.transcodes = e.data.content;

            if( this.config.sourceTags )
                this.addSourceTags();

            if( this.config.selectSource )
                this.selectSource();
        },

        addSourceTags : function  () {
            var self = this;
            var video = this.player.video;
            $.each(this.transcodes, function (i, source) {
                video.appendChild( self._createSource(source.url, source.type) );
            });
        },

        selectSource : function () {
            // sticky, for playlists
            this.config.selectSource = true;

            var self = this;
            var video = this.player.video;
            var probably = [];
            var maybe = [];

            if( ! this.transcodes )
                return;

            $.each(this.transcodes, function (i, source) {
                var canPlay = video.canPlayType(source.type);
                if( ! canPlay )
                    return;
                if( canPlay == "probably" )
                    probably.push(source.url);
                else
                    maybe.push(source.url);
            });

            var src = probably.shift() || maybe .shift();
            if( src )
                this._setSrc(src);
        },

        _setSrc : function ( src ) {
            var video = this.player.video;
            video.src = src;
            if( video.autoplay || this.index() > 0 ) {
                video.play();
            }
            else if( video.preload ) {
                video.load()
            }
        },

        _createSource : function (url, type) {
            var src = $('<source>')
                .attr('type', type || '')
                .attr('src', url) ;
            return src[0];
        },

        _onEnded : function () {
            if(! this.advance )
                return;

            if( this.index() == this.tracks().length - 1 ) {
                this.dispatcher.dispatch('playlistComplete');
            }

            this.next();
        },

        destroy : function () {
            this.dispatcher.destroy();
            delete this.player;
        }

    };

})();
(function () {

    var $ = jQuery;

    var defaults = {
        forceRelative : false
    };

    var Search = function (player, options){
        this.config = $.extend({}, defaults, options);

        this.player = player;
        this.forceRelative = this.config.forceRelative;
        MetaPlayer.dispatcher(this);

        this.player.listen(MetaPlayer.DESTROY, this.destroy, this);
    };


    Search.QUERY = "QUERY";
    Search.RESULTS = "results";

    MetaPlayer.Search = Search;

    MetaPlayer.addPlugin("search", function (options) {
        return new Search(this);
    });

    Search.prototype = {
        query : function (query, callback, scope) {
            var data = this.player.metadata.getData();
            if(! data.ramp.searchapi )
                throw "no searchapi available";


            var e = this.createEvent();
            e.initEvent(Search.QUERY, false, false);
            e.query = query;
            this.dispatchEvent(e);

            this._queryAPI(data.ramp.searchapi, query, callback, scope)
        },

        destroy : function () {
            this.dispatcher.destroy();
            delete this.player;
        },

        _queryAPI : function (url, query, callback, scope) {

            if( this.forceRelative ) {
                url = url.replace(/^(.*\/\/[\w.]+)/, ""); // make match local domain root
            }

            var params = {
                q : query
            };

            if( ! query ) {
                this.setResults({ query : [], results : [] }, query, callback, scope);
                return;
            }

            $.ajax(url, {
                dataType : "xml",
                timeout : 15000,
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load search error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    var results = this.parseSearch(response, callback, scope);
                    this.setResults(results, query, callback, scope);
                }
            });
        },

        setResults : function (results, query, callback, scope) {
            if( callback ){
                callback.call(scope, results, query);
                return;
            }

            var e = this.createEvent();
            e.initEvent(Search.RESULTS, false, false);
            e.query = query;
            e.data = results;
            this.dispatchEvent(e);
        },

        parseSearch : function (xml) {
            var node = $(xml);
            var self = this;
            var ret = {
                query : [],
                results : []
            };

            var terms = node.find('SearchTerms Term');
            terms.each(function() {
                ret.query.push( self._deSmart( $(this).text() ) );
            });

            var snippets = node.find('Snippets Snippet');
            snippets.each( function (i, snip) {
                var node = $(snip);
                var s = {
                    start : node.attr('time'),
                    words : []
                };
                var words = node.find('T');
                $.each(words, function (i, word){
                    var el = $(word);
                    s.words.push({
                        match : Boolean( el.find('MQ').length ),
                        start : el.attr('s'),
                        text : self._deSmart( el.text() )
                    })
                });
                ret.results.push(s);
            });
            return ret;
        },

        _deSmart : function (text) {
            return text.replace(/\xC2\x92/, "\u2019" );
        }
    }

})();
(function () {
    var $ = jQuery;

    var EventDispatcher = function (source){

        if( source && source.dispatcher instanceof EventDispatcher)
            return source.dispatcher;

        if( ! (this instanceof EventDispatcher ))
            return new EventDispatcher(source);

        this._listeners = {};
        this.attach(source);
    };

    MetaPlayer.dispatcher = EventDispatcher;

    EventDispatcher.Event = function () {
        this.cancelBubble = false;
        this.defaultPrevented = false;
    };

    EventDispatcher.Event.prototype = {
        initEvent : function (type, bubbles, cancelable)  {
            this.type = type;
            this.cancelable = cancelable;
        },
        stopPropagation : function () {
            this.cancelBubble  = true;
        },
        stopImmediatePropagation : function () {
            this.cancelBubble  = true;
        },
        preventDefault : function () {
            if( this.cancelable )
                this.defaultPrevented = true;
        }
    },

    EventDispatcher.prototype = {

        attach : function (source) {
            if(!  source )
                return;

            if( source.addEventListener ){
                // use the element's native core
                MetaPlayer.proxy.proxyFunction( "addEventListener removeEventListener dispatchEvent",
                    source, this);
            }
            else {
                // or enable plain objects
                MetaPlayer.proxy.proxyFunction(
                    "addEventListener removeEventListener dispatchEvent",
                    this, source);
            }

            // and add our convenience functions
            MetaPlayer.proxy.proxyFunction ( "listen forget dispatch createEvent",
                this, source);

            source.dispatcher = this;
        },

        destroy : function () {
            delete this._listeners;
            delete this.addEventListener;
            delete this.removeEventListener;
            delete this.dispatchEvent;
            this.__destroyed = true; // for debugging / introspection
        },

        listen : function ( eventType, callback, scope) {
            this.addEventListener(eventType, function (e) {
                callback.call(scope, e, e.data);
            })
        },

        forget : function (type, callback) {
            this.removeEventListener(type, callback);
        },

        dispatch : function (eventType, data) {
            var eventObject = this.createEvent();
            eventObject.initEvent(eventType, true, true);
            eventObject.data = data;
            return this.dispatchEvent(eventObject);
        },

        // traditional event apis
        addEventListener : function (eventType, callback) {
            if( ! this._listeners[eventType] )
                this._listeners[eventType] = [];
            this._listeners[eventType].push(callback);
        },

        removeEventListener : function (type, callback) {
            var l = this._listeners[type] || [];
            var i;
            for(i=l.length - 1; i >= 0; i-- ){
                if( l[i] == callback ) {
                    l.splice(i, 1);
                }
            }
        },

        createEvent : function (type) {
            if( document.createEvent )
                return document.createEvent(type || 'Event');

            return new EventDispatcher.Event();
        },

        dispatchEvent : function (eventObject) {

//            if( eventObject.type != "timeupdate")
//                   console.log(eventObject.type, eventObject);

            var l = this._listeners[eventObject.type] || [];
            for(var i=0; i < l.length; i++ ){
                if( eventObject.cancelBubble ) // via stopPropagation()
                    break;
                l[i].call(l[i].scope || this, eventObject, eventObject.data )
            }
            return ! eventObject.defaultPrevented;
        }

    }

})();
(function () {

    MetaPlayer.format = {
        seconds : function (time) {
            var zpad = function (val, len) {
                var r = String(val);
                while( r.length < len ) {
                    r = "0" + r;
                }
                return r;
            };
            var hr = Math.floor(time / 3600);
            var min = Math.floor( (time %  3600) / 60);
            var sec = Math.floor(time % 60);
            var parts = [
                zpad(min, 2),
                zpad(sec, 2)
            ];
            if( hr )
                parts.unshift(hr);
            return parts.join(":");
        },

        replace : function (template, dict) {
            return template.replace( /\{\{(\w+)\}\}/g,
                function(str, match) {
                    var ret;
                    if( dict[match] instanceof Function ){
                        ret = dict[match](dict);
                    }
                    else if( dict[match] != null ){
                        ret = dict[match]
                    }
                    else {
                        return "{!!!" + match + "!!!}"
                    }
                    return MetaPlayer.format.replace( ret.toString(), dict )
                });
        }
    };

})();

(function () {
    var $ = jQuery;

    var Proxy = {
        proxyProperty : function (props, source, target ){
            $.each(props.split(/\s+/g), function (i, prop) {
                Proxy.mapProperty(prop, target, source);
            });
        },

        proxyFunction : function (props, source, target ){
            $.each(props.split(/\s+/g), function (i, prop) {
                target[prop] = function () {
                    return source[prop].apply(source, arguments);
                };
            });
        },

        proxyEvent : function (types, source, target ){
            // emulate if old non-standard event model
            if( ! target.addEventListener ) {
                Ramp.dispatcher(target);
            }
            $.each(types.split(/\s+/g), function (i, type) {
                source.addEventListener(type, function (e) {
                    // if emulated, just use type
                    if( target.dispatch ) {
                        target.dispatch(e.type);
                        return;
                    }
                    // else use standard model
                    var evt = document.createEvent("Event");
                    evt.initEvent(e.type, false, false);
                    target.dispatchEvent(evt);
                });
            });
        },

        mapProperty : function (props, target, source, method){
            // example :   map("name" myObject, myObject._name);
            //             map("name" myObject);
            if( ! source )
                source = target;

            $.each(props.split(/\s+/g), function (i, prop) {

                // support _propName
                var sProp = (source[prop] == undefined)
                    ?  "_" + prop
                    : prop;

                var fn;

                if( source[sProp] instanceof Function ){
                    fn = function () {
                        return source[sProp].apply(source, arguments);
                    };
                }
                else {
                    fn = function (val) {
                        if( val !== undefined )
                            source[sProp] = val;
                        return source[sProp];
                    };
                }

                Proxy.define(target, prop, { get : fn, set : fn });
            });
        },

        define : function (obj, prop, descriptor) {
            try {
                // modern browsers
                return Object.defineProperty(obj, prop, descriptor);
            }
            catch(e){
                // ie8 exception if not DOM element
            }

            // older, pre-standard implementations
            if( obj.__defineGetter && descriptor.get )
                obj.__defineGetter__( prop, descriptor.get);
            if( descriptor.set && obj.__defineSetter__ )
                obj.__defineSetter__( prop, descriptor.set);

            // ie7 and other old browsers fail silently
        },

        // returns an object which can safely used with Object.defineProperty
        // IE8: can't do javascript objects
        // iOS: can't do DOM objects
        // use DOM where possible
        getProxyObject : function ( dom ) {

            // All modern browsers (and ie8)
            if( ! dom )
                dom = document.createElement("div");

            try {
                Object.defineProperty(dom, "__proptest", {} );
                return dom;
            }
            catch(e){
            }

            // iOS, fake as best we can, adding props as needed
            var target = {
                _proxyNode : dom,
                parentNode : dom.parentNode,
                tagName : dom.tagName,
                ownerDocument : dom.ownerDocument,
                style : dom.style,
                appendChild : function() { dom.appendChild.apply(dom, arguments) }
            };
            try {
                Object.defineProperty(target, "__proptest", {} );
                return target;
            }
            catch(e){
            }

            throw "Object.defineProperty not defined";
        },

        proxyPlayer : function (source, target) {
            var proxy = Ramp.proxy.getProxyObject(target);

            Proxy.mapProperty("duration currentTime volume muted seeking" +
                " paused controls autoplay preload src ended readyState",
                proxy, source);

            Proxy.proxyFunction("load play pause canPlayType" ,source, proxy);

            Proxy.proxyPlayerEvents(source, proxy);

            return proxy;
        },

        proxyPlayerEvents : function (source, target){
            Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange " +
                "ended error",source, target);
        }
    };

    if( ! window.Ramp )
        window.Ramp = {};

    MetaPlayer.proxy = Proxy;


})();

(function () {

    var $ = jQuery;

    Ramp.script = {

        url : function (filename) {
            // returns the first matching script tag
            var match;
            var re = RegExp( filename );
            $('script').each( function (i, el){
                var src =  $(el).attr('src');
                if( src && src.match(re) ){
                    match = src;
                    return false;
                }
            });
            return match;
        },

        base : function (filename) {

            if( ! filename )
                filename = 'metaplayer(-complete)?(\.min)?\.js';

            var src = this.url(filename) || '';
            return src.substr(0, src.lastIndexOf('/') + 1);
        }

    }

})();
/**
 * skinnable, touch friendly lightweight scroller
 */


(function () {

    var $ = jQuery;

    var defaults = {
        fixedHeight : false,
        minHeight : 20, //px
        mouseDrag : false,
        inertial : false  // beta
    };
    var ScrollBar = function (container, options) {
        this.config = $.extend(true, {}, defaults, options);
        this.init(container);
        this.inertiaY = 0;
    };

    var eventX = function (e) {
        return e.pageX || e.originalEvent.touches[0].pageX;
    };
    var eventY = function (e) {
        return  e.pageY || e.originalEvent.touches[0].pageY;
    };

    ScrollBar.prototype = {
        init : function (parent) {
            this.parent = $(parent);
            var self = this;
            var children = this.parent[0].childNodes;

            this.body = $("<div></div>")
                .addClass("mp-scroll-body")
                .css("position", "relative")
                .bind("resize DOMSubtreeModified size change", function(e) {
                    self.onResize(e);
                })
                .append( children );


            this.scroller = $("<div></div>")
                .css("width", "100%")
                .css("height", "100%")
                .css("overflow", "hidden")
                .addClass("mp-scroll")
                .append(this.body)
                .appendTo(parent);


            // memoise event callbacks
            this._touchStop = function (e) {
                self.onTouchStop(e);
            };
            this._touchMove = function (e) {
                self.onTouchMove(e);
            };

            this._knobStop = function (e) {
                self.onKnobStop(e);
            };
            this._knobMove = function (e) {
                self.onKnobMove(e);
            };

            this.knob = $("<div></div>")
                .css('position', "absolute")
                .css('background', "black")
                .css('top', 0)
                .css('right', "-10px")
                .css('border-radius', "4px")
                .css('background', "#000")
                .css('opacity', .4)
                .css('cursor', "pointer")
                .width(8)
                .addClass("mp-scroll-knob")
                .appendTo(this.parent)
                .bind("mousedown touchstart", function (e) {
                    self.onKnobStart(e);
                });

            this.parent
                .css("position", "relative")
                .css("overflow", "visible")
                .bind("mousewheel", function (e){
                    self.onScroll(e);
                })
                .bind((this.config.mouseDrag ? "mousedown" : '') + " touchstart", function (e) {
                    self.onTouchStart(e);
                });


            this.scrollTo(0,0);
        },

        onScroll : function(e) {
            var x = e.originalEvent.wheelDeltaX || e.originalEvent.delta || 0;
            var y = e.originalEvent.wheelDeltaY || e.originalEvent.delta || 0;
            this.scrollBy(-x, -y);
            e.preventDefault();
        },

        scrollBy : function (x, y, duration){
            var sl = this.scroller.scrollLeft();
            var st = this.scroller.scrollTop();
            this.scrollTo( sl + x ,  st + y, duration);
        },

        scrollTop : function () {
            return this.scroller.scrollTop();
        },

        scrollTo : function (x, y, duration){

            var max = this.body.height() - this.parent.height();
            var at_max = ( max > 0 && this.scroller.scrollTop() + 1 >= max ); // allow rounding fuzzyiness

             if( y > max  )
                y = max;

            if( y < 0 )
                y = 0;

            this.scroller.stop();

            if( duration && !at_max ){
                var self = this;
                this._scrollY = y;
                this.scroller.animate({
                    scrollLeft : x,
                    scrollTop : y
                }, duration, function () {
                    self._scrollY = null;
                });
                this.render(duration);
            }
            else {
                this.scroller.scrollLeft(x);
                this.scroller.scrollTop(y);
                this.render();
            }
        },

        render: function (duration) {
            if( ! this.body ) {
                return;
            }
            var bh = this.body.height();
            var ph = this.parent.height();
            var kh =  Math.min( ph - ( (bh - ph) / bh * ph ), ph);

            if( kh < this.config.minHeight || this.config.fixedHeight )
                kh = this.config.minHeight;

            var y = (this._scrollY != null) ? this._scrollY : this.scroller.scrollTop();
            var perY = y /  ( bh - ph );
            var knobY = (ph - kh) * perY;

            this.knob
                .toggle( kh < ph );

            if( duration ){
                this.knob.stop().animate({
                    height : kh,
                    top : knobY
                }, duration)
            }
            else {
                this.knob.stop()
                    .height(kh)
                    .css('top', knobY);
            }
        },

        onResize : function () {
            this.render(1000);
        },

        onTouchStart : function (e) {

            this.touching = {
                lastX : this.scroller.scrollLeft(),
                lastY : this.scroller.scrollTop()
            };

            this.touching.x = eventX(e) + this.touching.lastX;
            this.touching.y = eventY(e) + this.touching.lastY;

            $(document)
                .bind("mousemove touchmove", this._touchMove )
                .bind("mouseup touchend", this._touchStop );

            if( this.config.inertial ) {
                var self = this;
                this.inertiaInterval = setInterval( function() {
                    self.onInertiaUpdate();
                },30);
            }
        },

        onInertiaUpdate : function () {
            this.inertiaY = this.inertiaY * .9;

            if( this.touching ) {
                return;
            }

            if( this.inertiaY < 1 )
                clearInterval( this.inertiaInterval );

            this.scrollBy(0, this.inertiaY);
        },

        onTouchStop : function (e) {

             $(document)
                .unbind("mousemove touchmove", this._touchMove )
                .unbind("mouseup touchend", this._touchStop );
            this.touching = null;


        },

        onTouchMove : function (e) {
            var x = (eventX(e) - this.touching.x) * -1;
            var y = (eventY(e) - this.touching.y) * -1;

            this.inertiaY += y - this.touching.lastY;

            this.touching.lastX = x;
            this.touching.lastY = y;
            this.scrollTo(x, y);
            e.stopPropagation();
            e.preventDefault();
        },

        onKnobStart : function (e, inverse) {
            this.scroller.stop();

            this.dragging = {
                x : eventX(e) - this.knob.position().left,
                y : eventY(e) -  this.knob.position().top
            };

            $(document)
                .bind("mousemove touchmove", this._knobMove )
                .bind("mouseup touchend", this._knobStop );

            e.stopPropagation();
            e.preventDefault();
        },

        onKnobStop : function (e) {
             $(document)
                .unbind("mousemove touchmove", this._knobMove )
                .unbind("mouseup touchend", this._knobStop );
            this.dragging = null;

        },

        onKnobMove : function (e) {
            var x = (eventX(e) - this.dragging.x);
            var y = (eventY(e) - this.dragging.y);


            var bh = this.body.height();
            var ph = this.parent.height();
            var kh = this.knob.height();

            var perY = y / (ph - kh);
            this.scrollTo(x, perY * (bh -ph) );
        }

    };

    if( ! window.MetaPlayer )
        window.MetaPlayer = {};

    MetaPlayer.scrollbar = function (target, options) {
        return new ScrollBar(target, options);
    };

})();

(function () {
    var $ = jQuery;

    var Timer = function (delay, count) {
        if( ! (this instanceof Timer ) )
            return new Timer(delay, count);

        var self = this;
        Ramp.dispatcher(this);
        this.delay = delay;
        this.count = count || -1;
        this._counted = 0;
        this._onTimeout = function () {
            self._counted++;
            self.dispatcher.dispatch('time', {
                count : self._counted,
                remain : self.count - self._counted
            });
            if( self.count > 0 && self.count < self._counted + 1 ){
                self.reset();
                self.dispatcher.dispatch('complete');
            }
        };
    };

    Ramp.timer = Timer;

    Timer.prototype = {
        reset : function () {
            this._counted = 0;
            this.stop();
        },

        stop : function () {
            clearInterval(this._interval);
            this._interval = null;
            this.running = null;

        },

        toggle : function () {
            if( this.running )
                this.stop();
            else
                this.start()

        },

        start : function () {
            if( this._interval )
                return;
            this.running = (new Date()).getTime();
            this._interval = setInterval(this._onTimeout, this.delay );
        }
    };


})();

(function () {

    var $ = jQuery;

    if( ! window.Ramp )
        window.Ramp = {};

    Ramp.ui = {
        /**
         * Ensures that target's parentNode is it's offsetParent, creating a wrapping div if necessary.
         *  Returned box can be used to reliably position UI elements absolutely using top,left,etc.
         * @param target - a DOM node or jquery selector
         */
        ensureOffsetParent :  function ( target ) {
            target = $(target).first();
            var el = target[0];

            if( el.offsetParent === el.parentNode && el.offsetParent.offsetParent ) {
                return;
            }

            var wrap = $('<div></div>');
            wrap.css('position', 'relative');
            wrap.css('top', 0);
            wrap.css('left', 0);
            wrap.css('width', "100%");
            wrap.css('height', "100%");

            if( el.width )
                wrap.width(el.width);

            if( el.height )
                wrap.height(el.height);

            target.css('width', "100%");
            target.css('height', "100%");

            target.parent().append(wrap);
            wrap.append(target);
        }
    };
})();
(function () {

    var $ = jQuery;

    var defaults = {
    };

    var MrssService = function (video, options) {
        if( ! (this instanceof MrssService ))
            return new MrssService(video, options);

        this.config = $.extend({}, defaults, options);

        this.dispatcher = MetaPlayer.dispatcher(video);
        this.dispatcher.attach(this);

        // if we're attached to video, update with track changes
        this.dispatcher.listen("trackchange", this._onTrackChange, this);
    };


    if( ! window.Ramp )
        window.Ramp = {};

    MetaPlayer.mrss = function (options) {
        return MrssService(null, options);
    };

    MetaPlayer.addPlugin("mrss", function (options) {
        this.service = MrssService(this.video, options);
    });

    MrssService.prototype = {
        load : function ( url  ) {

            var params = {};

            $.ajax(url, {
                dataType : "xml",
                timeout : 15000,
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load playlist error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    this.setData( this.parse(response) );
                }
            });
        },

        setData : function (data) {
            this._data = data;
            var d = this.dispatcher;
            d.dispatch('metadata', data.metadata);
            d.dispatch('transcodes', data.transcodes);
            d.dispatch('captions', data.captions);
            d.dispatch('tags', data.tags);
            d.dispatch('metaq', data.metaq);
            d.dispatch('related', data.related);
        },

        _onTrackChange : function (e, track) {
            if(! track ) {
                return;
            }
            e.preventDefault();

            if( typeof track == "string"  ){
                this.load(track);
            }
            else {
                this.setData(track);
            }
        },


        parse : function (data) {
            var self = this;
            var playlist = [];
            var nodes = $(data).find('item').toArray();

            $.each(nodes, function(i, node) {
                playlist.push( self.parseItem(node) );
            });

            var media = playlist.shift();
            media.related = playlist;
            return media;
        },

        parseItem : function (item) {
            var media = {
                metadata : {},
                transcodes : [],
                tags : [],
                captions : [],
                metaq : {},
                related : []
            };
            var el = $(item);
            var self = this;

            // compatibility issues: http://bugs.jquery.com/ticket/10377
            var content = el.find('media:content, content');
            $.each(content, function (i, node) {
                node = $(node);
                var codec = node.attr('codec');
                var type = node.attr('type') + ( codec ? 'codec="'+codec+'"' : '');
                media.transcodes.push({
                    url : node.attr('url'),
                    fileSize : node.attr('fileSize'),
                    type : type,
                    medium : node.attr('medium'),
                    isDefault : node.attr('isDefault'),
                    expression : node.attr('expression'),
                    bitrate : node.attr('bitrate'),
                    framerate : node.attr('framerate'),
                    samplingrate : node.attr('samplingrate'),
                    channels : node.attr('channels'),
                    duration : node.attr('duration'),
                    height : node.attr('height'),
                    width : node.attr('width'),
                    lang : node.attr('lang'),
                    codec : codec
                })
            });

            media.metadata.title = el.find('media:title, title').text()

            media.metadata.description = el.find('media:description, description').text()
                || el.find(']').text();

            media.metadata.thumbnail = el.find('media:thumbnail, thumbnail').attr('url');

            return media;
        },

        search : function ( query, callback, scope) {
            throw "not implemented"
        }
    };

})();(function () {

    var $ = jQuery;

    var defaults = {
        msQuotes : true,
        serviceUri : "/device/services/mp2-playlist?e="
    };

    var RampService = function (player, url, options) {
        this.config = $.extend({}, defaults);
        this.dispatcher = MetaPlayer.dispatcher(this);
        this.player = player;
        this._currentUrl = null;
        this.player.listen( MetaPlayer.READY, this.onReady, this);
    };

    MetaPlayer.addPlugin("ramp", function (url, options) {
        if(! this._ramp )
            this._ramp =  new RampService(this, url);

        var ramp = this._ramp;

        if( url ) {
            if(! this.ready )
                ramp._currentUrl = url;
            else
                ramp.load( url , true);
        }

        if( options )
            ramp.config = $.extend(ramp.config, options);

        return this;
    });

    RampService.prototype = {

        onReady  : function (e) {
            this.player.metadata.listen( MetaPlayer.MetaData.LOAD,
                this.onMetaDataLoad, this);

            this.player.metadata.listen( MetaPlayer.DESTROY,
                this.onDestroy, this);

            if( this._currentUrl )
                this.load(this._currentUrl, true);
        },

        onMetaDataLoad : function (e) {
            var data = e.data;
            if(data.ramp && data.ramp.serviceURL ){
                this.load(data.ramp.serviceURL );
                // let others know we're on it.
                e.stopPropagation();
                e.preventDefault();
            }
            else {
            // fall through to noop if not recognized
            }
        },

        onDestroy : function () {
            this.dispatcher.destroy();
            delete this.config;
            delete this.player;
        },

        load : function ( uri, isPlaylist ) {
            var track;

            // parse format:  "ramp:publishing.ramp.com/sitename:1234"
            var url = uri;
            if( typeof uri == "string" &&  uri.match(/^ramp\:/) ) {
                var parts = this.parseUrl(uri);
                url = parts.rampHost + this.config.serviceUri + parts.rampId;
            }

            var params = {
            };

            $.ajax(url, {
                dataType : "xml",
                timeout : 15000,
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    var e = this.createEvent();
                    e.initEvent(textStatus, false, true);
                    e.message = errorThrown;
                    this.dispatchEvent(e);
                },
                success : function (response, textStatus, jqXHR) {
                    var items = this.parse(response, url);
                    if( items.length )
                        this.setItems(items, isPlaylist);
                }
            });
        },

        setItems : function (items, isPlaylist) {
            var metadata = this.player.metadata;
            var playlist = this.player.playlist;
            var cues = this.player.cues;

            // first item contains full info
            var first = items[0];
            var guid = first.metadata.guid;
            if( isPlaylist )
                metadata.setFocusUri(guid);
            metadata.setData( first.metadata, guid, true );
            cues.setCueLists( first.cues, guid  );

            // subsequent items contain metadata only, no transcodes, tags, etc.
            // they require another lookup when played, so disable caching by metadata
            if( playlist && isPlaylist ) {
                var self = this;
                // add stub metadata
                $.each(items.slice(1), function (i, item) {
                    metadata.setData(item.metadata, item.metadata.guid, false);
                });

                // queue the uris
                playlist.empty();
                playlist.queue( $.map(items, function (item) {
                    return item.metadata.guid;
                }));
            }
        },

        parse : function (data, uri) {
            var self = this;
            var playlist = $(data).find('par').toArray();
            var media = [];
            $.each(playlist, function(i, node) {
                media.push( self.parseMedia(node, uri) );
            });
            return media;
        },

        parseMedia : function (node, uri) {
            var item = {
                metadata : {},
                cues : {}
            };

            var self = this;
            var video = $(node).find('video');

            // mrss metadata
            item.metadata.title = video.attr('title');
            item.metadata.description = video.find('metadata meta[name=description]').text();
            item.metadata.thumbnail = video.find('metadata meta[name=thumbnail]').attr('content');
            item.metadata.guid = video.find('metadata meta[name=rampId]').attr('content');
            item.metadata.link = video.find('metadata meta[name=linkURL]').attr('content');

            // other metadata
            item.metadata.ramp = {
            };
            video.find('metadata meta').each( function (i, metadata){
                var meta = $(metadata);
                item.metadata.ramp[ meta.attr('name') ] = meta.attr('content') || meta.text();
            });

            if( item.metadata.ramp.rampId && ! item.metadata.ramp.serviceURL ){
                if( uri.match( /mp2[-\/]playlist/ ) ) {
                    item.metadata.ramp.serviceURL = uri.replace(/e=(\d+)/, "e=" + item.metadata.ramp.rampId);
                }
            }

            // content & transcodes
            item.metadata.content = [];
            item.metadata.content.push({
                name : "default",
                url : video.attr('src'),
                type : self.resolveType( video.attr('src') ),
                isDefault : true
            });

            var transcodes = $(node).find("metadata[xml\\:id^=transcodes]");
            transcodes.find('meta').each(function (i, transcode){
                var code = $(transcode);
                item.metadata.content.push({
                    name : code.attr('name'),
                    type : code.attr('type') || self.resolveType( code.attr('content') ),
                    url : code.attr('content'),
                    isDefault: false
                });
            });

            // jump tags
            item.metadata.ramp.tags = [];
            var jumptags = $(node).find("seq[xml\\:id^=jumptags]");
            jumptags.find('ref').each(function (i, jump){
                var tag = {};
                $(jump).find('param').each( function (i, val) {
                    var param = $(val);
                    tag[ param.attr('name') ] = param.text();
                });
                if( tag.timestamps )
                    tag.timestamps = tag.timestamps.split(',');
                item.metadata.ramp.tags.push(tag);
            });

            // event tracks / MetaQ
            item.cues = {};
            var metaqs = $(node).find("seq[xml\\:id^=metaqs]");
            metaqs.find('ref').each(function (i, metaq){
                var event = {};
                $(metaq).find('param').each( function (i, val) {
                    var param = $(val);
                    var name =  param.attr('name');
                    var text =  self.deSmart( param.text() );
                    if( name == "code" ) {
                        var code = $.parseJSON( text );
                        $.extend(true, event, code);
                    }
                    else
                        event[ name ] = text;

                });
                if( ! item.cues[event.plugin] )
                    item.cues[event.plugin] = [];

                item.cues[event.plugin].push(event);
            });

            // transcript
            var smilText = $(node).find("smilText");
            item.cues.captions = this.parseCaptions(smilText);
            return item;
        },

        parseCaptions : function (xml) {
            // static factory constructor
            var self = this;
            var nodes = $(xml).contents();
            var cues  = [
            ];

            var current = {
                text : '',
                start: 0,
                offset : 0
            };

            var previous;

            var getStart = function (node, lastCue) {
                var el = $(node);
                var parseSeconds = this.parseSeconds;


                var begin = el.attr('begin');
                if( begin != null )
                    return self.parseSeconds(begin);

                var _next = el.attr('next');
                if( _next != null )
                    return self.parseSeconds(_next) + lastCue.start;
            };

            var handleNode = function (node, text) {
                var start = getStart(node);
                previous = current;
                previous.end = start;
                if( text )
                    previous.text += text ;
                cues.push(previous);
                current = {
                    text: '',
                    start : start,
                    offset : current.offset+1
                };
            };

            nodes.each( function ( i, node ){
                var text = nodes[i].data;
                if( node.tagName === undefined ){
                    if( self.config.msQuotes ) {
                        text = self.deSmart(text);
                    }
                    current.text += text;
                    return;
                }

                switch (node.tagName) {
                    case "smil:clear":
                    case "clear":
                        handleNode(node);
                        break;

                    case "smil:tev":
                    case "tev":
                        handleNode(node);
                        break;

                    case "smil:br":
                    case "br":
                        handleNode(node, "<br />" );
                        break;

                    case "smil:div":
                    case "smil:p":
                    case "smil:span":
                    default:
                        throw "unsupported tag";
                    // unsupported...
                }
            });

            if( current.text )
                cues.push(current);

            return cues;
        },

        parseSeconds : function (str) {
            // http://www.w3.org/TR/smil/smil-timing.html#Timing-ClockValueSyntax
            var lastChar = str.substr(-1);
            var val = parseFloat(str);

            if( lastChar == "s")
                return val;

            if( lastChar == "m")
                return val * 60;

            if( lastChar == "h")
                return val * 3600;

            var sec = 0;
            var p = str.split(':');
            for (var i = 0; i < Math.min(p.length, 4); i++)
                sec += Math.pow(60, i) * parseFloat(p[i]);
            return sec;
        },

        parseUrl : function ( url, obj ) {
            var parts = url.split(':');
            if( obj == undefined)
                obj = {};
            if( parts[0] !== "ramp" )
                obj.url = url;
            else {
                obj.rampHost = parts[1];
                obj.rampId = parts[2];
            }
            return obj;
        },

        toUrl : function ( item ) {
            return "ramp:" + item.ramp.rampHost + ":" + item.ramp.rampId;
        },

        deSmart : function (text) {
            return text.replace(/\xC2\x92/, "\u2019" );
        },

        resolveType : function ( url ) {
            var ext = url.substr( url.lastIndexOf('.') + 1 );

            if( url.match("www.youtube.com") ) {
                return "video/youtube"
            }

            if( ext == "ogv")
                return "video/ogg";

            // none of these seem to work on ipad4
            if( ext == "m3u8" )
            // return  "application.vnd.apple.mpegurl";
            // return  "vnd.apple.mpegURL";
                return  "application/application.vnd.apple.mpegurl";

            return "video/"+ext;
        }
    };


})();

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

    var Html5Player = function (parent, options ){
        if( !(this instanceof Html5Player ))
            return new Html5Player(parent, options);

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.config = $.extend({}, defaults, options);
        this._createMarkup(parent);
    };

    MetaPlayer.addPlayer("html5", function (options) {
        var html5 = new Html5Player(this.layout.stage, options);
        this.video = html5.video;
    });

    MetaPlayer.html5 = function (target, options) {
        var html5 = new Html5Player(target, options);
        return html5.video;
    };

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
                video.style.height = "100%";
                video.style.width = "100%";
                this.video = video;
                p.append(video);
            }

        }

    };

})();
(function () {

    var $ = jQuery;
    var $f = window.flowplayer;

    var defaults = {
        autoplay : false,
        preload : true,
        controls : true,
        swfUrl : "flowplayer-3.2.7.swf",
        wmode : "transparent",
        cssName : "mp-flowplayer",
        statusThrottleMSec : 500,
        fpConfig : {
            clip : {
                scaling : "fit"
            },
            canvas : {
                backgroundColor : "#0000000",
                backgroundGradient : "none"
            }
        }
    };

    var FlowPlayer = function (el, options){

        if( !(this instanceof FlowPlayer ))
            return new FlowPlayer(el, options);

        this.config = $.extend(true, {}, defaults, options);

        this.dispatcher = MetaPlayer.dispatcher(this);

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.__seeking = null;
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = true;
        this.__duration = NaN;

        this._pageSetup(el);

        this.__preload = this.config.preload;
        this.__autoplay = this.config.autoplay;
        this.__src = "";

        this._statepoll = Ramp.timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        var self = this;
        this._flowplayer.onLoad( function () {
            self._onLoad();
        });

        this.video = MetaPlayer.proxy.proxyPlayer(this, this._flowplayer.getParent());
    };

    MetaPlayer.flowplayer = function (el, options) {
        return FlowPlayer(el, options).video;
    };

    MetaPlayer.addPlayer("flowplayer", function (el, options) {
        // single argument mode: function(options) {
        if(!  el.getCommonClip  ) {
            options = el;
            el = $("<div></div>")
                .addClass("mp-video")
                .appendTo(this.layout.stage);
        }
        this.flowplayer = FlowPlayer(el, options);
        this.video = this.flowplayer.video;
    });

    FlowPlayer.prototype = {

        _pageSetup : function (el) {
            // if passed in fp instance
            if( el.getCommonClip ) {
                this._flowplayer = el;
                var common  = this._flowplayer.getCommonClip();
                this.preload( Boolean(common.autoBuffering) );
                this.autoplay( Boolean(common.autoPlay) );
            }
            // otherwise start one up
            else {
                el = $(el).get(0); // resolve "#foo"
                var config = $.extend(true, {
                    clip : {
                        autoPlay: false,
                        autoBuffering: true
                    }
                }, this.config.fpConfig);


                this._flowplayer = $f( el, {
                    src: this.config.swfUrl,
                    wmode: this.config.wmode
                }, config );
            }
        },

        _onLoad : function () {
            // fires twice on ipad
            if( this._onLoadFired )
                return;
            this._onLoadFired = true;

            var self = this;

            // Player listeners
            this._flowplayer.onVolume( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onMute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onUnmute( function (level) {
                self.dispatch("volumechange");
            });

            this._flowplayer.onPlaylistReplace( function () {
                self.dispatch("playlistChange");
            });

            this._flowplayer.onClipAdd( function () {
                self.dispatch("playlistChange");
            });

            this.controls( this.config.controls );


            // apply src from before we were loaded, if any
            if( this.__src ) {
                this.src( this.__src );
            }
            else {
                var c = fp.getClip(0);
                if( c ){
                    this._addClipListeners(c);
                    this.__src = c.url;
                }

            }

            self.dispatch('loadstart');

            if( this.preload() || this.autoplay()  )
                this.load();
        },

        _addClipListeners : function (clip) {
            var self = this;

            if( ! clip )
                return;

            clip.onBeforeBegin( function (clip) {
                return true;
            });

            clip.onBegin( function (clip) {
                self._flowplayer.setVolume(100);
                self._flowplayer.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
            });

            clip.onStart( function (clip) {
                self._setReady();
                self._setPlaying(true);

                // ipad controls can't be hidden until after playing
                if( self._iOS && ! self.__controls ) {
                    $(self._flowplayer.getParent() ).find('video').get(0).controls = false;
                }

                self.dispatch('loadeddata');
                self.__duration = clip.duration;
                self.dispatch("durationchange");
                self.dispatch('loadedmetadata');
            });

            clip.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
            });

            clip.onFinish( function (clip) {
                self.__ended = true;
                self.__seeking = null;
                self._setPlaying(false);
                self._flowplayer.stop();
                self.dispatch("ended");
            });

            clip.onPause( function (clip) {

                self._setPlaying(false);
                self._setReady();
            });

            clip.onResume( function (clip) {
                self._setPlaying(true);
                self.dispatch("play");
            });

            clip.onBeforeSeek( function (clip) {

                self.dispatch("seeking");
                self.dispatch("timeupdate");

                // fp doesn't do seeks while paused until it plays again, so we fake
                if( self.paused() )  {
                    self.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            clip.onSeek( function (clip) {
                this.__currentTimeCache = 0;
                self.__seeking = null;
                if( ! self.paused() )
                    self.dispatch("seeked");
            });

        },

        _setReady : function (){
            if( this.__readyState != 4 ) {
                this.__readyState = 4;
                this.dispatch("canplay");
            }
            else {
                this.dispatch("seeking");
                this.dispatch("seeked");
            }
        },

        _setPlaying : function ( bool ){
            this.__paused = ! bool;
            // the play and pause events fire before isPlaying() and isPaused() update
            this._statepoll.start();
        },


        /* Media Interface */

        load : function () {
            this.preload(true);
            if( this.src() && this._flowplayer.isLoaded()  ) {
                var c =  this._flowplayer.getClip(0);

                c.update({
                    autoPlay : this.autoplay(),
                    autoBuffer : true
                });

                // if ipad()
                if(  window.flashembed.__replaced && ! this.__loaded ) {
                    // ipad() play method respects autoPlay and autoBuffering
                    // but requires an argument to update video.src correctly
                    this._flowplayer.play(0);

                    // also has regexp bug which breaks every other play() (related: http://stackoverflow.com/a/2630538/369724)
                    if( this.autoplay() ) {
                        this._flowplayer.play(0);
                    }
                    this.__loaded = true;
                    return;
                }

                if( this.autoplay() ) {
                    this._flowplayer.play();
                }
                else {
                    this._flowplayer.startBuffering();
                }
            }
        },

        play : function () {
            this.autoplay(true);
            this.__paused = false; // helps onBeforeBegin() know to ignore clip.autoPlay == false
            this.load();
        },

        pause : function () {
            this._flowplayer.pause();
        },

        canPlayType : function (type) {
            var canPlay = null;

            // html5 / ipad
            if( window.flashembed.__replaced ){
                if( ! this._video )
                    this._video = document.createElement('video');

                // just accept m3u8
                if( this._iOS  && type.match(/mpegurl|m3u8/i)  ){
                    canPlay = "probably";
                }
                else if( this._video.canPlayType )
                    canPlay = this._video.canPlayType(type)
            }

            // fall through to flash
            else if( type.match( /mp4|flv|jpg$/ ) ) {
                canPlay = "probably";
            }

            return canPlay
        },

        paused : function (){
            return this.__paused;
        },

        duration : function () {
            return this.__duration;
        },

        seeking : function () {
            return (this.__seeking !== null );
        },

        ended : function () {
            return this.__ended;
        },

        currentTime : function (val){
            if( val !== undefined ){
                if( val < 0 )
                    val = 0
                if( val > this.duration )
                    val = this.duration;
                this.__seeking = val;
                this._flowplayer.seek(val);
            }

            if( this.__seeking !== null )
                return this.__seeking;

            if( ! this._flowplayer.isLoaded() )
                return 0;

            // throttle the calls so we don't affect playback quality
            var now = (new Date()).getTime();
            var then = this.__currentTimeCache;
            var diff = now - then;

            if(then && diff< this.config.statusThrottleMSec )
                return this.__currentTime + (diff / 1000); // approx our position
            else
                this.__currentTimeCache = now;

            var status = this._flowplayer.getStatus(); // expensive

            this.__currentTime = status.time;
            return this.__currentTime;
        },

        muted : function (val){
            if( val !== undefined ){
                if( val )
                    this._flowplayer.mute();
                else
                    this._flowplayer.unmute();
            }
            var status = this._flowplayer.getStatus();
            return Boolean( status.muted );
        },

        volume : function (val){
            if( val !== undefined ) {
                this._flowplayer.setVolume(val * 100);
            }
            return this._flowplayer.getVolume() / 100;
        },

        controls : function (val) {
            if( ! this._flowplayer.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            var controls = this._flowplayer.getControls();
            var playBtn =  this._flowplayer.getPlugin("play");
            // ipad() doesn't support disabling controls through the api
            var video = $(this._flowplayer.getParent() ).find('video').get(0);

            if( val !== undefined ){
                this.__controls = val;
                if( val ) {
                    controls && ( controls.show() );
                    playBtn && playBtn.show();
                    video && (video.controls = true);
                }
                else {
                    controls && ( controls.hide() );
                    playBtn && playBtn.hide();
                    video && (video.controls = false);
                }
            }
            return this.__controls
        },

        preload : function (val) {
            if( val !== undefined )
                this.__preload = val;
            return this.__preload;
        },

        autoplay : function (val) {
            if( val !== undefined )
                this.__autoplay = val;
            return this.__autoplay;
        },

        loop : function (bool) {
            if( bool !== undefined ) {
                this.__loop = bool;
            }
            return this.__loop;
        },

        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
                this.__loaded  = false;
                this.__duration  = NaN;
                var fp = this._flowplayer;
                if( fp.isLoaded() ) {
                    fp.setClip({
                        autoPlay : false,
                        autoBuffering : false,
                        url : this.__src
                    });
                    var c = fp.getClip(0);
                    this._addClipListeners(c);
                }
            }
            return this.__src;
        },

        readyState : function (val) {
            if( val !== undefined )
                this.__readyState = val;
            return this.__readyState;
        },

        /* Timer Handlers */

        _onPlayStatePoll : function () {
            if( this._flowplayer.isPlaying() === this.paused() )
                return;

            this._statepoll.reset();
            if( this.paused()  ) {
                this.dispatch("pause");
                this._timeupdater.reset();
            }
            else {
                this.autoplay(true);
                this.dispatch("playing");
                this.dispatch("play");
                this._timeupdater.start();
            }
        },

        _onTimeUpdate : function  () {
            this.dispatch("timeupdate");
        }

    };
})();
(function () {

    // save reference for no conflict support
    var $ = jQuery;

    var defaults = {
        autoplay : false,
        preload : true,
        updateMsec : 500,
        playerVars : {
            enablejsapi : 1,
            version : 3,
            autohide : 0,
            autoplay : 0,
            controls : 1,
            fs : 1,
            hd : 1,
            rel : 1,
            showinfo : 1,
            iv_load_policy : 0,
            cc_load_policy : 0,
            wmode : "transparent"
        }
    };

    var YouTubePlayer = function (youtube, options) {
        this.config = $.extend(true, {}, defaults, options);

        this.__seeking = false;
        this.__readyState = 0;
        this.__ended = false;
        this.__muted = false;
        this.__paused = true;
        this.__duration = NaN;
        this.__currentTime = 0;
        this.__volume = 1;
        this.__loop = this.config.loop;
        this.__src = "";

        if( this.config.chromeless ){
            var pv = this.config.playerVars;
            pv.controls = 0;
            pv.rel = 0;
            pv.showinfo = 0;
        }
        this.preload = this.config.preload;
        this.autoplay = this.config.autoplay;
        this.updateMsec = this.config.updateMsec;

        MetaPlayer.dispatcher( this );

        if( typeof youtube == "string" || ! youtube.getVideoEmbedCode ) {
            this.container = $(youtube).get(0);
            // add another child so our proxy div doesn't get replaced by the frame
            this.target = $("<div></div>").appendTo(this.container).get(0);
            this.init();
        }
        else {
            this.youtube = youtube;
            // wrap so we have a non-iframe container to append source elements to
            this.container  = $("<div></div>")
                .appendTo( youtube.a.parentNode )
                .append( youtube.a )
                .get(0);
            this.addListeners();
        }

        this.video = MetaPlayer.proxy.proxyPlayer(this, this.container);
    };


    MetaPlayer.addPlayer("youtube", function (youtube, options ) {

        // single arg form
        if( ! options && youtube instanceof Object && ! youtube.getVideoEmbedCode){
            options = youtube;
            youtube = null;
        }

        if( ! options ) {
            options = {};
        }

        if( ! youtube ) {

            // disable default UI if initialized without options
            if( options.chromeless == null )
                options.chromeless = true;

           youtube = $("<div></div>")
               .addClass("mp-video")
               .appendTo(this.layout.stage);
        }

        var yt = new YouTubePlayer(youtube, options);
        this.video = yt.video;
        this.youtube = yt
    });

    MetaPlayer.youtube = function (youtube, options){
        var yt = new YouTubePlayer(youtube, options);
        return yt.video;
    }


    YouTubePlayer.prototype = {

        init : function () {

            if( window.YT instanceof Function ){
                this.onApiReady();
                return;
            }

            var tag = document.createElement('script');
            tag.src = "http://www.youtube.com/player_api";
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            // play nice; global context
            var self = this;
            var oldReady = window.onYouTubePlayerAPIReady;
            window.onYouTubePlayerAPIReady = function (){
                self.onApiReady();
                if( oldReady )
                    oldReady.call(window);
            };
        },

        onApiReady : function () {
            this.youtube = new YT.Player( this.target, {
                height: '100%',
                width: '100%',
//                playerVars : this.getParams()
                playerVars : this.config.playerVars
            });
            this.addListeners();
        },

        addListeners : function () {
            var yt = this.youtube;
            var self = this;

            yt.addEventListener("onReady", function(e) {
                self.onReady(e);
            });
            yt.addEventListener("onStateChange", function(e) {
                self.onStateChange(e);
            });
            yt.addEventListener("onError", function(e) {
                self.onError(e);
            });
        },

        onReady : function () {
            if( ! this.isReady() ) {
                this.error = "unabled to find youtube player";
                this.dispatch("error");
                return;
            }

            // flash implemented, works in IE?
            // player.addEventListener(event:String, listener:String):Void
            this.startVideo();
        },

        isReady : function () {
            return this.youtube && this.youtube.playVideo;
        },

        onStateChange : function (e) {
            var state = e.data;

            // http://code.google.com/apis/youtube/js_api_reference.html#Events
            switch(state) {
                case -1: // unstarted
                    break;
                case 0: //ended
                    this.__ended = true;
                    this.__duration = NaN;
                    this.dispatch("ended");
                    break;
                case 1: // playing
                    this.__paused = false;
                    this.dispatch("playing");
                    this.dispatch("play");
                    break;
                case 2: // paused
                    this.__paused = true;
                    this.dispatch("pause");
                    break;
                case 3: // buffering
                    this.startDurationCheck();
                    this.startTimeCheck(); // check while paused to handle event-less seeks
                    break;
                case 5: // queued
                    this.dispatch("canplay");
                    this.dispatch("loadeddata");
                    break;
            }
        },

        onError : function (e) {
            this.dispatch("error");
        },

        startTimeCheck : function () {
            var self = this;
            if( this._timeCheckInterval ) {
                return;
            }

            this._timeCheckInterval = setInterval(function () {
                self.onTimeUpdate();
            }, this.updateMsec);

            // set an initial value, too
            this.updateTime();
        },

        stopTimeCheck : function () {
            clearInterval(this._timeCheckInterval);
            this._timeCheckInterval = null;
        },

        onTimeUpdate: function () {
            this.updateTime();
            this.dispatch("timeupdate");
        },

        updateTime : function () {
            this.__currentTime = this.youtube.getCurrentTime();
        },

        startDurationCheck : function () {
            var self = this;
            if( this.__duration )
                return;

            if( this._durationCheckInterval ) {
                return;
            }
            this._durationCheckInterval = setInterval(function () {
                self.onDurationCheck();
            }, this.updateMsec);
        },

        onDurationCheck : function () {
            var duration = this.youtube.getDuration();
            if( duration > 0 ) {
                this.__duration = duration;
                this.dispatch("loadedmetadata");
                this.dispatch("durationchange");
                clearInterval( this._durationCheckInterval );
                this._durationCheckInterval = null;
            }
        },

        startVideo : function () {
            // not loaded yet
            if( ! this.isReady() )
                return;

            this.__ended = false;

            if( this.__muted ) {
                this.youtube.mute();
            }
            // volume works, this is too early to set mute
            this.youtube.setVolume(this.__volume);

            var src = this.src();
            if( ! src ) {
                return;
            }

            if( this.__readyState < 4 ){
                this.dispatch("loadstart");
                this.__readyState = 4;
            }

            if( src.match("^http") ){
                var videoId = src.match( /www.youtube.com\/(watch\?v=|v\/)([\w-]+)/ )[2];
            }
            this.youtube.cueVideoById( videoId || src );

            if( this.autoplay )
                this.play();
            else if( this.preload )
                this.load();

        },

        doSeek : function (time) {
            this.__seeking = true;
            this.dispatch("seeking");
            this.youtube.seekTo( time );
            this.__currentTime = time;

            // no seeking events exposed, so fake best we can
            // will be subject to latency, etc
            var self = this;
            setTimeout (function () {
                self.updateTime(); // trigger a time update
                self.__seeking = false;
                self.dispatch("seeked");
                self.dispatch("timeupdate");
            }, 1500)
        },

        /* Media Interface */

        load : function () {
            this.preload = true;

            if( ! this.isReady() )
                return;

            if( this.youtube.getPlayerState() != -1 )
                return;

            var src = this.src();
            // kickstart the buffering so we get the duration
            this.youtube.playVideo();
            this.youtube.pauseVideo();
        },

        play : function () {
            this.autoplay = true;
            if( ! this.isReady() )
                return;

            this.youtube.playVideo()
        },

        pause : function () {
            if(! this.isReady()  )
                return false;
            this.youtube.pauseVideo()
        },

        canPlayType : function (type) {
            return Boolean  ( type.match( /\/youtube$/ ) );
        },

        paused : function (){
            return this.__paused;
        },

        duration : function () {
            return this.__duration;
        },

        seeking : function () {
            return this.__seeking;
        },

        ended : function () {
            if(! this.isReady()  )
                return false;
            return (this.youtube.getPlayerState() == 0);
        },

        currentTime : function (val){
            if(! this.isReady()  )
                return 0;
            if( val != undefined ) {
                this.__ended = false;
                this.doSeek(val);
            }
            return this.__currentTime;
        },

        muted : function (val){
            if( val != null ){
                this.__muted = val
                if( ! this.isReady() )
                    return val;
                if( val  )
                    this.youtube.mute();
                else
                    this.youtube.unMute();
                this.dispatch("volumechange");
                return val;
            }

            return this.__muted;
        },

        volume : function (val){
            if( val != null ){
                this.__volume = val;
                if( ! this.isReady() )
                    return val;
                this.youtube.setVolume(val * 100)
                this.dispatch("volumechange");
            }
            return this.__volume;
        },

        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
                this.startVideo();
            }
            return this.__src
        },

        readyState : function () {
            return this.__readyState;
        }
    }

})();
(function () {
    var $ = jQuery;
    var ovp = window.ovp;

    var defaults = {
        // OVP main default configs
        strategy : {"order":["HTML5","Flash","Silverlight"]}, // Case is important
        sliderdelay : 5000,
        sliderspeed : "slow",
        immediately : false,
        controls: {'src_img':'/images/play.png'},
        ovp_container_class:'ovp',
        controller_keepalive_seconds: 5,
        players : {
            "Flash":{"src":"ovp-2.1.6.swf","minver":"10","controls":false, "plugins":[]},
            "Silverlight":{"src":"ovp-2.3.1.xap","minver":"4.0","controls":false, "plugins":[]},
            "HTML5":{"minver":"0","controls":false}
        },
        status_timer : 500,
        // OVP video default configs
        ovpConfig: {
            sources:[
                    {'src':'/videos/trailer.ogv', 'type':'video/ogg'},
                    {'src':'/videos/trailer.mp4','type':'video/mp4'}
            ],
            width : '100%', // swfobject requires width/height of player.
            height : '100%',
            posterimg:'/images/poster.png',
            autobuffer:true,
            autoplay:false,
            id: 'ovp',
            scalemode: 'fit',
            controls: false
        }
    };

    var status = {
        LOAD  : 0,
        READY : 1,
        PLAY  : 2,
        PAUSE : 3,
        SEEK  : 4,
        ENDED : 5
    };

    var OVPlayer = function(el, options) {
        if(!(this instanceof OVPlayer))
            return new OVPlayer(el, options);

        this.config = $.extend(true, {}, defaults, options); 
        this.__readyState = 0;
        this.__paused = (! this.config.immediately);
        this.__duration = NaN;
        this.__ended = false;
        this.__seeking = false;
        this.__controls = false;
        this.__volume = 1;
        this.__muted = false;
        this.__src = "";
        this.__status = status.LOAD;
        
        this._ovp = this._render( $(el).get(0) );
        this.video = $(el).get(0);
        this.dispatcher = MetaPlayer.dispatcher( this );
        MetaPlayer.proxy.proxyPlayer( this, this.video );
        this._setControls();
        this._addEventListeners();
    };

    if( window.MetaPlayer ) {
        MetaPlayer.addPlayer("ovp", function ( options ) {
            var target = $("<div></div>").appendTo(this.layout.stage);
            this.ovp = OVPlayer(target, options);
            this.video = this.ovp.video;
        });
    } else {
        window.MetaPlayer = {};
    }

    MetaPlayer.ovp = function (target, options) {
        var ovp = OVPlayer(target, options);
        return ovp.video;
    };

    OVPlayer.prototype = {
        _render: function (el) { 
            var presetplay = this.config.immediately;
            if (! presetplay ) this.config.immediately = true;
            ovp.init(this.config);
            this.config.immediately = presetplay;
            return ovp.render(el, this.config.ovpConfig)[0];
        },
        
        _addEventListeners : function () {
            // start ovp player status check
            this._loadtimer = Ramp.timer(this.config.status_timer);
            this._loadtimer.listen('time', this._onBeforeLoad, this);
            this._loadtimer.start();
            
            this._statustimer = Ramp.timer(this.config.status_timer);
            this._statustimer.listen('time', this._onStatus, this);
        },
        _onBeforeLoad : function () {
            if(typeof this._ovp.player !== "object")
                return;
            this.dispatch('loadstart');
            this._loadtimer.reset();
            this._onReady();
            this._startDurationCheck();
        },
        _onReady : function () {
            this._statustimer.start();
            this.__readyState = 4;
            this.dispatch("loadeddata");
            this.dispatch("canplay");
            this.load();

            this.__status = status.READY;
            
            this.video.pause();
            if(this.config.immediately || this.config.ovpConfig.autoplay) {
                this.video.play();
            }
        },
        _startDurationCheck : function () {
            var self = this;
            if( this._durationCheckInterval ) {
                return;
            }
            this._durationCheckInterval = setInterval(function () {
                self._onDurationCheck();
            }, 1000);
        },

        _onDurationCheck : function () {
            var duration = this._ovp.getDuration();
            if( duration > 0 ) {
                this.__duration = duration;
                this.dispatch("loadeddata");
                this.dispatch("loadedmetadata");
                this.dispatch("durationchange");
                this.dispatch("timeupdate");
                clearInterval( this._durationCheckInterval );
                this._durationCheckInterval = null;
            }
        },
        
        _onStatus : function () {
            if ( this._ovp.isPlaying() ) {
                this.__paused = false;
                if( this.__status !== status.PLAY ) {
                    this.dispatch("play");
                }
                this.dispatch("timeupdate");
                this.__status = status.PLAY;
            } else if ( this._ovp.isEnded() ){
                this.__paused = true;
                if( this.__status !== status.ENDED ) {
                    this.dispatch("ended");
                }
                this.__status = status.ENDED;
            } else {
                this.__paused = true;
                if( this.__status !== status.PAUSE ) {
                    this.dispatch("pause");
                }
                this.__status = status.PAUSE;
            }
        },
        _setControls : function () {
            if ( this._ovp.controlsState === 'RENDERED' )
                this.__controls = this._ovp.controls;
        },
        _getCurrentTimeFromCache : function () {
            if (! this._ovp.player )
                return 0;
            
            var now = (new Date()).getTime();
            var then = this.__currentTimeCache;
            var diff = now - then;

            if( then && diff < this.config.status_timer )
                return this.__currentTime + (diff / 1000); // approx our position
            else
                this.__currentTimeCache = now;
            
            var ovpCurrentTime = this._ovp.getCurrentTime();
            this.__currentTime = ( ovpCurrentTime < 0 )? 0 : ovpCurrentTime;
            return this.__currentTime;
        },
        doSeek : function (time) {
            this.__seeking = true;
            this.dispatch("seeking");
            this._ovp.seekTo( time );
            this.__currentTime = time;
            this.__status = status.SEEK;

            // no seeking events exposed, so fake best we can
            // will be subject to latency, etc
            var self = this;
            setTimeout (function () {
                self.updateTime(); // trigger a time update
                self.__seeking = false;
                self.dispatch("seeked");
                self.dispatch("timeupdate");
            }, 1500)
        },
        updateTime : function () {
            this.__currentTime = this._ovp.getCurrentTime();
        },
        /**
         * MetaPlayer Media Interfaces
         *
         * @Functions
         * load()
         * play()
         * pause()
         * canPlayType(type)
         *
         */
        load : function () {
            if (! this._ovp.player )
                return;
            
            var f = this.src();
            if(f) {
                this.config.ovpConfig.sources = [{src: f}];
            }
            // start to play video.
        },
        play : function () {
            this.__paused = false;
            this._ovp.playpause();
        },
        pause : function () {
            this.__paused = true;
            this._ovp.playpause();
        },
        canPlayType : function (val) {
            // In ovp, it has to be changed the video sources before it checks.
            return this._ovp.canPlay();
        },
        /**
         * MetaPlayer Media Properties
         * paused()
         * duration()
         * seeking()
         * ended()
         * currentTime(val)
         * muted()
         * volume(val)
         * src(val)
         * readyState()
         * controls()
         */
        paused : function () {
            return this.__paused;
        },
        duration : function () {
            return this.__duration;
        },
        seeking : function () {
            return this.__seeking;
        },
        ended : function () {
            return this.__ended;
        },
        currentTime : function (val) {
            if( typeof val !== 'undefined' ) {
                if( val < 0 )
                    val = 0;
                if( val > this.duration )
                    val = this.duration;
                this.doSeek(val);
            }
            
            return this._getCurrentTimeFromCache();
        },
        readyState : function (val) {
            if( val !== undefined )
                this.__readyState = val;
            return this.__readyState;
        },
        muted : function (val) {
            if( val != null ){
                this.__muted = val;
                if( ! this._ovp )
                    return val;
                if( val )
                    this._ovp.mutetoggle();
                else
                    this._ovp.mutetoggle();
                this.dispatch("volumechange");
                return val;
            }

            return this.__muted;
        },
        volume : function (val) {
            if( val != null ){
                this.__volume = val;
                if( ! this._ovp )
                    return val;
                // ovp doesn't support to change any volume level.
                this._ovp.mutetoggle();
                this.dispatch("volumechange");
            }
            return this.__volume;
        },
        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
            }
            return this.__src
        },
        controls : function (val) {
            if( typeof val !== 'undefined' || val != false ) {
                this.__controls = val;
            }
            return this.__controls;
        }
    };
})();
(function() {

    var $ = jQuery;
    var jwplayer = window.jwplayer;

    var defaults = {
        autostart  : true,
        autobuffer : true,
        controlbar :  "none",
        flashplayer: "",
        file       : "",
        image      : "",
        id         : "jwplayer",
        //duration   : 0,
        volume     : 100,
        width      : "100%",
        height     : "100%",
        icons      : false, // disable a big play button on the middle of screen
        events     : {
            onTime: function(e) {}, onMeta: function(e) {}
        },
        plugins: { viral: { onpause: false, oncomplete: false, allowmenu: false } } // disable all viral features.
    };

    var JWPlayer = function(el, options) {
        if(!( this instanceof JWPlayer ))
            return new JWPlayer(el, options);

        this.config = $.extend(true, {}, defaults, options);
        this.__autoplay = this.config.autostart;
        this.__autobuffer = this.config.autobuffer;
        this.__volume = (this.config.volume/100);
        this.__seeking = null;
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = (! this.config.autostart);
        this.__duration = NaN;
        this.__metadata = null;
        this.__started = false;
        this.__currentTime = 0;
        this.__src = "";

        this._jwplayer = this._render( $(el).get(0) );
        this.video = this._jwplayer.container;
        this.dispatcher = MetaPlayer.dispatcher( this );
        MetaPlayer.proxy.proxyPlayer( this, this.video );

        var self = this;
        this._jwplayer.onReady(function() {
            self._onLoad();
        });
    };

    if( window.MetaPlayer ) {
        MetaPlayer.addPlayer("jwplayer", function ( options ) {
            var target = $("<div></div>").appendTo(this.layout.stage);
            // jwplayer always requires with a element id.
            $(target).attr("id", options.id);
            this.jwplayer = JWPlayer(target, options);
            this.video = this.jwplayer.video;
        });
    } else {
        window.MetaPlayer = {};
    }

    MetaPlayer.jwplayer = function (target, options) {
        var jwplayer = JWPlayer(target, options);
        return jwplayer.video;
    };

    JWPlayer.prototype = {
        _render: function (el) {
            jwplayer(el).setup(this.config);
            return jwplayer(el);
        },

        _onLoad: function() {
            var self = this;

            //console.log("_onLoad", this._jwplayer.getMeta());
            // Player listeners
            this._jwplayer.onPlay( function (level) {
                self.__ended = false;
                self.__paused = false;
                self.__started = true;
                self.dispatch("play");
            });

            this._jwplayer.onPause( function (level) {
                self.__paused = true;
                self.dispatch("pause");
            });

            this._jwplayer.onTime( function (e) {
                self.__currentTime = e.position;
                self.dispatch("timeupdate");
            });

            this._jwplayer.onIdle( function (level) {
                // not sure what should do for this event.
            });

            this._jwplayer.onBuffer( function (e) {
                self.dispatch("buffering");       
            });

            this._jwplayer.onSeek( function (e) {
                self.__seeking = e.offset;
                self.__currentTime = e.offset;
                self.dispatch("seeked");
            });

            this._jwplayer.onComplete( function (e) {
                self.__ended = true;
                self.__started = false;
                self.__paused = true;
                self.dispatch("ended");
            });

            this._jwplayer.onVolume( function (e) {
                self.dispatch("volumechange");
            });

            this._jwplayer.onMute( function (e) {
                self.dispatch("volumechange");
            });

            this._jwplayer.onMeta( function (e) {
                self.__metadata = e.metadata;   
                if ( e.metadata.duration && e.metadata.duration > 0 ) {
                    self.__duration = e.metadata.duration;
                    self.dispatch("loadeddata");
                    self.dispatch("loadedmetadata");
                    self.dispatch("durationchange");
                }
            });

            this._jwplayer.onPlaylist( function (level) {
                self.__started = false;
                self.dispatch("playlistChange");
            });

            this._jwplayer.onError( function (e) {
                self.__started = false;
            });

            this.__src = this._getSrc();

            this.dispatch('loadstart');
            this.dispatch("canplay");

            if( this._getAutoBuffer() || this._getAutoPlay() )
                this.load();
        },

        _doSeek : function (time) {
            this.__seeking = true;
            this.dispatch("seeking");
            this._jwplayer.seek( time );
            this.__currentTime = time;

            // no seeking events exposed, so fake best we can
            // will be subject to latency, etc
            var self = this;
            setTimeout (function () {
                self._updateTime(); // trigger a time update
                self.__seeking = false;
                self.dispatch("seeked");
                self.dispatch("timeupdate");
            }, 1500)
        },
        _updateTime : function () {
            this.__currentTime = this._jwplayer.getPosition();
        },

        _getAutoPlay : function () {
            return this.__autoplay;
        },

        _getAutoBuffer : function () {
            return this.__autobuffer;
        },

        _getSrc : function () {
            if (! this._jwplayer ) return "";
            return this._jwplayer.getPlaylist()[0].file;
        },

        /**
         * MetaPlayer Media Interfaces
         *
         * @Functions
         * load()
         * play()
         * pause()
         * canPlayType(type)
         *
         */
        load : function () {
            if( this.src() ) {
                var f = this.src();
                this._jwplayer.load([{file: f}]);
            }
            if( this._jwplayer ) {
                if( this._getAutoPlay() ) {
                    this._jwplayer.play();
                } else {
                    // in jwplayer, it doesn't have a autobuffer. add a trick with play/pause.
                    this._jwplayer.play();
                    this._jwplayer.pause();
                }
            }
        },
        play : function () {
            this._jwplayer.play();
        },
        pause : function () {
            this._jwplayer.pause();
        },
        canPlayType : function (val) {
            return true;
        },
        /**
         * MetaPlayer Media Properties
         * paused()
         * duration()
         * seeking()
         * ended()
         * currentTime(val)
         * muted()
         * volume(val)
         * src(val)
         * readyState()
         * controls()
         */
        paused : function () {
            return this.__paused;
        },
        duration : function () {
            return this.__duration;
        },
        seeking : function () {
            return (this.__seeking !== null);
        },
        ended : function () {
            return this.__ended;
        },
        currentTime : function (val) {
            if( val !== undefined ){
                if( val < 0 )
                    val = 0;
                if( val > this.duration )
                    val = this.duration;
                this._doSeek(val);
            }

            return this.__currentTime;
        },
        readyState : function (val) {
            return this.__readyState;
        },
        muted : function (val) {
            if( val !== undefined )
                this._jwplayer.setMute();
            return this._jwplayer.getMute();
        },
        volume : function (val) {
            if( val != null ){
                this.__volume = val;
                if( ! this._jwplayer )
                    return val;
                // ovp doesn't support to change any volume level.
                this._jwplayer.setVolume(val*100);
                this.dispatch("volumechange");
            }
            return (this.__volume > 1)? (this.__volume/100):this.__volume;
        },
        src : function (val) {
            if( val !== undefined ) {
                this.__src = val;
            }
            return this.__src
        },
        controls : function (val) {
            if( typeof val !== 'undefined' ) {
                this.__controls = val;
            }
            return this.__controls;
        }
    };

})();
