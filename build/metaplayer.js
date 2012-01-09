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
    window.Ramp = {
        wrap : function (method, object) {
            return function () {
                method.apply(object || this, arguments);
            };
        }
    };
    Ramp.Players = {};
    Ramp.Services = {};
    Ramp.Views = {};
    Ramp.UI = {};
    Ramp.Utils = {};
    Ramp.Models = {};
})();

(function () {

    var $ = jQuery;

    var defaults = {
        autoLoad : true,
        related: true,
        loop : false,
        dispatcher : null
    };

    var Playlist = function (urls, options) {
        if( ! (this instanceof Playlist) )
            return new Playlist(urls, options);

        if( urls instanceof Object && ! (urls instanceof Array )){
            options = urls;
            urls = null;
        }

        this.config = $.extend({}, defaults, options);

        this._tracks = [];
        this.__index = 0;
        this.__loop = this.config.loop;

        this.autoLoad = this.config.autoLoad;

        Ramp.Utils.Proxy.mapProperty("index loop", this);

        this.dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this.onPlaylistChange = this.dispatcher.observer("playlistChange");
        this.onTrackChange = this.dispatcher.observer("trackChange");
        this.dispatcher.attach(this);

        if( urls )
            this.add(urls);
    };

    Ramp.playlist = Playlist;
    Ramp.Models.Playlist = Playlist;

    Playlist.prototype = {
        _interface : "empty queue next previous track tracks nextTrack nextTrackIndex onPlaylistChange onTrackChange",

        attach : function (target) {
            var self = this;
            var methods = this._interface.split(/\s+/g);

            $.each(methods, function (i, key) {
                var val = self[key];
                if( key[0] == "_" || ! (val instanceof Function))
                    return;
                target[key] = function () {
                    return self[key].apply(self, arguments);
                }
            });

            Ramp.Utils.Proxy.mapProperty("index loop", target, this);
        },

        empty : function ( tracks ) {
            this._tracks = [];
            this.index = 0;
            this.dispatcher.dispatch("playlistChange");
        },

        queue : function ( tracks ) {
            if( ! (tracks instanceof Array) )
                tracks = [tracks];

            var wasEmpty = this._tracks.length == 0;

            var self = this;
            $(tracks).each( function (i, track) {
                self._addTrack(track, true)
            });

            this.dispatcher.dispatch("playlistChange");

            if( wasEmpty )
                this.dispatcher.dispatch("trackChange");
        },

        _addTrack : function ( track, trackChange ) {
            if(typeof track == "string" )
                track = { url : track };
            this._tracks.push(track);
        },

        _index : function ( i ) {
            if( i != undefined ) {
                i = i % this._tracks.length;
                var old = i;
                this.__index = i;
                this.dispatcher.dispatch("trackChange");
            }
            return this.__index;
        },

        _loop : function ( val ) {
            if( val !== undefined )
                this.__loop = val;
            return this.__loop;
        },

        track : function (i){
            if( i === undefined )
                i = this.index;
            return this._tracks[i];
        },

        tracks : function () {
            return this._tracks;
        },

        nextTrack : function () {
            return this.track( this.nextTrackIndex() );
        },

        nextTrackIndex : function () {
            var i = this.index;
            if( i + 1 < this._tracks.length )
                i++;
            else if(! this.__loop )
                return null;
            else
                i = 0;
            return i;
        },

        next  : function () {
            var i = this.nextTrackIndex();
            if( i !== null )
                this.index = i;
        },

        previous : function () {
            var i = this.index;
            if( i - 1 >= 0 )
                i--;
            else if(! this.__loop )
                return;
            else
                i = this._tracks.length - 1;
            this.index = i;
        }
    };

})();

