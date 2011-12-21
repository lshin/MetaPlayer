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
        cssPrefix : "mp-search",
        tags : true,
        query : "",
        seekBeforeSec : 1
    };

    var SearchBox = function (target, player, options) {

        var id;
        if( typeof target !== "string") {
            if ( ! target.__SEARCH_ID )
                target.__SEARCH_ID = "CC!" + (SearchBox._count++);
            id = target.__SEARCH_ID;
        }
        else
            id = target;

        // return any previous instance for this player
        if(  SearchBox.instances[id] )
            return SearchBox.instances[id];

        if( !(this instanceof SearchBox) )
            return new SearchBox(target, player, options);

        if( player.service ) {
            this.service = player.service;
        }
        else if( service.onMetaData )
            this.service = player;

        if( typeof player == "string")
            player = $(player).get(0);;

        if( player.currentTime != undefined && player.play )
            this.player = player;

        this.target = target;
        this.config = $.extend(true, {}, defaults, options);

        SearchBox.instances[id] = this;

        this.createMarkup();
        this.addListeners();
    };

    SearchBox.instances = {};
    SearchBox._count = 0;

    if( window.Ramp )
        Ramp.searchbox = SearchBox;

    SearchBox.prototype = {

        createMarkup : function (){
            var t = $(this.target);
            var c = this.create();

            var f= this.create('form')
            c.append(f);

            var ti = $('<input type="text" />');
            ti.addClass( this.cssName('input') );
            ti.val( this.config.query );
            f.append(ti);

            var sm = this.create('submit', 'a');
            sm.append( this.create('submit-label', 'span') );
            f.append(sm);

            var rs = this.create('results');
            c.append(rs);

            this.container = c;
            t.append(this.container);
        },
        addListeners : function () {
            var self = this;

            this.find('submit').bind("click", function () {
                self.onSearch();
            });

            this.find('input').bind("keypress", function (e) {
                if (e.which == 13 ) {
                    self.onSearch();
                }
            });

            this.find('results').bind("click", function (e) {
                var el = $(e.target).parents('.' + self.cssName('result') );
                if( ! el.length )
                    el = $(e.target);
                var start = el.data().start;
                if( self.player )
                    self.player.currentTime = start - self.config.seekBeforeSec;
            });

            this.service.onTags( this.onTags, this);
        },

        onTags : function (tags) {
            var all = $(tags).map(function () {
                return this.term;
            });
            if( this.config.tags )
                this.search( all.toArray().join(' ' ) );
            else
                this.onSearch();
        },

        onSearch : function () {
            var q = this.find('input').val();
            this.search(q);
        },

        search : function (query) {
            this.clear();
            if(! query)
                return;
            this.find('input').val(query);
            this.service.search(query, this.onSearchResult, this);
        },

        clear : function () {
            var r = this.find('results');
            r.empty();
            this.find('input').val('');
        },

        onSearchResult : function (response) {
            var r = this.find('results');
            if( response.results.length == 0 ) {
                r.text("no results");
                return;
            }

            var self = this;
            $.each(response.results, function (i, result){
                var el = self.create('result');
                el.data('start', result.start);
                var time = self.create('time');
                time.text( Ramp.Utils.Format.seconds( result.start) )
                el.append(time);

                var phrase = self.create('text');
                $.each(result.words, function (i, word){
                    var w = word.text;
                    if( word.match ){
                        w = $('<span>');
                        w.addClass( self.cssName('match') );
                        w.text(word.text);
                    }
                    phrase.append(w)
                    phrase.append(" ")
                });
                el.append(phrase);
                r.append(el);
            });

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



})();
