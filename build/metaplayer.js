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
        var isVideo = t.is("video");
        var base;
        var stage = t.find('.mp-video');
        var video = t.find('video');

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
        if( video.length > 0 ) {
            stage.append(video);
        }

        if( isVideo )
            stage.append(t);

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
        this.init(source);
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

        init : function (source) {
            if(!  source )
                return;

            // we can wrap other event dispatchers
            if( source.addEventListener ){
                // use the element's native core
                MetaPlayer.proxy.proxyFunction("addEventListener removeEventListener dispatchEvent",
                    source, this);

                // but add our convenience functions
                MetaPlayer.proxy.proxyFunction (
                    "listen forget dispatch",
                    this, source);
            }
            // or enable plain objects
            else {
                this.attach(source)
            }
        },

        attach : function (target, force) {
            if( target.addEventListener && ! force  ) {
                throw 'already an event dispatcher';
            }

            if(! target.addEventListener ) {
                MetaPlayer.proxy.proxyFunction(
                    "addEventListener removeEventListener dispatchEvent",
                    this, target);
            }

            MetaPlayer.proxy.proxyFunction (
                "listen forget dispatch",
                this, target);

            target.dispatcher = this;
        },

        _wrap : function(name) {
            var self = this;
            var scope = this;
            return function () {
                return self[name].apply(scope, arguments);
            }
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
            self.dispatch('time', {
                count : self._counted,
                remain : self.count - self._counted
            });
            if( self.count > 0 && self.count < self._counted + 1 ){
                self.reset();
                self.dispatch('complete');
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
        delayMsec : 1000
    };

    var Sample = function  (options) {
        if( !(this instanceof Sample) )
            return new Sample(options);
        this.config = $.extend(true, {}, defaults, options);
    };

    Ramp.Services.Sample = Sample;

    Ramp.sample = function (id, host, options) {
        return new Ramp.Models.Media({
            rampId : id,
            rampHost : host,
            service : new Sample(options)
        }, host);
    };

    Sample.prototype = {
        parse : function (string) {
            return Sample.data;
        },

        load : function ( mediaId, mediaHost, callback, scope) {
            setTimeout( function () {
                var data = $.extend(true, {}, Sample.mediaData);
                callback.call(scope, data);
            }, this.config.delayMsec);
        },

        search : function (term, callback, scope) {
            if( ! this.data )
                throw "media not loaded";

            setTimeout( function () {
                var data = $.extend(true, {}, Sample.searchData);
                callback.call(scope, data);
            }, this.config.delayMsec);
        }
    };

    Sample.mediaData = {
        metadata : {
            title : "Euro Contagion Risks Loom in Corporate Credit Market ",
            description: "Fundamentals remain strong across the board, but high-quality corporate credits are likely to outperform in a volatile environment, says Morningstar's Dave Sekera.",
            thumbnail : "http://publishing.ramp.com/thumbnails/cached_media/0006/0006401/0006401014/images/thumb.jpg",
            poster : "http://publishing.ramp.com/thumbnails/cached_media/0006/0006401/0006401014/images/thumb.jpg"
        },
        "transcodes" : [
            {
                "name" : "default",
                "type" : "video/mp4",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.mp4"
            },
            {
                "name" : "some.name",
                "type" : "video/webm",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.webm"
            },
            {
                "name" : "some.name",
                "type" : "video/ogg",
                "url"  : "http://videos.mozilla.org/serv/webmademovies/wtfpopcorn.ogv"
            }
        ],
        tags : [
            {
                term : "United States",
                type : "place",
                score : 19.390835,
                origin : "namedentity",
                timestamps : [ 44.449, 170.339, 196.689, 217.504 ]
            },
            {
                term : "Morningstar",
                type : "company",
                score : 4.843158,
                origin : "namedentity",
                timestamps : [ 8.209, 498.966 ]
            },
            {
                term : "Spain",
                type : "place",
                score : 3.7033582,
                origin : "namedentity",
                timestamps : [ 283.749, 300.219 ]
            },                    {
                term : "private equity",
                type : "unk",
                score : 3.6826441,
                origin : "namedentity",
                timestamps : [ 89.619 ]
            }
        ],
        captions : [
            {
                start : 0,
                text : "Jeremy Glaser : For Morningstar, I'm Jeremy Glaser. I'm here"
            },
            {
                start : 10.29,
                text : "today with our bond strategist, Dave Sekera, to get an "
            },
            {
                start : 12.30,
                text : "update on the corporate credit market , and on what investors"
            },
            {
                start : 14.69,
                text : ""
            }
            // <smilText>Jeremy Glaser : For Morningstar, I'm Jeremy Glaser. I'm here <clear begin="10.29s"/>today with our bond strategist, Dave Sekera, to get an <clear begin="12.30s"/>update on the corporate credit market , and on what investors <clear begin="14.69s"/>could expect going forward. Dave, thanks for joining me today. <clear begin="16.84s"/>Dave Sekera : You are welcome, Jeremy. Good to be <clear begin="18.35s"/>here. Glaser : So let's start talking a little bit <clear begin="19.99s"/>about corporate fundamentals, before we get to some of the <clear begin="22.75s"/>macro issues, that I know are on a lot of <clear begin="24.33s"/>people's minds. What's really happening in the corporate marketplace? Are <clear begin="28.77s"/>balance sheets still remaining strong, even as the economy kind <clear begin="32.03s"/>of weakened a little bit this summer? Sekera : As <clear begin="34.22s"/>you mentioned, it has been a crazy time in all <clear begin="36.28s"/>of the asset markets, including the corporate bond market . But <clear begin="40.01s"/>you know, getting back to just the underlying fundamentals of <clear begin="43.34s"/>corporate credit here in the United States , fundamentally, we are <clear begin="46.58s"/>still looking pretty good. Third-quarter earnings reports that came out <clear begin="50.28s"/>generally were either in line or better than expected. It <clear begin="53.24s"/>has been positive for bondholders, looking at probability of default <clear begin="58.78s"/>risk across the universe of names that we cover. Things <clear begin="62.88s"/>still are pretty even; are still even maybe looking a <clear begin="65.51s"/>tad better. Glaser : So I know in the past, <clear begin="68.00s"/>you have talked about self-inflicted credit wounds. Companies either doing <clear begin="72.31s"/>a debt-fueled buyback or M&amp;A activity or an LBO or <clear begin="75.73s"/>something something like that. Is that a trend that you <clear begin="78.20s"/>have seen kind of play out this year, or do <clear begin="79.83s"/>you think that companies are still being pretty prudent about <clear begin="82.33s"/>their cash management? Sekera : Of those three, we didn't <clear begin="85.01s"/>see the LBOs that we expected this year, we missed <clear begin="87.70s"/>that one. We thought there was going to be a <clear begin="89.23s"/>lot more private equity activity out there. Debt-fueled LBOs, where <clear begin="93.95s"/>we'd see companies get taken out and levered up. It <clear begin="96.63s"/>just really did not occur. There were definitely some instances, <clear begin="98.72s"/>but we thought it was going to be much greater <clear begin="100.63s"/>than it actually was. However, we have seen a lot <clear begin="103.59s"/>more share buybacks, where companies are issuing debt, using that <clear begin="107.70s"/>debt in order to buy back the stock, which, of <clear begin="109.65s"/>course, is usually negative for bondholders. Having said that--of the <clear begin="113.26s"/>names that we follow, the buybacks that they have done, <clear begin="116.63s"/>the debt that they have issued, has been within the <clear begin="119.51s"/>rating category. So there have really only been a couple <clear begin="121.84s"/>of instances where we've downgraded any of the companies that <clear begin="124.50s"/>we cover because of that share buyback activity. Glaser : <clear begin="127.86s"/>Now you mentioned third-quarter earnings were reasonably in line or <clear begin="131.09s"/>a little bit stronger. But they were really kind of <clear begin="133.14s"/>overshadowed in a lot of ways by the crisis in <clear begin="135.73s"/>Europe. What impact do you think that the sovereign debt <clear begin="139.07s"/>situation there is having on corporate credits in the U.S. <clear begin="141.97s"/>and elsewhere? Sekera : Well, it has definitely been a <clear begin="144.62s"/>rollercoaster. Going back to May of 2010, when you and <clear begin="147.36s"/>I first started talking about the sovereign debt crisis, we <clear begin="151.87s"/>did write and opined at that point in time that <clear begin="153.58s"/>we recommended that investors stick with U.S. corporate bonds as <clear begin="157.39s"/>opposed to European corporate bonds, and we still hold that <clear begin="160.25s"/>view today. Now there are instances where we are starting <clear begin="162.81s"/>to see some European bonds for the same corporate credit <clear begin="165.99s"/>risks that are trading at a higher yield or a <clear begin="168.70s"/>wider spread than what we are seeing in the United <clear begin="170.71s"/>States . But it's not yet to the point where we <clear begin="172.73s"/>are willing to make that call, to go ahead and <clear begin="175.27s"/>buy the euro-denominated issues, even if you can swap that <clear begin="178.54s"/>back into U.S. dollars. There is just still too much <clear begin="181.81s"/>fundamental or really systemic risk of what could happen in <clear begin="186.06s"/>Europe right now. Having said that, in the U.S., PPI/CPI <clear begin="191.09s"/>that came out this week, both of those numbers are <clear begin="193.35s"/>still showing inflation is well under control here in the <clear begin="196.69s"/>United States . Looking at what we call the five-year, five-year <clear begin="201.44s"/>forward, which is inflation expectation, stripping out inflation from the <clear begin="205.50s"/>TIPS and straight bonds, still within that trading range that <clear begin="208.96s"/>we have seen--kind of that 2% to 2.5% for quite <clear begin="211.62s"/>a while now. So, we're really not worried about inflation <clear begin="214.97s"/>at this point. We're not worried about the United States <clear begin="218.11s"/>as much as we are the contagion effect of what <clear begin="220.09s"/>could happen in Europe. Glaser : So, some of those <clear begin="222.15s"/>contagion effects into the U.S. credits, do you think that <clear begin="225.58s"/>would come from a weakening of those corporate fundamentals? Would <clear begin="228.38s"/>it come from people kind of rushing money into different <clear begin="231.61s"/>parts of the bond market that maybe don't expect to <clear begin="233.74s"/>get that money? How exactly would that contagion work? Sekera <clear begin="236.37s"/>: Well, it depends on how that contagion first starts. <clear begin="238.82s"/>So, what we've been seeing and our bank credit analyst <clear begin="241.65s"/>Jim Leonard put out a note earlier this week mentioning <clear begin="245.31s"/>that it looks like they're having some liquidity and some <clear begin="247.26s"/>funding issues with the Italian banks this week--that the Italian <clear begin="250.53s"/>banks have gone to the ECB, asking that ECB to <clear begin="255.01s"/>free up some of the collateral guidelines, so that they <clear begin="257.30s"/>can take some of their assets, pledge that to the <clear begin="259.33s"/>ECB to get additional funding. So it depends if we're <clear begin="263.04s"/>looking at a liquidity crisis coming from the banks, or <clear begin="266.06s"/>if it's really more of a solvency crisis coming from <clear begin="269.11s"/>the nations themselves. So this week, we have been seeing <clear begin="272.56s"/>the ECB trying to defend where the interest rates have <clear begin="275.54s"/>been for Italy. Spain's bonds have been weakening pretty dramatically <clear begin="280.31s"/>as well. It looks like they have been intervening in <clear begin="282.52s"/>that market. Spain issued some new 10-year notes, just inside <clear begin="287.29s"/>7% last night, and 7% on the 10-year has kind <clear begin="290.46s"/>of been this litmus test that we have seen in <clear begin="292.39s"/>the market, where tighter than 7% as long as the <clear begin="295.93s"/>dynamics of the country look like they could be fixed <clear begin="298.31s"/>over time, i.e., Italy and Spain, if it's inside 7%, <clear begin="303.19s"/>they can probably work it out. But if all of <clear begin="305.03s"/>a sudden we start getting wider than 7%, now people <clear begin="307.90s"/>are starting to question whether or not those countries would <clear begin="310.05s"/>essentially go into a debt spiral, because the interest expense <clear begin="313.26s"/>that they have to pay on the debt that they <clear begin="315.34s"/>need to issue to fund their deficit, as well as <clear begin="317.38s"/>the debt that they need to issue to roll existing <clear begin="319.70s"/>debt as it comes due, becomes such that the interest <clear begin="322.68s"/>expense becomes more and greater, faster than what they'd ever <clear begin="326.80s"/>be able to grow out of with additional GDP. Glaser <clear begin="329.14s"/>: So does it concern you that even after the <clear begin="332.01s"/>installation of these new technocratic governments in Greece and in <clear begin="334.63s"/>Italy, that those spreads remain so elevated through this week? <clear begin="338.14s"/>Sekera : Yes, and essentially what we've seen is the <clear begin="340.18s"/>market keeps going back and keeps testing the ECB to <clear begin="342.97s"/>see if the ECB's resolve is really there. So, for <clear begin="346.61s"/>example, with that Spanish bond issue that was just auctioned, <clear begin="348.80s"/>it was auctioned I think at  6.98%. After it was <clear begin="353.38s"/>auctioned, it rallied maybe a good 40 basis points, but <clear begin="356.79s"/>then throughout the rest of the day we kept seeing <clear begin="358.97s"/>it weaken and weaken further until it got back to <clear begin="361.59s"/>that 7%; by the end of the day it looked <clear begin="363.91s"/>like it traded maybe just inside that 7%. Same with <clear begin="367.22s"/>the Italian 10-year bonds; we initially saw that blow way <clear begin="370.35s"/>through 7% up to 7.4%, it came back in to <clear begin="374.34s"/>maybe the six-handle area before it widened back out and <clear begin="377.63s"/>then came back in again. So, the ECB is definitely <clear begin="380.36s"/>out there. Well, in my opinion, from what I have <clear begin="382.59s"/>heard, it appears that the ECB is in there trying <clear begin="385.43s"/>to defend those markets, trying to keep them inside that <clear begin="388.06s"/>7%, trying to make sure that there is enough room <clear begin="392.07s"/>that the technocrats, as you want to call it, will <clear begin="395.29s"/>have the ability to come in, put in structural reforms, <clear begin="398.66s"/>put in some austerity measures , really be able to come <clear begin="403.00s"/>in with a couple of different avenues to try and <clear begin="405.60s"/>bring their finances under control. But they need enough time <clear begin="408.51s"/>to do that, which is part of what the EFSF <clear begin="411.71s"/>was originally supposed to do, was to be able to <clear begin="414.40s"/>go out and buy bonds in the secondary market. Part <clear begin="418.94s"/>of the latest package was that they were going to <clear begin="420.73s"/>try and lever that up so that you could use <clear begin="422.70s"/>that in order to bridge and backstop sovereign debt issuance <clear begin="426.06s"/>as well as then try and recapitalize the banks if <clear begin="428.41s"/>the European banks couldn't recapitalize in the secondary market. We're <clear begin="432.53s"/>still waiting to see details on that plan. So, I <clear begin="434.89s"/>am still skeptical that that plan really comes through at <clear begin="437.81s"/>the end of the day. Glaser : So, given all <clear begin="439.49s"/>of this, for investors who may want to be buying <clear begin="441.82s"/>U.S. corporates now, are there certain areas of maturity that <clear begin="445.37s"/>look more attractive or certain sectors that look more attractive <clear begin="448.09s"/>than others? Where would be a good place to put <clear begin="450.02s"/>money to work? Sekera : On the curve, probably the <clear begin="452.60s"/>seven-year duration is probably the most attractive to us at <clear begin="455.82s"/>this point. It's where you get the greatest pickup on <clear begin="458.28s"/>the yield curve without going too far out on the <clear begin="460.53s"/>yield curve. The high-quality names definitely look good. Single-A or <clear begin="465.29s"/>better is probably a good spot to be in right <clear begin="467.59s"/>now. It gives you additional yield pickup. You can probably <clear begin="470.06s"/>pick up 150 basis points to 200 basis points over <clear begin="473.77s"/>Treasuries. But it's still a very high-quality name, and even <clear begin="477.37s"/>in a downturn, you should have a lot less risk <clear begin="479.84s"/>in those single-As than the BBBs. The BBBs at the <clear begin="483.62s"/>250 to 300 range might look attractive, but those bonds <clear begin="488.77s"/>are going to be the ones that get hit the <clear begin="490.15s"/>hardest if we do see any kind of systemic risk <clear begin="493.12s"/>in the system coming out of Europe. Glaser : Well, <clear begin="495.31s"/>Dave, I really appreciate your insight today. Sekera : You're <clear begin="497.46s"/>welcome. Good to be here. Glaser : For Morningstar, I'm <clear begin="499.79s"/>Jeremy Glaser. </smilText>
        ],
        metaq : []
    };

    Sample.searchData = {
        query : "brown fox",
        results : [
            {
                start: 10,
                text :   [
                    {
                        start : 10,
                        text : "The"
                    },
                    {
                        start : 11,
                        text : "quick"
                    },
                    {
                        start : 12,
                        match : true,
                        text : "brown"
                    },
                    {
                        start : 13,
                        match : true,
                        text : "fox"
                    },
                    {
                        start : 14,
                        text : "jumps"
                    },
                    {
                        start : 15,
                        text : "over"
                    },
                    {
                        start : 16,
                        text : "the"
                    },
                    {
                        start : 17,
                        text : "lazy"
                    },
                    {
                        start : 18,
                        text : "dog"
                    }

                ]
            }
        ]
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

        this.dispatcher = Ramp.dispatcher(video);
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
        statusThrottleMSec : 500,
        fpConfig : {
            clip : {
                scaling : "fit"
            }
        }
    };

    var FlowPlayer = function (el, url, options){

        if( !(this instanceof FlowPlayer ))
            return new FlowPlayer(el, url, options);

        this.config = $.extend(true, {}, defaults, options);

        this.dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this.dispatcher.attach(this);

        this._iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        this.__seeking = null;
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = true;

        this._pageSetup(el);

        this.__preload = this.config.preload;
        this.__autoplay = this.config.autoplay;
        this.__src = null;

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        var self = this;
        this._flowplayer.onLoad( function () {
            self._onLoad();
        });

        this.video = this.getInterface();

        if( Ramp.playlist )
            Ramp.playlist(this.video, url);
        else
            this.src(url);

    };

    Ramp.flowplayer = function (el, url, options) {
        var player = FlowPlayer(el, url, options);
        player.video._player = player;
        return player.video;
    };

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
                var config = $.extend(true, {
                    clip : {
                        autoPlay: false,
                        autoBuffering: true
                    }
                },this.config.fpConfig);
                var v = $('<div class="metaplayer-video""></div>');
                $(el).append(v);
                this._flowplayer = $f( v.get(0), {
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
            if( this.__src )
                this.src( this.__src );

            self.dispatch('loadstart');

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
            return status.muted;
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

        getInterface : function () {
            var target = Ramp.Utils.Proxy.getProxyObject( this._flowplayer.getParent() );

            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted seeking seekable" +
                " paused played controls autoplay preload src ended readyState",
                target, this);

            Ramp.Utils.Proxy.proxyFunction("load play pause canPlayType" ,this, target);

            Ramp.Utils.Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange ended ",this, target);

            return target;
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