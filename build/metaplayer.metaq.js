/*
Copyright (c) 2011 RAMP Holdings, Inc.

Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
*/

(function () {

    var $ = jQuery;
    var Popcorn = window.Popcorn;

    var defaults = {
        subtitles : true
    };

    var PopcornLoader = function (video, options) {
        if( !(this instanceof PopcornLoader) )
            return new PopcornLoader(video, options);

        if( ! (window.Popcorn && Popcorn instanceof Function) )
            throw "required: PopcornJS"

        this.popcorn = video.getTrackEvents ? video : Popcorn(video);
        this.dispatcher = MetaPlayer.dispatcher(video);

        this.config = $.extend(true, {}, defaults, options);

        this._sequences = {};
        this.metaq = {};

        this.addDataListeners();
    };

    MetaPlayer.addPlayer("popcorn", function (popcorn, options) {
       this.popcorn = popcorn;
       return popcorn.media;
    });

    MetaPlayer.addPlugin('metaq', function (options) {
        var metaq = PopcornLoader(this.video, options);
        this.popcorn = metaq.popcorn;
        return metaq;
    });

    PopcornLoader.prototype = {
        addDataListeners : function () {
            this.dispatcher.listen("captions", this._onCaptions, this);
            this.dispatcher.listen("metaq", this._onMetaq, this);
            this.dispatcher.listen("trackchange", this._onTrackChange, this);
        },

        _onCaptions : function (e, captions) {
            var self = this;
            if( this.config.subtitles )
                $.extend(this.metaq, { subtitle : captions });
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
                fn.call(this.popcorn, options);
        }
    };

})();