
(function () {

    var $ = jQuery;
    var Popcorn = window.Popcorn;

    var defaults = {
    };

    var MetaQ = function (player, options) {
        if( !(this instanceof MetaQ) )
            return new MetaQ(player, options);

        if( ! (window.Popcorn && Popcorn instanceof Function) )
            return;

        this.popcorn = player.popcorn;
        this.dispatcher = player.dispatcher;

        this.config = $.extend(true, {}, defaults, options);

        this._sequences = {};
        this.metaq = {};

        this.addDataListeners();
    };

    MetaPlayer.addPlugin('metaq', function (options) {
        return MetaQ(this, options);
    });
    
    MetaPlayer.metaq = MetaQ;


    // clones a popcorn event definition
    MetaQ.clone = function (popcorn, fromPlugin, toPlugin ) {
        var events = popcorn.getTrackEvents()
        $.each(events, function (i, e) {
            if( e._natives.type == fromPlugin ) {
                popcorn[toPlugin]( MetaQ.clone(e) );
            }
        })
    };

    // clones a popcorn event definition
    MetaQ.cloneEvent = function (event, overrides) {
        var clone = $.extend({}, event, overrides );

        for( var k in clone ){
            if( k[0] == "_" ) {
                delete clone[k]
            }
        }
        delete clone.id;
        delete clone.effect;
        delete clone.compose;
    },

    MetaQ.prototype = {
        addDataListeners : function () {
            this.dispatcher.listen("metaq", this._onMetaq, this);
            this.dispatcher.listen("trackchange", this._onTrackChange, this);
        },

        _onMetaq : function (e, metaq) {
            var self = this;
            $.extend(this.metaq, metaq);
            this._renderPopcorn();
        },

        _onTrackChange : function (e, metadata) {
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
                fn.call(this.popcorn, $.extend({}, options) );
        }
    };

})();