(function () {
    var $ = jQuery;

    var EventDispatcher = function (target){
        if( ! (this instanceof EventDispatcher ))
            return new EventDispatcher(target);
        this._listeners = {};
        this._observed = {};

        if( target )
            this.attach(target);
    };

    Ramp.Utils.EventDispatcher = EventDispatcher;

    EventDispatcher.prototype = {
        _interface : "listen forget dispatch addEventListener removeEventListener dispatchEvent",

        attach : function (target) {
            var names = this._interface.split(/\s+/g);
            var i, name;
            for(i = 0; i < names.length; i++ ) {
                name = names[i];
                target[name] = this._wrap(name);
            }
        },

        _wrap : function(name) {
            var self = this;
            return function () {
                return self[name].apply(self, arguments);
            }
        },

        listen : function ( eventType, callback, scope, data) {
            if( ! this._listeners[eventType] )
                this._listeners[eventType] = [];

            this._listeners[eventType].push({
                fn : callback,
                scope : scope,
                data: data
            })
        },

        forget : function (type, callback) {
            var l = this._listeners[type];
            if( ! l )
                return;
            var i;
            for(i=l.length - 1; i >= 0; i-- ){
                if( l[i].fn = callback ) {
                    l.splice(i, 1);
                }
            }
        },

        dispatch : function (eventType, data, eventObject) {
            var l = this._listeners[eventType];

            if( ! eventObject )
                eventObject = {};

            eventObject.type = eventType;
            eventObject.source = this;

            if( data !== undefined)
                eventObject.data = data;

            if( this._observed[eventType] !== undefined )
                this._observed[eventType] = data || true;

            if( ! l )
                return;

            for(var i=0; i < l.length; i++ ){
                l[i].fn.call(l[i].scope || this, eventObject, l[i].data )
            }
        },

        // makes myobject.eventtype(fn) listen for event
        // and trigger callback with data immediately, if mapped property not null
        // useful for object that load data synchronously
        // syntax based on jQuery events:  $(element).click( callback );
        observer : function (eventType) {
            this._observed[eventType] = null;
            var self = this;
            return function (callback, scope) {
                var listener = function (e) {
                    callback.call(scope , self._observed[eventType] );
                };
                self.listen(eventType, listener);
                if( self._observed[eventType] !== null )
                    setTimeout(listener, 0);
            };
        },

        // traditional event apis
        addEventListener : function (eventType, callback) {
            this.listen(eventType, callback);
        },

        removeEventListener : function (type, callback) {
            this.forget(type, callback);
        },

        dispatchEvent : function (event) {
            if( ! (event instanceof Object) )
                throw "invalid event";
            this.dispatch(event.type, null, event);
        }

    }

})();
(function () {

    Ramp.Utils.Format = {
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
                var d = Ramp.Utils.EventDispatcher();
                d.attach(target);
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
        }

    };

    if( ! window.Ramp )
        window.Ramp = {};

    if( ! Ramp.Utils )
        Ramp.Utils = {};

    Ramp.Utils.Proxy = Proxy;


})();

