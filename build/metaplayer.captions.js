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
        cssPrefix : "metaplayer-captions"
    };

    var Captions = function (target, options) {

        var id;
        // give passed in players an id for future instance lookup
        if( typeof target !== "string") {
            if ( ! target.__CAPTIONS_ID )
                target.__CAPTIONS_ID = "CC!" + (Captions._count++);
            id = target.__CAPTIONS_ID;
        }
        else {
            id = target;
        }

        // return any previous instance for this player
        if(  Captions.instances[id] ) {
            return Captions.instances[id];
        }

        // optional new() statement
        if( !(this instanceof Captions) )
            return new Captions(target, options);

        this.target = target;
        this.config = $.extend(true, {}, defaults, options);

        this.init();

        Captions.instances[id] = this;
    };

    Captions.instances = {};
    Captions._count = 0;

    Captions.prototype = {
        init : function (){
            this.container = this.create();
//            this.container.append('&nbsp;'); // holds height
            this._captions = {};

            if( this.target.getTrackEvents )
                $(this.target.media.parentNode).append( this.container );
            else
                $(this.target).append( this.container );
        },

        append :  function (options) {

        },

        focus : function (options) {
            var el = this.create("text", 'div');
            el.text( options.text );
            this._captions[ options.start ] = el;
            this.container.append(el);
        },

        blur : function (options) {
            var el = this._captions[options.start];
            delete this._captions[options.start];
            el.remove();
        },

        clear : function (options) {
            this._captions = {};
            this.container.empty();
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
        Popcorn.plugin( "subtitle" , {
            _setup: function( options ) {
                Captions(this);
            },

            start: function( event, options ){
                Captions(this).focus(options)
            },

            end: function( event, options ){
                Captions(this).blur(options);
            },

            _teardown: function( options ) {
                Captions(this).clear();
            }
        });
    }

})();
