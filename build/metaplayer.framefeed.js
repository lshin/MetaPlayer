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
        cssPrefix : "mp-ff",
        filterMsec : 500,
        revealMsec : 1500,
        duplicates : false,
        baseUrl : ""
    };

    var FrameFeed = function (target, options) {

        var t = $(target);
        target = t.get(0);

        // return intance if exists
        if( target && FrameFeed.instances[ target.id ] ){
            return FrameFeed.instances[ target.id ];
        }

        if( ! (this instanceof FrameFeed) )
            return new FrameFeed(target, options);

        this.config = $.extend(true, {}, defaults, options);
        this.target = target;
        this.seen= {};
        this.init();

        FrameFeed.instances[ this.target.id ] = this;
    };

    FrameFeed.instances = {};


    MetaPlayer.addPlugin("framefeed", function (target, options){

        var popcorn = this.popcorn;
        this.dispatcher.listen("metaq", function (e, metaq) {
            $.each(metaq.framefeed, function (e, obj) {
                var o = $.extend({ 'target': target}, obj);
                console.log([obj.url, o]);
                popcorn.framefeed(o);
            });
        });

        return FrameFeed(target, options);
    });

    MetaPlayer.framefeed = FrameFeed;

    FrameFeed.prototype = {

        init : function () {
            var t = $(this.target);
            this.items = [];
            t.addClass( this.cssName() );
        },

        filter: function (query) {
            this.query = query;
            $(this.target).find("div")
                .stop()
                .height(0)
                .css('opacity',0);
            this.render();
        },

        render : function  () {
            var self = this;
            $.each(this.items, function (i, val) {
                if ( ! self.filtered(val) && val.active ){
                    val.item.stop().
                        height(val.height)
                        .animate({
                            opacity: 1
                        }, self.config.filterMsec);
                }
            })
        },

        filtered : function (obj) {
            return ( this.query && obj.text && ! obj.text.match(this.query) );
        },

        focus : function (obj) {
            obj.active = true;
            this.frame(obj);
        },

        blur : function (obj) {
            obj.active = false;
            obj.item.stop().height(0).css('opacity', 0);
        },

        frame : function (obj) {
            if( typeof obj == "string" ){
                obj = { url :  obj };
            }

            var url =  ( this.config.baseUrl )
                ? this.config.baseUrl + obj.url
                :  obj.url;


            if( this.seen[url] && this.seen[url].start != obj.start && ! this.config.duplicates) {
                return;
            }
            this.seen[url] = obj;

            this.render();

            if( ! obj.item ){
                var frame = $("<iframe frameborder='0'></iframe>")
                    .attr("src", url)
                    .attr("scrolling", "no")
                    .attr("marginheight", 0)
                    .attr("marginwidth", 0)
                    .attr("height", obj.height);

                obj.item = $("<div></div>")
                    .addClass( this.cssName("box") )
                    .prependTo( this.target )
                    .height(0)
                    .css('opacity', 0)
                    .append(frame);

                this.items.push(obj);
            }

            if( this.filtered(obj) )
                return;

            // if user has scrolled down, fade in
            var scroll = $(this.target).scrollTop();
            if( scroll > 0 ){
                obj.item.height(obj.height)
                    .animate({
                        opacity: 1
                    }, this.config.revealMsec);
                $(this.target).scrollTop( scroll + obj.height );

            }
            // else scroll and fade in
            else {
                obj.item.animate({
                    height: obj.height,
                    opacity: 1
                }, this.config.revealMsec);
            }

        },

        clear : function () {
            $(this.target).empty();
        },

        /* util */
        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className, tagName){
            if( ! tagName )
                tagName = "div";
            return $("<" + tagName + ">").addClass( this.cssName(className) );
        },
        cssName : function (className){
            return  this.config.cssPrefix + (className ? '-' + className : '');
        }
    };

    if( Popcorn ) {
        Popcorn.plugin( "framefeed" , {

            _setup: function( options ) {
                FrameFeed(options.target);
            },

            start: function( event, options ){
                FrameFeed(options.target)
                    .focus(options);
            },

            end: function( event, options ){
                FrameFeed(options.target)
                    .blur(options);
            },

            _teardown: function( options ) {
                FrameFeed(options.target)
                    .clear();
            }
        });
    }


})();
