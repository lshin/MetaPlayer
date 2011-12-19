
(function () {

    var $ = jQuery;
    var Popcorn = window.Popcorn;

    var defaults = {
        subtitles : true
    };

    var PopcornLoader = function (player, service, options) {

        if( !(this instanceof PopcornLoader) )
            return new PopcornLoader(player, service, options);

        this.config = $.extend(true, {}, defaults, options);

        if( player.getTrackEvent )
            this.popcorn = player;
        else if( player.popcorn )
            this.popcorn = player.popcorn;
        else {
            this.popcorn = Popcorn(player);
            player.popcorn = this.popcorn;
        }

        // two-argument constructor(player, options)
        if( options == undefined && player.service ) {
            options = service;
            service = player.service;
        }

        this.player = player;
        this.service = service;

        this._sequences = {};
        this.metaq = {};

        this.addDataListeners();
    };

    Ramp.metaq = function (player, options) {
        return PopcornLoader(player, options);
    };

    PopcornLoader.prototype = {
        addDataListeners : function () {
            if( ! this.service )
                return;
            this.service.onCaptions( this._onCaptions, this);
            this.service.onMetaQ( this._onMetaq, this);
            this.service.onMediaChange( this.onMediaChange, this);
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
            if( fn  )
                fn.call(this.popcorn, options);
        }
    };

})();