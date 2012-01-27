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
            // append any child player to layout, defensively
            if( !(this.video === video) )
                this.video.appendChild( video );
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
(function () {

    var $ = jQuery;

    var defaults = {
        applySources : true,
        selectSource : true,
        autoAdvance : true,
        autoPlay : true,
        autoBuffer : true,
        related: true,
        loop : false
    };

    var Playlist = function (video, options ){

        if( !(this instanceof Playlist ))
            return new Playlist(video, options);

        this.config = $.extend({}, defaults, options);
        this.video = video;
        this._haveRelated = false;
        this._tracks = [];
        this._index = 0;
        this.loop = this.config.loop;
        this.autoplay = this.config.autoPlay;
        this.preload = this.config.autoBuffer;
        this.advance = this.config.autoAdvance;

//        this.dispatcher = MetaPlayer.dispatcher();
        this.dispatcher = MetaPlayer.dispatcher(video);

        this._addDataListeners(this.video);
        this._addMediaListeners(this.video);
    };

    MetaPlayer.playlist = function (video, options) {
        return Playlist( $(video).get(0), options);
    };

    MetaPlayer.addPlugin('playlist', function (options) {
        return MetaPlayer.playlist(this.video, options);
    });

    Playlist.prototype = {

        index : function ( i ) {
            i = this._resolveIndex(i);
            if( i != null ) {
                this._index = i;
                this.load( this.track() );
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
                this.load( this.track() )
        },

        load : function (track) {
            this.video.pause();

            // let services cancel loading if they need to do something
            var ok = this.dispatcher.dispatch("trackchange", track);
            if( ok ) {
                this._setSrc( track );
            }
        },

        empty : function ( tracks ) {
            this._tracks = [];
            this._index = 0;
            this.dispatcher.dispatch("playlistchange");
            this.dispatcher.dispatch("trackchange");
        },

        next  : function () {
            this.index( this._index + 1 )
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

        _addDataListeners : function (dispatcher) {
            dispatcher.listen("metadata", this._onMetaData, this);
            dispatcher.listen("transcodes", this._onTranscodes, this);
            dispatcher.listen("related", this._onRelated, this);
        },

        _addMediaListeners : function () {
            var self = this;
            $(this.video).bind('ended error', function(e) {
                self._onEnded()
            });
        },

        _onMetaData: function (e, metadata) {
            var idx = this.index();
            // replace a plain url with updated metadata
            if ( typeof this._tracks[idx] == "string" ) {
                this._tracks[idx] = metadata;
            }
        },

        _onRelated : function (e, related) {
            if( this._haveRelated || ! this.config.related )
                return;
            this.queue( related );
            this._haveRelated = true;
        },

        _onTranscodes : function (e, transcodes) {
            var self = this;
            var video = this.video;
            this.transcodes = transcodes;
            var probably = [];
            var maybe = [];
            var sources = [];

            $.each(transcodes, function (i, source) {
                video.appendChild( self._createSource(source.url, source.type) );

                var canPlay = video.canPlayType(source.type);
                if( ! canPlay )
                    return;

                if( canPlay == "probably" )
                    probably.push(source.url);
                else
                    maybe.push(source.url);

            });

            var src = probably.shift() || maybe .shift();
            if( src)
                this._setSrc(src);
        },

        _setSrc : function ( src ) {
            this.video.src = src;
            if( this.video.autoplay || this.index() > 0 ) {
                this.video.play();
            }
            else if( this.video.preload ) {
                this.video.load()
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
        }

    };

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

    Ramp.dispatcher = EventDispatcher;

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
            MetaPlayer.proxy.proxyFunction ( "listen forget dispatch",
                this, source);

            source.dispatcher = this;
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
            var l = this._listeners[eventObject.type] || [];
            for(var i=0; i < l.length; i++ ){
                if( eventObject.cancelBubble )
                    break;
                l[i].call(l[i].scope || this, eventObject, eventObject.data )
            }
            return ! eventObject.defaultPrevented;
        }

    }

})();
(function () {

    Ramp.format = {
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
                $(source).bind(type, function (e) {
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
            if( ! dom )
                dom = document.createElement("div");

            try {
                Object.defineProperty(dom, "__proptest", {} );
                return dom;
            }
            catch(e){
            }

            // dom to be flushed out as needed
            var target = {
                parentNode : dom.parentNode
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

            Proxy.mapProperty("duration currentTime volume muted seeking seekable" +
                " paused played controls autoplay preload src ended readyState",
                proxy, source);

            Proxy.proxyFunction("load play pause canPlayType" ,source, proxy);

            Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange " +
                "ended error",source, proxy);

            return proxy;
        }
    };

    if( ! window.Ramp )
        window.Ramp = {};

    Ramp.proxy = Proxy;


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
            var src = this.url(filename) || '';
            return src.substr(0, src.lastIndexOf('/') + 1);
        }

    }

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
        playlistService : "/device/services/mp2-playlist?e={e}"
    };

    var SmilService = function (video, options) {
        if( ! (this instanceof SmilService ))
            return new SmilService(video, options);

        this.config = $.extend({}, defaults, options);

        this.dispatcher = MetaPlayer.dispatcher(video);
        this.dispatcher.attach(this);

        // if we're attached to video, update with track changes
        this.dispatcher.listen("trackchange", this._onTrackChange, this);
    };

    SmilService.msQuotes = true;
    SmilService.rebase = true;

    MetaPlayer.ramp = function (options) {
        return SmilService(null, options);
    };

    MetaPlayer.addPlugin("ramp", function (options) {
        this.service = SmilService(this.video, options);
    });

    SmilService.parseUrl = function ( url, obj ) {
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
    };

    SmilService.prototype = {
        _onTrackChange : function (e, track) {
            if(! track ) {
                return;
            }

            if( typeof track == "string" ) {
                track = SmilService.parseUrl(track);
            }

            if( track && track.rampId ){
                this.load(track);
                e.preventDefault();
            }
        },

        load : function ( track  ) {

            // parse format:  "ramp:publishing.ramp.com/ramp:1234"
            if( typeof track == "string" ) {
                track = SmilService.parseUrl(track);
            }

            if( ! track.rampId ) {
                throw "invalid media id";
            }

            this.mediaId = track.rampId;

            if( track.rampHost )
                this.lastHost = track.rampHost;

            var host = this.lastHost;
            var url = host + this.config.playlistService.replace(/{e}/, this.mediaId);

            var params = {
//                format: 'playlist',
//                renderJSON: true
            };

            $.ajax(url, {
                dataType : "xml",
//                jsonp : "jsoncallback",
                timeout : 15000,
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load playlist error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    var data = this.parse(response);
                    data.metadata.host = host;
                    this.setData(data)

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

        parse : function (data) {
            var self = this;
            var playlist = $(data).find('par').toArray();
            var node = playlist.shift();

            var media = this.parseMedia(node);
            $.each(playlist, function(i, node) {
                media.related.push( self.parseMedia(node).metadata );
            });

            return media;
        },

        parseMedia : function (node) {
            var media = {
                metadata : {},
                transcodes : [],
                tags : [],
                captions : [],
                metaq : {},
                related : []
            };

            var video = $(node).find('video');

            // metadata
            media.metadata.title = video.attr('title');
            video.find('metadata meta').each( function (i, metadata){
                var meta = $(metadata);
                media.metadata[ meta.attr('name') ] = meta.attr('content') || meta.text();
            });

            // transcodes
            media.transcodes.push({
                name : "default",
                type : SmilService.resolveType( video.attr('src') ),
                url : video.attr('src')
            });

            var transcodes = $(node).find("metadata[xml\\:id^=transcodes]");
            transcodes.find('meta').each(function (i, transcode){
                var code = $(transcode);
                media.transcodes.push({
                    name : code.attr('name'),
                    type : code.attr('type') || SmilService.resolveType( code.attr('content') ),
                    url : code.attr('content')
                });
            });

            var jumptags = $(node).find("seq[xml\\:id^=jumptags]");
            jumptags.find('ref').each(function (i, jump){
                var tag = {};
                $(jump).find('param').each( function (i, val) {
                    var param = $(val);
                    tag[ param.attr('name') ] = param.text();
                });
                if( tag.timestamps )
                    tag.timestamps = tag.timestamps.split(',');
                media.tags.push(tag);
            });

            var metaqs = $(node).find("seq[xml\\:id^=metaqs]");
            metaqs.find('ref').each(function (i, metaq){
                var event = {};
                $(metaq).find('param').each( function (i, val) {
                    var param = $(val);
                    var name =  param.attr('name');
                    var text =  SmilService.deSmart( param.text() );
                    if( name == "code" ) {
                        var code = $.parseJSON( text );
                        $.extend(true, event, code);
                    }
                    else
                        event[ name ] = text;

                });
                if( ! media.metaq[event.plugin] )
                    media.metaq[event.plugin] = [];

                media.metaq[event.plugin].push(event);
            });

            var smilText = $(node).find("smilText");
            media.captions = SmilService.parseCaptions(smilText);

            return media;
        },

        search : function ( query, callback, scope) {

            var url = this._data.metadata.searchapi;

            if( SmilService.rebase ) {
                url = url.replace(/^(.*\/\/[\w.]+)/, ""); // make match local domain root
            }

            var params = {
                q : query
            };

            if( ! query ) {
                var response = {
                    query : [],
                    results : []
                };
                this.dispatch("search", response);
                callback.call(scope, response);
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
                    var results = SmilService.parseSearch(response);
                    this.dispatch("search", results);
                    if( callback )
                        callback.call(scope, results);
                }
            });
        }
    };
    SmilService.parseSearch = function (xml) {
        var node = $(xml);
        var ret = {
            query : [],
            results : []
        };

        var terms = node.find('SearchTerms Term');
        terms.each(function() {
            ret.query.push( SmilService.deSmart( $(this).text() ) );
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
                    text : SmilService.deSmart( el.text() )
                })
            });
            ret.results.push(s);
        });
        return ret;
    },

    SmilService.parseCaptions = function (xml) {
        // static factory constructor
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
            var parseSeconds = SmilService.parseSeconds;


            var begin = el.attr('begin');
            if( begin != null )
                return parseSeconds(begin);

            var _next = el.attr('next');
            if( _next != null )
                return parseSeconds(_next) + lastCue.start;
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
                if( SmilService.msQuotes ) {
                    text = SmilService.deSmart(text);
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
    };

    SmilService.parseSeconds = function (str) {
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
    };

    SmilService.deSmart = function (text) {
       return text.replace(/\xC2\x92/, "\u2019" );
    };

    SmilService.resolveType = function ( url ) {
        var ext = url.substr( url.lastIndexOf('.') + 1 );

        if( ext == "ogv")
            return "video/ogg";

        // none of these seem to work on ipad4
        if( ext == "m3u8" )
            // return  "application.vnd.apple.mpegurl";
            // return  "vnd.apple.mpegURL";
            return  "application/application.vnd.apple.mpegurl";

        return "video/"+ext;
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

    var Html5Player = function (el, options ){
        if( !(this instanceof Html5Player ))
            return new Html5Player(el, options);

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.config = $.extend({}, defaults, options);
        this._createMarkup(el);
    };

    MetaPlayer.html5 = function (video, options) {
        return Html5Player(video, options).video;
    };

    MetaPlayer.addPlayer("html5", function (options) {
       return MetaPlayer.html5(this.video, options);
    });

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
                this.video = video;
                p.append(video);
            }

        }

    };

})();(function () {

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
            }
        }
    };

    var FlowPlayer = function (el, options){

        if( !(this instanceof FlowPlayer ))
            return new FlowPlayer(el, options);

        this.config = $.extend(true, {}, defaults, options);

        this.dispatcher = MetaPlayer.dispatcher(el);

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

        this.video = this.attach( this._flowplayer.getParent() );
    };

    MetaPlayer.flowplayer = function (el, options) {
        return FlowPlayer(el, options).video;
    };

    MetaPlayer.addPlayer("flowplayer", function (el, options) {
        // single argument mode: function(options) {
        if(!  el.getCommonClip  ) {
            options = el;
            el = $("<div></div>").appendTo(this.video);
        }

        return FlowPlayer(el, options).video;
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
                self.dispatcher.dispatch("volumechange");
            });

            this._flowplayer.onMute( function (level) {
                self.dispatcher.dispatch("volumechange");
            });

            this._flowplayer.onUnmute( function (level) {
                self.dispatcher.dispatch("volumechange");
            });

            this._flowplayer.onPlaylistReplace( function () {
                self.dispatcher.dispatch("playlistChange");
            });

            this._flowplayer.onClipAdd( function () {
                self.dispatcher.dispatch("playlistChange");
            });

            this.controls( this.config.controls );


            // apply src from before we were loaded, if any
            if( this.__src )
                this.src( this.__src );

            self.dispatcher.dispatch('loadstart');

            if( this.preload() || this.autoplay()  )
                this.load();
        },

        _addClipListeners : function (clip) {
            var self = this;

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

                self.dispatcher.dispatch('loadeddata');
                self.__duration = clip.duration;
                self.dispatcher.dispatch("durationchange");
                self.dispatcher.dispatch('loadedmetadata');
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
                self.dispatcher.dispatch("ended");
            });

            clip.onPause( function (clip) {
                self._setPlaying(false);
                self._setReady();
            });

            clip.onResume( function (clip) {
                self._setPlaying(true);
                self.dispatcher.dispatch("play");
            });

            clip.onBeforeSeek( function (clip) {
                self.dispatcher.dispatch("seeking");
                self.dispatcher.dispatch("timeupdate");

                // fp doesn't do seeks while paused until it plays again, so we fake
                if( self.paused() )  {
                    self.dispatcher.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            clip.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused() )
                    self.dispatcher.dispatch("seeked");
            });
        },

        _setReady : function (){
            if( this.__readyState != 4 ) {
                this.__readyState = 4;
                this.dispatcher.dispatch("canplay");
            }
            else {
                this.dispatcher.dispatch("seeking");
                this.dispatcher.dispatch("seeked");
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

        attach : function (target) {
            target = MetaPlayer.proxy.getProxyObject(target);
            this.dispatcher.attach(target);
            MetaPlayer.proxy.proxyPlayer(this, target);
            return target;
        },

        /* Timer Handlers */

        _onPlayStatePoll : function () {
            if( this._flowplayer.isPlaying() === this.paused() )
                return;

            this._statepoll.reset();
            if( this.paused()  ) {
                this.dispatcher.dispatch("pause");
                this._timeupdater.reset();
            }
            else {
                this.autoplay(true);
                this.dispatcher.dispatch("playing");
                this.dispatcher.dispatch("play");
                this._timeupdater.start();
            }
        },

        _onTimeUpdate : function  () {
            this.dispatcher.dispatch("timeupdate");
        }

    };
})();