(function () {

    var $ = jQuery;

    Ramp.Utils.Script = {

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

    Ramp.Timer = function (delay, count) {
        if( ! (this instanceof Ramp.Timer ) )
            return new Ramp.Timer(delay, count);

        var self = this;
        Ramp.Utils.EventDispatcher(this);
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

    Ramp.Timer.prototype = {
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

    Ramp.UI = {
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
        jsonService : "/{e}.json"
    };

    var JsonService = function (url, options) {
        if( ! (this instanceof JsonService ))
            return new JsonService(url, options);

        if( options == undefined && (url instanceof Object) ){
            options = url;
            url = null;
        }

        this.config = $.extend({}, defaults, options);

        var dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        dispatcher.attach(this);

        this.onMetaData = dispatcher.observer("metaData");
        this.onTranscodes = dispatcher.observer("transcodes");
        this.onCaptions = dispatcher.observer("captions");
        this.onTags = dispatcher.observer("tags");
        this.onMetaQ = dispatcher.observer("metaQ");
        this.onRelated = dispatcher.observer("related");
        this.onMediaChange = dispatcher.observer("mediaChange");

        if( url )
            this.load( url );
    };


    Ramp.data = function (url, options) {
        return JsonService(url, options);
    };

    JsonService.prototype = {
        _interface : "onMetaData onTranscodes onCaptions onTags onMetaQ onRelated onMediaChange",


        attach : function (target) {
            var self = this;
            var methods = this._interface.split(/\s+/g);
            $.each(methods, function (i, key) {
                var val = self[key];
                if( key[0] == "_" || ! (val instanceof Function))
                    return;
                target[key] = function () {
                    return self[key].apply(self, arguments);
                }
            });
        },

        parse : function (str) {
            return jQuery.parseJSON(str);
        },

        load : function ( o  ) {

            // parse format:  "ramp:publishing.ramp.com/ramp:1234"
            if( typeof o == "string" ) {
                o = JsonService.parseUrl(o);
            }
            else if( o.url && ! o.rampId ) {
                JsonService.parseUrl(o.url, o);
            }

            if( ! o.rampId )
                throw "invalide media id";

            if( this.mediaId )
                this.dispatch('mediaChange');

            this.mediaId = o.rampId;

            if( o.rampHost )
                this.lastHost = o.rampHost;

            var url = this.lastHost + this.config.jsonService.replace(/{e}/, this.mediaId);

            $.ajax(url, {
                dataType : "json",
                timeout : 5000,
                context: this,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load  error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    var data = response;
                    this.dispatch('metadata', data.metadata);
                    this.dispatch('related', data.related);
                    this.dispatch('transcodes', data.transcodes);
                    this.dispatch('captions', data.captions);
                    this.dispatch('tags', data.tags);
                    this.dispatch('metaq', data.metaq);                }
            });
        },

        search : function (str) {
            throw "not implemented"; // ...
        }
    };


    JsonService.parseUrl = function ( url, obj ) {
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


})();(function () {

    var $ = jQuery;

    var defaults = {
        playlistService : "/device/services/mp2-playlist?e={e}"
    };

    var SmilService = function (url, options) {
        if( ! (this instanceof SmilService ))
            return new SmilService(url, options);

        if( options == undefined && (url instanceof Object) ){
            options = url;
            url = null;
        }

        this.config = $.extend({}, defaults, options);

        var dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        dispatcher.attach(this);

        this.onMetaData = dispatcher.observer("metaData");
        this.onTranscodes = dispatcher.observer("transcodes");
        this.onCaptions = dispatcher.observer("captions");
        this.onTags = dispatcher.observer("tags");
        this.onMetaQ = dispatcher.observer("metaQ");
        this.onRelated = dispatcher.observer("related");
        this.onMediaChange = dispatcher.observer("mediaChange");
        this.onSearch = dispatcher.observer("search");

        if( url )
            this.load( url );
    };

    SmilService.msQuotes = true;
    SmilService.rebase = true;

    Ramp.Services.SmilService = SmilService;

    Ramp.data = function (url, options) {
        return SmilService(url, options);
    };


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
        _interface : "onMetaData onTranscodes onCaptions onTags onMetaQ onRelated onMediaChange",

        attach : function (target) {
            var self = this;
            var methods = this._interface.split(/\s+/g);
            $.each(methods, function (i, key) {
                var val = self[key];
                if( key[0] == "_" || ! (val instanceof Function))
                    return;
                target[key] = function () {
                    return self[key].apply(self, arguments);
                }
            });
        },

        load : function ( o  ) {

            // parse format:  "ramp:publishing.ramp.com/ramp:1234"
            if( typeof o == "string" ) {
                o = SmilService.parseUrl(o);
            }
            else if( o.url && ! o.rampId ) {
                SmilService.parseUrl(o.url, o);
            }

            if( ! o.rampId )
                throw "invalide media id";

            if( this.mediaId )
                this.dispatch('mediaChange');

            this.mediaId = o.rampId;

            if( o.rampHost )
                this.lastHost = o.rampHost;

            var host = this.lastHost || rampHost;
            var url = host + this.config.playlistService.replace(/{e}/, this.mediaId);

            var params = {
//                format: 'playlist',
//                renderJSON: true
            };

            $.ajax(url, {
                dataType : "xml",
//                jsonp : "jsoncallback",
                timeout : 5000,
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load playlist error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    var data = this.parse(response);
                    data.metadata.host = host;
                    this._data = data;
                    this.dispatch('metaData', data.metadata);
                    this.dispatch('transcodes', data.transcodes);
                    this.dispatch('captions', data.captions);
                    this.dispatch('tags', data.tags);
                    this.dispatch('metaQ', data.metaq);
                    this.dispatch('related', data.related);
                }
            });
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
                type : "video/" + video.attr('type'),
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
                timeout : 5000,
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
    }

    SmilService.resolveType = function ( url ) {
        var ext = url.substr( url.lastIndexOf('.') + 1 );
        if( ext == "ogv")
            ext = "ogg";
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
        controls : true
    };

    var Html5Player = function (el, url, options ){

        if( !(this instanceof Html5Player ))
            return new Html5Player(el, url, options);

        this.config = $.extend({}, defaults, options);

        this._dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        this._dispatcher.attach(this);

        this._transcodes = [];
        this._haveRelated = false;

        this.advance = this.config.autoAdvance;


        // set up playlist, have it use our event dispatcher
        this.service = Ramp.data({
            dispatcher : this._dispatcher
        });
        this.service.attach(this);

        // set up playlist, have it use our event dispatcher
        this.playlist = Ramp.playlist({
            dispatcher : this._dispatcher,
            loop : this.config.loop
        });
        this.playlist.attach(this);

        this._createMarkup( el);
        this._addListeners();
        this._addMediaListeners();

        if( url )
            this.playlist.queue(url);

    };


    Ramp.html5 = function (el, url, options) {
        var player = Html5Player(el, url, options);
        player.video._player = player;
        return player.video;
    };

    Ramp.metaplayer = Ramp.html5;
    Ramp.Players.Html5Player = Html5Player;

    Html5Player.prototype = {

        load : function () {
            if( this.config.applySources )
                this._addSources();

            if( this.config.selectSource )
                this._selectSource();

            this.config.preload = true; // can be called before transcodes available

            this.video.load();
        },

        decorate : function (el) {
            var  mapProperty =  Ramp.Utils.Proxy.mapProperty;
            var proxyFunction =  Ramp.Utils.Proxy.proxyFunction;
            mapProperty('index service', el, this);
            proxyFunction('next previous track tracks', this, el);
        },

        _createMarkup : function ( parent ) {
            var p = $(parent);
            if( p.is('video') ) {
                this.video = p.get(0);
            }
            else {
                var video = document.createElement('video');
                video.autoplay = this.config.autoplay;
                video.preload = this.config.preload;
                video.controls = this.config.controls;
                video.muted = this.config.muted;
                video.style.position = "absolute";
                video.style.top = 0;
                video.style.left = 0;
                video.style.width = "100%";
                video.style.height = "100%";
                this.video = video;
                p.append(video);
            }

            this.decorate(this.video);
            Ramp.UI.ensureOffsetParent( this.video );
        },

        _addListeners : function () {
            this.onTrackChange(this._onTrackChange, this);
            this.onMetaData(this._onMetaData, this);
            this.onTranscodes(this._onTranscodes, this);
            this.onRelated(this._onRelated, this);
        },

        _onTrackChange : function () {
            this.service.load( this.playlist.track()  )
        },

        _onMetaData : function (metadata) {
            $.extend( this.track(), metadata );
        },

        _onRelated : function (related) {
            if( this._haveRelated || ! this.config.related )
                return;
            this.playlist.queue( related );
            this._haveRelated = true;
        },

        _onTranscodes : function (transcodes) {
            this._transcodes = transcodes;
            if( this.config.preload )
                this.load();
        },

        _children : function () {
            if( this.video.children.length )
                return this.video.children;

            var t = this.track();
            var src = document.createElement('source');
            src.setAttribute('type', "video/ramp");
            src.setAttribute('src', t.url);
            return [src];
        },

        canPlayType : function (type) {
            if( type == "video/ramp" )
                return "probably";
            else
                return this.video.canPlayType(type);
        },

        _src : function (val) {
            if( val !== undefined ) {
                this.playlist.clear();
                this.playlist.queue(val);
            }
            return this.track().src;
        },

        _addSources : function () {
            var media = $(this.video);
            media.find('source').remove();
            $.each(this._transcodes, function (i, source) {
                var src = document.createElement('source');
                src.setAttribute('type', source.type);
                src.setAttribute('src', source.url);
                media.append(src);
            });
        },

        _selectSource : function () {
            var media = this.video;
            $.each(this._transcodes, function (i, source) {
                if( media.canPlayType(source.type) ){
                    media.src = source.url;
                    return false;
                }
            });
        },

        _addMediaListeners : function () {
            var self = this;
            $(this.video).bind('ended', function(){
                self._onEnded()
            });
            $(this.video).bind('playing', function(){
                self.autoplay = true;
            });
        },

        _onEnded : function () {
            if(! this.advance )
                return;
            this.autoplay = true;
            this.playlist.next();
        },


        decorate : function (obj) {
            Ramp.Utils.Proxy.mapProperty("index advance service",
                this.video, this);

            Ramp.Utils.Proxy.proxyFunction("next previous track tracks queue clear " +
                "nextTrack nextTrackIndex onPlaylistChange onTrackChange",this, this.video);

            Ramp.Utils.Proxy.proxyEvent("trackChange playlistChange ",this, this.video);
        }


    };

})();(function () {

    var $ = jQuery;
    var $f = window.flowplayer;

    var defaults = {
        autoplay : false,
        preload : true,
        advance : true,
        related: true,
        loop : false,
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

        // set up service, have it use our event dispatcher
        this.service = Ramp.data({
            dispatcher : this.dispatcher
        });
        this.service.attach(this);
        this.onPlaylistChange = this.dispatcher.observer("playlistChange");
        this.onTrackChange = this.dispatcher.observer("trackChange");

        this.__seeking = null;
        this.__readyState = 0;
        this.__ended = false;
        this.__paused = true;

        this._pageSetup(el);
        this._addServiceListeners();

        this.__preload = this.config.preload;
        this.__autoplay = this.config.autoplay;
        this.__loop = this.config.loop;
        this.__advance = this.config.advance;
        this.__src = url;

        this._statepoll = Ramp.Timer(250);
        this._statepoll.listen('time', this._onPlayStatePoll, this);

        this._timeupdater = Ramp.Timer(250);
        this._timeupdater.listen('time', this._onTimeUpdate, this);

        var self = this;
        this._flowplayer.onLoad( function () {
            self._onLoad();
        });
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
                var v = $('<div class="mp-video""></div>');
                $(el).append(v);
                this._flowplayer = $f( v.get(0), {
                    src: this.config.swfUrl,
                    wmode: this.config.wmode
                }, config );
            }
            this.video = this._flowplayer.getParent();
            this.decorate(this.video);
            Ramp.UI.ensureOffsetParent( this.video );
        },

        _addServiceListeners : function () {
            this.service.onMetaData(this._onMetaData, this);
            this.service.onTranscodes(this._onTranscodes, this);
            this.service.onRelated(this._onRelated, this);
        },


        _onMetaData : function (metadata) {
            // update clip title, desc, etc
            this._metadata = metadata;
        },

        _onRelated : function (related) {
            if( this._hasPlaylist || ! this.config.related )
                return;

            this._hasPlaylist = true;
            var fp = this._flowplayer;
            $.each(related, function (i, rel) {
                fp.addClip({
                    autoBuffering : true,
                    autoPlay : true,
                    title : rel.title,
                    description : rel.description,
                    thumbnail : rel.thumbnail,
                    url : "ramp::"+rel.rampId
                });
            });
        },

        _onTranscodes : function (transcodes) {
            var obj = {
                autoBuffering: true,
                url : this.src(),
                title : this._metadata.title,
                description : this._metadata.description,
                thumbnail : this._metadata.thumbnail
            };

            $.each(transcodes, function (i, t) {
                if( t.name == "default")
                    obj.url = t.url;
                if( t.name == "ios.stream")
                    obj.iosUrl = t.url;
            });


            var clip = this._flowplayer.getClip();
            if( clip ) {
                clip.update(obj);
            }
            else {
                this._flowplayer.setPlaylist([
                    obj
                ]);
            }

            if( this.autoplay() )
                this.play();
            else if ( this.preload() )
                this.load();
        },

        _onLoad : function () {
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

            // Common Clip listeners
            var common = this._flowplayer.getCommonClip();

            common.onBeforeBegin( function (clip) {
                if( clip.url && clip.url.indexOf('ramp:') == 0) {
                    if( ! self.preload() && ! clip.autoBuffering ) {
                        // flowplayer.startBuffering() or flowplayer.play() called,
                        // we don't know which, so assume play()
                        self.autoplay(true);
                        self.preload(true);
                    }
                    self.service.load(clip.url);
                    return false;
                }
                else if( ! clip.url && this.src() ) {
                    return false;
                }
                self.dispatch('trackChange');
                self.dispatch('loadstart');
                return true;
            });


            common.onBegin( function (clip) {
                self._flowplayer.setVolume(100);
                self._flowplayer.unmute();
                // if not autoplay, then it's not safe to seek until we get a pause
            });

            common.onStart( function (clip) {
                self._setReady();
                self._setPlaying(true);

                self.dispatch('loadeddata');
                self.__duration = clip.duration;
                self.dispatch("durationchange");
                self.dispatch('loadedmetadata');
            });

            common.onStop( function (clip) {
                // this fires some times while play-seeking, not useful.
                // self._setPlaying(false);
            });

            common.onFinish( function (clip) {
                self.__ended = true;
                self.__seeking = null;
                self._setPlaying(false);
                var pl = self._flowplayer.getPlaylist();

                if( ! self.advance() ) {
                    self._flowplayer.stop();
                }
                else if( clip.index + 1 == pl.length ) {
                    self.dispatch("playlistComplete");
                    if( self.loop() ) {
                        self._flowplayer.play(0);
                    }
                    else {
                        self._flowplayer.stop();
                    }
                }

                self.dispatch("ended");

                // force advance the player, since pause() or seek()
                // in the ended handlers can prevent default advance
                self._flowplayer.play(clip.index+1);
            });

            common.onPause( function (clip) {
                self._setPlaying(false);
                self._setReady();
            });

            common.onResume( function (clip) {
                self._setPlaying(true);
                self.dispatch("play");
            });

            common.onBeforeSeek( function (clip) {
                self.dispatch("seeking");
                self.dispatch("timeupdate");

                // fp doesn't do seeks while paused until it plays again, so we fake
                if( self.paused() )  {
                    self.dispatch("seeked");
                    self.__seeking = null;
                }
            });

            common.onSeek( function (clip) {
                self.__seeking = null;
                if( ! self.paused() )
                    self.dispatch("seeked");
            });

            this.controls( this.config.controls );

            if( this.src() ) {
                this.service.load( this.src() ); // loads related
            }
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
            if( this._flowplayer.isLoaded() ) {
                if( this.autoplay() ){
                    this._flowplayer.play();
                }
                else {
                    this._flowplayer.startBuffering();
                }
            }
            else {
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
            return "probably";
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
            if( val !== undefined )
                this._flowplayer.setVolume(val * 100);
            return this._flowplayer.getVolume() / 100;
        },

        controls : function (val) {
            if( ! this._flowplayer.isLoaded() ) {
                if( val !== undefined )
                    this.config.controls = val;
                return this.config.controls;
            }

            if( val !== undefined ){
                if( val ) {
                    this._flowplayer.getControls().show();
                    this._flowplayer.getPlugin("play").show();
                }
                else {
                    this._flowplayer.getControls().hide();
                    this._flowplayer.getPlugin("play").hide();
                }
            }
            return this._flowplayer.getControls().opacity != 1;
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
                if( this._flowplayer.isLoaded() ) {
                    this._flowplayer.setPlaylist([src]);
                }
            }
            return this.__src;
        },

        readyState : function (val) {
            if( val !== undefined )
                this.__readyState = val;
            return this.__readyState;
        },

        _children : function () {
            var sources = [];
            var src = document.createElement('source');
            src.setAttribute('type', "video/ramp");
            src.setAttribute('src', this.src);
            return [src];
        },

        /* Playlist Interface */

        index : function (i) {
            var clip =  this._flowplayer.getClip();
            if( ! clip )
                return 0;

            if( i == undefined )
                return clip.index; // Player.getIndex() is buggy

            var paused = this.paused();

            i = this._resolveIndex(i);
            this._flowplayer.play(i);

            if( paused )
                this._flowplayer.pause();

            return i;
        },

        _resolveIndex : function (i) {
            var pl = this._flowplayer.getPlaylist();
            if( i < 0  )
                i = pl.length + i;
            if( this.loop() )
                i = i % pl.length;
            if( i >= pl.length || i < 0) {
                return;
            }
            return i;
        },

        advance : function (bool) {
            if( bool !== undefined ) {
                this.__advance = bool;
            }
            return this.__advance;
        },

        queue : function ( media ) {
            this._flowplayer.addClip( media );
        },

        clear: function (){
            this._flowplayer.play([]);
        },

        next : function () {
            this.index( this.index() + 1);
        },

        previous : function () {
            this.index( this.index() - 1);
        },

        nextTrack : function () {
            return this.track( this.nextTrackIndex() );
        },

        nextTrackIndex : function () {
            return this._resolveIndex(this.index() + 1);
        },

        track : function (i) {
            if( i == undefined )
                i = this.index();
            var pl = this._flowplayer.getPlaylist();
            return pl[ this._resolveIndex(i) ];
        },

        tracks : function () {
            return this._flowplayer.getPlaylist();
        },

        decorate : function (obj) {
            Ramp.Utils.Proxy.mapProperty("duration currentTime volume muted seeking seekable" +
                " paused played controls autoplay preload src ended index advance readyState" +
                " children service",
                this.video, this);

            Ramp.Utils.Proxy.proxyFunction("load play pause canPlayType " +
                "next previous track tracks queue clear " +
                "nextTrack nextTrackIndex onPlaylistChange onTrackChange",this, this.video);

            Ramp.Utils.Proxy.proxyEvent("timeupdate seeking seeked playing play pause " +
                "loadeddata loadedmetadata canplay loadstart durationchange volumechange ended " +
                "trackChange playlistChange ",this, this.video);
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

    var $ = jQuery;
    var Popcorn = window.Popcorn;

    var defaults = {
        subtitles : true
    };

    var PopcornLoader = function (player, service, options) {

        if( !(this instanceof PopcornLoader) )
            return new PopcornLoader(player, service, options);

        if( ! (window.Popcorn && Popcorn instanceof Function) )
            return;

        if( player.getTrackEvent )
            this.popcorn = player;
        else if( player.popcorn )
            this.popcorn = player.popcorn;
        else {
            this.popcorn = Popcorn(player);
            player.popcorn = this.popcorn;
        }

        // two-argument constructor(player, options)
        if( options == undefined && player.service ) {
            options = service;
            service = player.service;
        }

        this.config = $.extend(true, {}, defaults, options);

        this.player = player;
        this.service = service;

        this._sequences = {};
        this.metaq = {};

        this.addDataListeners();
    };

    Ramp.metaq = function (player, options) {
        return PopcornLoader(player, options);
    };

    PopcornLoader.prototype = {
        addDataListeners : function () {
            if( ! this.service )
                return;
            this.service.onMetaData( this.onMetaData, this);
            this.service.onCaptions( this._onCaptions, this);
            this.service.onMetaQ( this._onMetaq, this);
        },

        _onCaptions : function (captions) {
            var self = this;
            if( this.config.subtitles )
                $.extend(this.metaq, { subtitle : captions });
        },

        _onMetaq : function (metaq) {
            var self = this;
            $.extend(this.metaq, metaq);
            this._renderPopcorn();
        },

        onMetaData : function () {
            // cleanup
            var events = this.popcorn.getTrackEvents();
            var self = this;
            $.each(events, function (i, e){
                self.popcorn.removeTrackEvent(e._id);
            });
            this.metaq = {};
        },

        _renderPopcorn : function () {
            var self = this;

            // clones
            $.each(this.config, function (btype, config){

                $.each(self.metaq, function (type, events){
                    $.each(events, function (i, options) {

                        if( type != btype  )
                            return;

                        if(! config.clone )
                            return;

                        var clones = config.clone.split(/\s+/);
                        $.each(clones, function (j, ctype) {

                            if( ! self.metaq[ctype] )
                                self.metaq[ctype] = [];

                            self.metaq[ctype].push( $.extend({}, options));
                        });
                    });
                });
            });

            // process overrides, sequences
            $.each(this.metaq, function (type, events){
                $.each(events, function (i, event){
                    events[i] =  self._composite(type, event);
                });
            });

            // schedule with popcorn instance
            $.each(this.metaq, function (type, events){
                $.each(events, function (i, options){
                    self._schedule(type, options);
                });
            });
        },

        _composite : function (type, options) {
            var c = this.config[type];
            if( ! c )
                return options;

            if( c.overrides )
                options = $.extend({},  options, c.overrides );

            if(  c.duration )
                options.end = options.start + c.duration;

            if( c.sequence ) {
                var last = this._sequences[c.sequence];
                if( last )
                    last.end = options.start;
                this._sequences[c.sequence] = options;
            }

            return options;
        },

        _schedule : function (type, options){
            var fn = this.popcorn[type];
            if( fn  )
                fn.call(this.popcorn, options);
        }
    };

})();