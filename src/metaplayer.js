/**
 * RAMP MetaPlayer 2
 * Requires jQuery, Flowplayer
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

    /**
     * Ramp
     * - services and metadata interface
     */
    Ramp = function (options, callbacks ){
        var defaultOptions = {
            host: null,
            playerWidgetPath : "FileResource/widgets/ramp/2.1/",
            playlistService : "/device/services/mp2-playlist?e={e}&jsoncallback=?",
            mediaId : null
        };

        this._media = {};
        this.options = $.extend(true, {}, defaultOptions, options);

        // playlist not loaded
        this.loaded = false;

//        this.addCallbacks(callbacks);
        return this;
    };

    Ramp.prototype = {

        getPlaylist : function  () {
            return this.playlist;
        },

//        addCallbacks : function (callbacks) {
//            // used for bulk adding of event listeners
//            for( var k in callbacks ){
//                this.listen(k, callbacks[k]);
//            }
//        },

        getMedia  : function ( host, mediaId, callback, data, scope ){
            var media = this._media[mediaId];
            if( media ){
                setTimeout( function () {
                    callback.call(scope, media, data);
                },0); // be safe, if they're counting on async
            }
            var url = host + this.options.playlistService.replace(/{e}/, mediaId);
            var params = {
//                format: 'playlist',
//                renderJSON: true
            };

            $.ajax(url, {
                dataType : "xml",
                jsonp : "jsoncallback",
                timeout : 5000,
//                crossDomain : true, // jsonp
                context: this,
                data : params,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load playlist error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    this._media[mediaId] = this.handleGetMedia(response);
                    callback.call(scope, this._media[mediaId], data);
                }
            });
        },

        handleGetMedia : function (data) {
            var playlist = [];
            var self = this;

            $(data).find('par').each(function () {

                var media = {
                    video : {
                        metadata : {}
                    },
                    transcodes : {},
                    jumptags : []
                };

                var video = $(this).find('video');
                media.video.type = video.attr('type');
                media.video.title = video.attr('title');
                media.video.src = video.attr('src');

                video.find('metadata meta').each( function (){
                    var meta = $(this);
                    media.video.metadata[ meta.attr('name') ] = meta.attr('content') || meta.text();
                });

                var transcodes = $(this).find('transcodes');
                transcodes.find('metadata meta').each(function (){
                    var meta = $(this);
                    media.transcodes[ meta.attr('name') ] = meta.attr('content') || meta.text();
                });

                var jumptags = $(this).find("seq[xml\\:id^=jumptags]");
                jumptags.find('ref').each(function (){
                    var tag = {};
                    $(this).find('param').each( function () {
                        var param = $(this);
                        tag[ param.attr('name') ] = param.text();
                    });
                    tag.timestamps = tag.timestamps.split(',');
                    media.jumptags.push(tag);
                });

                var smilText = $(this).find("smilText");
                media.captions = Ramp.Subtitles.fromSmil(smilText)

                playlist.push(media);
            });
            return playlist;
        }
    };

    // ============================================================== MetaPlayer()

    /**
     * Player
     * - interface / proxy class to standardize player functions, provide basic utilities
     * @param services
     */
    Ramp.Player = function ( instance ) {

        // expected method interface
        var _interface = {
            seek : "function",
            toggle : "function",
            status : "function",
            playing : "boolean",
            seeking : "boolean"
        };

        for( var key in _interface ){
            if( typeof instance[key] != _interface[key] ) {
               throw("Missing interface " + key);
            }
        }

        // Player Interface
        /*
        - playlist
        - playing state
        - model
        - standardized events
        - ramp events
        - popcorn interface
         */
        Ramp.EventDispatcher(instance)
    };

    // ============================================================== Timer()

    Ramp.Timer = function (delay, count) {
        if( ! (this instanceof Ramp.Timer ) )
            return new Ramp.Timer(delay, count);

        var self = this;
        Ramp.EventDispatcher(this);
        this.delay = delay;
        this.count = count || -1;
        this._counted = 0;
        this._onTimeout = function () {
            self._counted++;
            self.dispatch('time');
            if( self.count > 0 && self.count <= self._counted + 1 ){
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
        },

        start : function () {
            if(! this._interval )
                this._interval = setInterval(this._onTimeout, this.delay );
        }
    };


    // ============================================================== Subtitles()

    Ramp.Subtitles = function ( cues ) {
        if( ! cues ){
            cues = []
        }

        //return  array with mixed in methods
        return $.extend(cues, Ramp.Subtitles.prototype);
    };

    Ramp.Subtitles.parseSeconds = function (str) {
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


    Ramp.Subtitles.fromSmil = function (xml) {
        // static factory constructor
        var nodes = $(xml).contents();
        var cues  = Ramp.Subtitles([
            {
                text : '',
                start: 0,
                end: null,
                offset : 0
            }
        ]);

        var current = cues[0];


        var getStart = function (node, lastCue) {
            var el = $(node);
            var parseSeconds = Ramp.Subtitles.parseSeconds;

            var begin = el.attr('begin');
            if( begin != null )
                return parseSeconds(begin);

            var _next = el.attr('next');
            if( _next != null )
                return parseSeconds(_next) + lastCue.start;
        };

        var handleNode = function (node, text) {
            current.end = getStart(node);
            current = {
                text: text,
                start : current.end,
                offset : current.offset+1
            };
            cues.push(current);
        };

        nodes.each( function ( i, node ){
            var text = nodes[i].data;
            if( node.tagName === undefined ){
                current.text += text;
                return;
            }

            switch (node.tagName) {
                case "smil:clear":
                case "clear":
                    handleNode(node, "");
                    break;

                case "smil:tev":
                case "tev":
                    handleNode(node, current.text );
                    break;

                case "smil:br":
                case "br":
                    handleNode(node, current.text + "<br />" );
                    break;

                case "smil:div":
                case "smil:p":
                case "smil:span":
                default:
                    console.log("unsupported tag");
                    // unsupported...
            }
        });
        return cues;
    };



    Ramp.Subtitles.prototype = {
        _last : function (){
            return this[ this.length - 1];
        },
        transcript : function () {
            return $(this).map( function () { return this.text } ).toArray().join(" ").replace(/\s+/, ' ');
        }
    };


    // ============================================================== EventDispatcher()

    Ramp.EventDispatcher = function ( target, eventTypes ) {
        // use:   EventDispatcher( myObject);
        // myObject.listen( 'eventName', function (eventData, passThroughData) { this.doSomething() }, this, passThroughData)
        // myObject.dispatch('eventName', eventData);

        if( target._listeners )
            return;

        target._listeners = {};

        target.listen = function ( eventType, callback, scope, data ) {
            if( ! this._listeners[eventType] )
                 this._listeners[eventType] = [];

            this._listeners[eventType].push({
                fn : callback,
                scope : scope,
                data: data
            })
        };

        target.dispatch = function (eventType, eventObject) {
            if( ! this._listeners[eventType] )
                return;

            if( ! eventObject )
                eventObject = {};

            eventObject.type = eventType;
            eventObject.source = this;

            var l = this._listeners[eventType];
            if( ! l )
                return;

            for(var i=0; i < l.length; i++ ){
                l[i].fn.call(l[i].scope || this, eventObject, l[i].data )
            }
        };
    }

})();

