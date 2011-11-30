
(function () {

    var $ = jQuery;

    var defaults = {
    };

    var PopcornLoader = function (popcorn, options , ramp) {

        if( !(this instanceof PopcornLoader) )
            return new PopcornLoader(popcorn, options, ramp);

        this.config = $.extend(true, {}, defaults, options);
        this.ramp = ramp;
        this.popcorn = popcorn;
        this._sequences = {};

        this.addDataListeners();
    };

    Ramp.Loaders.PopcornLoader = PopcornLoader;

    Ramp.prototype.popcorn = function (popcorn, options) {
        return PopcornLoader(popcorn, options, this);
    };

    if( Ramp.Video ) {
        Ramp.Video.prototype.controls = function ( options ) {
            return PopcornLoader(this.popcorn, options, this.ramp);
        }
    }

    PopcornLoader.prototype = {
        addDataListeners : function () {
            if(! (this.ramp && this.popcorn ) )
                return;

            this.ramp.metaq( this._onMetaq, null, this);
        },

        _onMetaq : function (metaq) {
            var self = this;
            this.metaq = metaq;
            this._renderPopcorn();
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
//            else
//                console.log("no plugin: " + type + " " + options.text)
        }
    };

})();