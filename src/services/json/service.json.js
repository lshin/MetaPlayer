(function () {

    var defaults = {
        jsonService : "{e}.json"
    };

    var JsonService = function (options) {
        if( ! (this instanceof JsonService ))
            return new JsonService(options);

        this.config = $.extend({}, defaults, options);

        Ramp.EventDispatcher(this);

        this.observable('metadata');
        this.observable('transcodes');
        this.observable('captions');
        this.observable('tags');
        this.observable('metaq');
        this.observable('related');
        this.observable('mediaChange');    };

    JsonService.prototype = {
        parse : function (str) {
            return jQuery.parseJSON(str);
        },

        load : function (mediaId, rampHost) {

            if( this.mediaId )
                this.dispatch('mediaChange');

            this.mediaId = mediaId;

            if( rampHost )
                this.lastHost = rampHost;

            var host = this.lastHost || rampHost;
            var url = host + this.config.jsonService.replace(/{e}/, mediaId);

            $.ajax(url, {
                dataType : "json",
                timeout : 5000,
                context: this,
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load  error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    var data = response;
                    data.metadata.host = host;
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


    Ramp.prototype.service = function (options) {
        this.service = JsonService(options);
        return this;
    };

})();