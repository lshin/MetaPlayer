
(function () {

    var $ = jQuery;

    var defaults = {
        subtitles : true
    };

    var PopcornLoader = function (popcorn, options , ramp) {

        if( !(this instanceof PopcornLoader) )
            return new PopcornLoader(popcorn, options, ramp);

        this.config = $.extend(true, {}, defaults, options);
        this.ramp = ramp;
        this.popcorn = popcorn;
        this._sequences = {};
        this.metaq = {};

        this.addDataListeners();
    };

    Ramp.Loaders.Popcorn = PopcornLoader;

    Ramp.prototype.metaq = function (options) {
        if( ! this.popcorn && this.media )
            this.popcorn = Popcorn(this.media);
        PopcornLoader(this.popcorn, options, this);
        return this;
    };

    PopcornLoader.prototype = {
        addDataListeners : function () {
            if(! (this.ramp && this.popcorn ) )
                return;
            this.ramp.service.captions( this._onCaptions, this);
            this.ramp.service.metaq( this._onMetaq, this);
            this.ramp.service.mediaChange( this.onMediaChange, this);
        },

        _onCaptions : function (captions) {
            var self = this;
            if( this.config.subtitles )
                $.extend(this.metaq, { subtitle : captions });
        },

        _onMetaq : function (metaq) {
            var self = this;
            $.extend(this.metaq, metaq);
            this._renderPopcorn();
        },

        onMediaChange : function () {
            // cleanup
            var events = this.popcorn.getTrackEvents();
            var self = this;
            $.each(events, function (i, e){
                self.popcorn.removeTrackEvent(e._id);
            });
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
//            console.log(["shedule", type, fn, options]);
            if( fn  )
                fn.call(this.popcorn, options);
        }
    };

})();