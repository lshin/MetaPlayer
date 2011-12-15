(function () {

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


})();