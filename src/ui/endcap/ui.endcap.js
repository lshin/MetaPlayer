
(function () {

    var $ = jQuery;

    var defaults = {
        target : '',
        cssPrefix : 'metaplayer-endcap',
        template : 'templates/ui.endcap.tmpl.html',
        siteSearchUrl : "",
        countDownSec : 20,
        fbUrl : 'http://www.facebook.com/plugins/like.php',
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

        var dispatcher = this.config.dispatcher || Ramp.Utils.EventDispatcher();
        dispatcher.attach(this);

        this.onRender = dispatcher.observer("render");

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

            this.player.onPlaylistChange( this.onTrackChange, this);

            $(this.player).bind('play playing seeked loadstart', function () {
                self.onPlaying();
            });

            $(this.player).bind('ended', function () {
                self.onEnded();
            });

            $(this.player).bind('loadedmetadata', function () {
                self.onTrackChange();
            });

            this.find('countdown').click( function (e) {
                self.countdown.toggle();
                e.stopPropagation();
            });
            this.find().click( function (e) {
                self.countdown.stop();
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


            if( Ramp.embed ) {
                this.embed = Ramp.embed( this.find('embed'), this.service );
                this.find('embed').show();
            }

            if( Ramp.social ){
                Ramp.social( this.find('social'), this.service );
            }

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

            if( bool === undefined )
                bool = ! ( el.is(":visible") );

            if( now ){
                el.toggle(bool);
                return;
            }

            if( bool )
                el.show().animate({ opacity: 1}, this.config.fadeMs);
            else
                el.animate({ opacity: 0 }, this.config.fadeMs, function (){
                    $(this).hide();
                });
        },

        onTrackChange : function () {

            if( ! this.player.readyState > 0 )
                return;

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