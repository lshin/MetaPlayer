(function () {

    var $ = jQuery;

    var defaults = {
    };

    var MrssService = function (url, options) {
        if( ! (this instanceof MrssService ))
            return new MrssService(url, options);

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


    if( ! window.Ramp )
        window.Ramp = {};

    Ramp.mrss = MrssService;
    Ramp.mrss = MrssService;

    MrssService.prototype = {

        load : function ( url  ) {

            if( url instanceof Object ) {
                // already loaded
                if( url.metadata ) {
                    this._ready(url);
                    return;
                }
                // load off the url
                url = url.url;
            }

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
                    var data = this.parse(response)
                    this._ready(data);
                }
            });
        },

        _ready : function (data) {
            this._data = data;
            this.dispatch('metaData', data.metadata);
            this.dispatch('transcodes', data.transcodes);
            this.dispatch('related', data.related);
//            this.dispatch('captions', data.captions);
//            this.dispatch('tags', data.tags);
//            this.dispatch('metaQ', data.metaq);
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

            var content = el.find('[nodeName="media:content"]')
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


            media.metadata.title = el.find('[nodeName="media:title"]').text()
                || el.find('[nodeName="title"]').text();

            media.metadata.description = el.find('[nodeName="media:description"]').text()
                || el.find('[nodeName="descriptoin"]').text();

            media.metadata.thumbnail = el.find('[nodeName="media:thumbnail"]').attr('url');

            return media;
        },

        search : function ( query, callback, scope) {
            throw "not implemented"
        }
    };

})();