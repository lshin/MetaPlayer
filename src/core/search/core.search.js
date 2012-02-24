(function () {

    var $ = jQuery;

    var defaults = {
        forceRelative : false
    };

    var Search = function (player, options){
        this.config = $.extend({}, defaults, options);

        this.player = player;
        this.forceRelative = this.config.forceRelative;
        MetaPlayer.dispatcher(this);

        this.player.listen(MetaPlayer.DESTROY, this.destroy, this);
    };

    MetaPlayer.Search = Search;

    MetaPlayer.addPlugin("search", function (options) {
        return new Search(this);
    });

    Search.prototype = {
        query : function (query, callback, scope) {
            var data = this.player.metadata.getData();
            if(! data.ramp.searchapi )
                throw "no searchapi available";

            this._queryAPI(data.ramp.searchapi, query, callback, scope)
        },

        destroy : function () {
            this.dispatcher.destroy();
            delete this.player;
        },

        _queryAPI : function (url, query, callback, scope) {

            if( this.forceRelative ) {
                url = url.replace(/^(.*\/\/[\w.]+)/, ""); // make match local domain root
            }

            var params = {
                q : query
            };

            if( ! query ) {
                this.setResults({ query : [], results : [] }, callback, scope);
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
                    var results = this.parseSearch(response, callback, scope);
                    this.setResults(results, callback, scope);
                }
            });
        },

        setResults : function (results, callback, scope) {
            console.log("setResults", results);
            if( callback )
                callback.call(scope, results);
            else
                this.dispatch("search", results);
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
                ret.query.push( self._deSmart( $(this).text() ) );
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
                        text : self._deSmart( el.text() )
                    })
                });
                ret.results.push(s);
            });
            return ret;
        },

        _deSmart : function (text) {
            return text.replace(/\xC2\x92/, "\u2019" );
        }
    }

})();