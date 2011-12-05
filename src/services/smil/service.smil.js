(function () {

    var defaults = {
        playlistService : "/device/services/mp2-playlist?e={e}"
    };

    var SmilService = function (options) {
        if( ! (this instanceof SmilService ))
            return new SmilService(options);
        this.config = $.extend({}, defaults, options);
        Ramp.EventDispatcher(this);

        this.observable('metadata');
        this.observable('transcodes');
        this.observable('captions');
        this.observable('tags');
        this.observable('metaq');
        this.observable('related');
        this.observable('mediaChange');
    };

    SmilService.prototype = {

        load : function (mediaId, rampHost) {

            if( this.mediaId )
                this.dispatch('mediaChange');

            this.mediaId = mediaId;

            if( rampHost )
                this.lastHost = rampHost;

            var host = this.lastHost || rampHost;
            var url = host + this.config.playlistService.replace(/{e}/, mediaId);

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
                    this.dispatch('metadata', data.metadata);
                    this.dispatch('related', data.related);
                    this.dispatch('transcodes', data.transcodes);
                    this.dispatch('captions', data.captions);
                    this.dispatch('tags', data.tags);
                    this.dispatch('metaq', data.metaq);
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
                    var text =  param.text();
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


        search : function (str) {
            throw "not implemented"; // ...
        }
    };


    SmilService.parseCaptions = function (xml) {
        // static factory constructor
        var nodes = $(xml).contents();
        var cues  = [
        ];

        var current = {
            text : '',
            start: 0,
            end: null,
            offset : 0
        };

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
                    throw "unsupported tag";
                // unsupported...
            }
        });
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

    SmilService.resolveType = function ( url ) {
        var ext = url.substr( url.lastIndexOf('.') + 1 );
        if( ext == "ogv")
            ext = "ogg";
        return "video/"+ext;
    };

    Ramp.prototype.service = function (options) {
        this.service = SmilService(options);
        return this;
    };

})();