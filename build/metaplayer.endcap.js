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

    var defaults = {
        target : '',
        cssPrefix : 'metaplayer-endcap',
        template : 'templates/ui.endcap.tmpl.html',
        siteSearchUrl : "",
        countDownSec : 20,
        fadeMs : 250
    };

    var EndCap = function (player, service, options) {

        if( !(this instanceof EndCap ))
            return new EndCap(player, service, options);

        this.config = $.extend({}, defaults, options);

        // two-argument constructor(player, options)
        if( options == undefined && player.service ) {
            options = service;
            service = player.service;
        }
        this.service = service;
        this.player = player;
        this.baseUrl = Ramp.Utils.Script.base('(metaplayer||ui).endcap(.min)?.js');



        if( this.config.container ) {
            this.container = this.config.container;
            this.init();
        }
        else {
            this.container = player.parentNode;
            this.getTemplate();
        }

    };

    Ramp.endcap = function (player, service, options) {
        return EndCap(player, service, options);
    };

    EndCap.prototype = {

        getTemplate : function () {
            var url = this.baseUrl + this.config.template;
            $.ajax(url , {
                context: this,
                success : function (data){
                    $(this.container).append(data);
                    this.init();
                }
            });
        },

        init : function  (){
            var self = this;

            this.player.onTrackChange( this.onTrackChange, this);
            this.player.onPlaylistChange( this.onTrackChange, this);
            $(this.player).bind('play playing seeked loadstart', function () {
                self.onPlaying();
            });
            $(this.player).bind('ended', function () {
                self.onEnded();
            });

            this.find('countdown').click( function (e) {
                self.countdown.toggle();
                e.stopPropagation();
            });
            this.find('preview').click( function () {
                self.player.next();
            });
            this.find('repeat').click( function () {
                self.player.currentTime = 0;
                self.player.play();
            });

            this.find('search-btn').click( function (e) {
                self.doSiteSearch();
            });

            this.find('search-input').keypress( function (e) {
                if (e.which == 13 ) {
                    self.doSiteSearch();
                }
            });


            this.player.advance = false;

            this.countdown = Ramp.Timer(1000, this.config.countDownSec);
            this.countdown.listen('time', this.onCountdownTick, this);
            this.countdown.listen('complete', this.onCountdownDone, this);

            this.toggle(false, true);
        },

        doSiteSearch : function  () {
            var q = this.find('search-input').val();
            var url = this.siteSearchUrl || this.config.siteSearchUrl;
            url += encodeURIComponent(q);
            top.location = url;
        },

        onEnded : function () {
            this.countdown.start();
            var count = this.find('countdown').text( this.config.countDownSec );
            this.toggle(true);
        },

        onPlaying : function () {
            this.countdown.reset();
            this.toggle(false);
        },

        toggle : function (bool, now) {
            var el = this.find().stop();
            var opac = bool ? 1 : 0;
            if( now ) {
                el.css('opacity', opac);
                return;
            }
            el.animate({opacity: opac }, this.config.fadeMs);
        },

        onTrackChange : function () {
            this.toggle(false);
            var again = this.player.track();
            this.find('again-thumb').attr('src', again.thumbnail);
            this.find('again-title').text(again.title);
            this.find('again').show();

            this.siteSearchUrl = again.siteSearchURL;

            this.find('next').hide();
            var nextup = this.player.nextTrack();
            if( nextup ){
                this.find('preview-thumb').attr('src', nextup.thumbnail);
                this.find('preview-title').text(nextup.title);
                this.find('next').show();
            }
        },

        onCountdownTick : function (e) {
            var count = this.find('countdown');
            count.text( Math.round(e.data.remain ) );
        },

        onCountdownDone : function (e) {
            this.player.next();
        },

        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className, tagName){
            if( ! tagName )
                tagName = "div";
            return $("<" + tagName + ">").addClass( this.cssName(className) );
        },
        cssName : function (className){
            return this.config.cssPrefix + (  className ?  '-' + className : '' );
        }
    };

})();