(function () {

    var $ = jQuery;

    var defaults = {
        msQuotes : true,
        forceRelative : false,
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

    MetaPlayer.ramp = function (options) {
        return SmilService(null, options);
    };

    MetaPlayer.addPlugin("ramp", function (options) {
        this.service = SmilService(this.video, options);
    });

    SmilService.prototype = {
        _onTrackChange : function (e, track) {
            if(! track ) {
                return;
            }

            if( typeof track == "string" ) {
                track = this.parseUrl(track);
            }

            if( track && track.rampId ){
                this.load(track);
                e.preventDefault();
            }
        },

        load : function ( track  ) {

            // parse format:  "ramp:publishing.ramp.com/ramp:1234"
            if( typeof track == "string" ) {
                track = this.parseUrl(track);
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
                type : this.resolveType( video.attr('src') ),
                url : video.attr('src')
            });

            var transcodes = $(node).find("metadata[xml\\:id^=transcodes]");
            transcodes.find('meta').each(function (i, transcode){
                var code = $(transcode);
                media.transcodes.push({
                    name : code.attr('name'),
                    type : code.attr('type') || this.resolveType( code.attr('content') ),
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
                    var text =  self.deSmart( param.text() );
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
            media.captions = this.parseCaptions(smilText);

            return media;
        },

        search : function ( query, callback, scope) {

            var url = this._data.metadata.searchapi;

            if( this.config.forceRelative ) {
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
                if( callback )
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
                    var results = this.parseSearch(response);
                    this.dispatch("search", results);
                    if( callback )
                        callback.call(scope, results);
                }
            });
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
                ret.query.push( self.deSmart( $(this).text() ) );
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
                        text : self.deSmart( el.text() )
                    })
                });
                ret.results.push(s);
            });
            return ret;
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