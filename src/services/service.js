(function () {

    var defaults = {
        jsonService : "..//external/media/{e}.json"
    };

    var JsonService = function (host, options) {
        if( ! (this instanceof JsonService ))
            return new JsonService(host, options);

        this.config = $.extend({}, defaults, options);
        this.data = {};
        this.host = host || '';
        Ramp.EventDispatcher(this);
    };

    JsonService.prototype = {
        parse : function (str) {
            return jQuery.parseJSON(str);
        },

        load : function (mediaId, callback, scope) {
            var url = this.host + this.config.jsonService.replace(/{e}/, mediaId);

            $.ajax(url, {
                dataType : "json",
                timeout : 5000,
                data : {},
                error : function (jqXHR, textStatus, errorThrown) {
                    console.error("Load  error: " + textStatus + ", url: " + url);
                },
                success : function (response, textStatus, jqXHR) {
                    callback.call(scope, response);
                }
            });
        }
    };

    Ramp.addService("json", JsonService);

})();