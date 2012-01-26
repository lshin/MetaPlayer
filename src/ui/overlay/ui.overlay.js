
(function () {

    var $ = jQuery;

    var defaults = {
        target : '',
        autoHide : true,
        cssPrefix : 'metaplayer-overlay',
        template : 'templates/ui.overlay.tmpl.html',
        captions : false,
        mouseDelayMsec : 500,
        seekBeforeSec : 1,
        hideOnEnded : true
    };

    var Overlay = function (player, options) {

        if( !(this instanceof Overlay ))
            return new Overlay(player, options);

        this.config = $.extend({}, defaults, options);

        this.video = player.video;
        this.dispatcher = player.dispatcher;
        this.service = player.service;
        this.popcorn = player.popcorn;
        this.playlist = player.playlist;

        // used to find our templates
        this.baseUrl = Ramp.script.base('(metaplayer||ui).overlay(.min)?.js');
        this._touchDevice = /iPad|iPhone|iPod/i.test(navigator.userAgent);

        if( this.config.container ) {
            this.container = this.config.container;
            this.init();
        }
        else {
            this.container = this.config.target || this.video.parentNode;
            this.createMarkup(); // async init
        }
        this.video.overlay = this;
    };

    MetaPlayer.addPlugin("overlay", function (options) {
        return Overlay(this, options);
    });

    Overlay.prototype = {
        init : function () {
            this.addUIListeners();
            this.addPlayerListeners();
            this.addPlaylistListeners();
            this.addPopcornListeners();
            this.addServiceListeners();

            //  render initial state
            this.onVolumeChange();
            this.onPlayStateChange();
            this.setCaptions(this.config.captions);

            if( this._touchDevice || ! this.config.autoHide )
                this.find('close-btn').show();

            if( Ramp.embed ) {
                this.embed = Ramp.embed( this.find('embed'), this.service );
                this.find('embed').show();
            }

            if( Ramp.social )
                Ramp.social( this.find('social'), this.service );
        },

        addUIListeners : function () {
            var self = this;
            this.find('play').click( function (e) {
                self.video.play();
            });
            this.find('pause').click( function (e) {
                self.video.pause();
            });
            this.find('mute').click( function (e) {
                self.video.muted = true;
            });

            this.find('unmute').click( function (e) {
                self.video.muted = false;
            });

            this.find('search-btn').click( function (e) {
                self.doSearch();
            });

            this.find('search-input').keypress( function (e) {
                if (e.which == 13 ) {
                    self.doSearch();
                }
            });

            this.find('close-btn').click( function (e) {
                self.toggle(false);
            });

            this.find('results-close').click( function (e) {
                self.find('search-input').val('');
                self.service.search('', self.onSearchResult, self);
            });

            var volume_bg = this.find('volume-bg');
            $(volume_bg).bind('mousedown touchstart', function (e){
                self.onVolumeDragStart(e);
            });
            $(document).bind('mouseup touchend', function (e) {
                self.onVolumeDragEnd(e);
            });
            $(document).bind('mousemove touchmove', function (e) {
                if( ! self.volumeDragging )
                    return;
                self.onVolumeDrag(e);
            });

            if( ! this.config.target ) {
                var node = this.find().get(0);

                if( this._touchDevice ) {
                    var video = $(this.container ).find( 'video'  );
                    video.bind('touchstart', function () {
                        if( ! self._ended )
                            self.delayedToggle(true)
                    });
                }
                else {
                    var container = $( this.container  );
                    container.bind('mouseenter', function (e) {
                        if( ! self._ended )
                            self.delayedToggle(true)
                    });

                    container.bind('mouseleave', function (e) {
                        if( ! self._ended )
                            self.delayedToggle(false)
                    });
                }
            }

            this.find('preview').click( function () {
                self.playlist.next();
            });
        },

        addServiceListeners : function () {
            if( ! this.service )
                return;
            this.service.listen("tags", this.onTags, this);
        },

        onTags : function (e, tags) {
            var self = this;
            $.each(tags, function (i, tag){
                self.createTag(tag.term);
            });
        },

        renderNextUp : function (){
            var nextup = this.playlist.nextTrack();
            if( nextup ){
                this.find('preview-thumb').attr('src', nextup.thumbnail);
                this.find('preview-title').text(nextup.title);
                this.find('next').show();
            }
        },

        onPlaylistChange : function () {
            this.renderNextUp()
        },

        onTrackChange : function () {
            this.nextup = null;
            this.clearSearch();

            $('.' + this.cssName('tag') ).remove();
            this.find('next').hide();

            this.renderNextUp()
        },

        createTag : function ( term ) {
            var self = this;
            var el = this.create('tag');
            var label = this.create('tag-label');
            label.text(term);
            el.append(label);
            el.data("term", term);
            el.click( function (e) {
                self.onTagClick(e);
            });
            this.find('tags').prepend(el);
        },

        onTagClick : function (e) {
            var term = $(e.currentTarget).data().term;
            this.find('search-input').val("\"" +  term + "\"");
            this.doSearch();
        },

        doSearch : function () {
            var q = this.find('search-input').val();
            this.service.search(q, this.onSearchResult, this);
        },

        onSearchResult : function (response) {
            this.clearSearch();

            if( ! response.query.length )
                return;

//            this.find('search-input').val(response.query.join(' '));

            var has_results = (response.results.length == 0);
            this.find('results-none').toggle( has_results );

            var self = this;
            $.each(response.results, function (i, result){
                self.createResult(result);
            });
            this.find('tags').hide();
            this.find('results').show();
        },

        clearSearch : function () {
            this.find('result-list').empty();
            this.find('tags').show();
            this.find('results').hide();
        },

        createResult : function (result){
            var self = this;
            var el = this.create('result');
            el.click( function (e) {
                self.video.currentTime = result.start - self.config.seekBeforeSec;
            });

            var time = this.create('result-time');
            time.text( Ramp.format.seconds( result.start) );
            el.append(time);

            var phrase = this.create('result-text');
            el.append(phrase);

            $.each(result.words, function (i, word){
                var w = word.text;
                if( word.match ){
                    w = $('<span>');
                    w.addClass( self.cssName('match') );
                    w.text(word.text);
                }
                phrase.append(w);
                phrase.append(" ");
            });

            this.find('result-list').append(el);
        },

        addPopcornListeners : function () {
            if(! this.popcorn )
                return;

            var self = this;
            this.find('cc').click( function () {
                self.setCaptions(false);
            });

            this.find('cc-off').click( function () {
                self.setCaptions(true);
            });
        },

        setCaptions : function ( bool ){
            if(! this.popcorn )
                return;

            if( bool )
                this.popcorn.enable('subtitle');
            else
                this.popcorn.disable('subtitle');

            this.find('cc').toggle(bool);
            this.find('cc-off').toggle(!bool)
        },


        addPlayerListeners : function () {
            var self = this;

            $(this.video).bind('canplay', function(e){
                // check if volume adjustment is not supported (eg. iOS)
                var hold = self.video.volume;
                var test =  .5;
                self.video.volume = test;
                if(self.video.volume !=  test)
                    self.hideVolumeControls();
                self.video.volume = hold;
            });

            $(this.video).bind('pause play seeked seeking canplay', function(e){
                self.onPlayStateChange();
            });
            $(this.video).bind('ended', function(e){
                self.onEnded();
            });
            $(this.video).bind('volumechange', function(e){
                self.onVolumeChange();
            });

        },

        addPlaylistListeners : function (){
            this.dispatcher.listen("trackchange", this.onTrackChange, this);
            this.dispatcher.listen("playlistchange", this.onPlaylistChange, this);
        },

        onVolumeDragStart : function (e) {
            this.volumeDragging = true;
            this.onVolumeDrag(e);
            e.preventDefault();
        },
        onVolumeDragEnd : function (e) {
            if( ! this.volumeDragging )
                return;
            this.volumeDragging = false;
            this.onVolumeDrag(e);
            e.preventDefault();
        },

        onVolumeDrag : function (e) {
            var oe = e.originalEvent;
            var pageX = e.pageX;

            if( oe.targetTouches ) {
                if( ! oe.targetTouches.length ) {
                    return;
                }
                pageX = oe.targetTouches[0].pageX;
            }

            var bg = this.find('volume-bg');
            var x =  pageX - bg.offset().left;
            var ratio = x / bg.width();


            if( ratio < 0 )
                ratio = 0;
            if( ratio > 1 )
                ratio = 1;

            // todo, throttle the mousemove
            this.video.muted = false;
            this.video.volume = ratio;
        },

        hideVolumeControls : function () {
            this.find('mute').hide();
            this.find('unmute').hide();
            this.find('volume-bg').hide();

        },

        onVolumeChange : function () {

            var muted = this.video.muted;
            this.find('mute').toggle( !muted );
            this.find('unmute').toggle( muted );

            var volume = muted ? 0 : this.video.volume;

            this.find('volume').width( (volume * 100) + "%");
        },

        onPlayStateChange : function (e) {
            this._ended = false;
            // manage our timers based on play state
            // don't use toggle(); triggers layout quirks in chrome
            if( this.video.paused ) {
                this.find('pause').hide();
                this.find('play').show();
            }
            else {
                this.find('play').hide();
                this.find('pause').show();
            }
        },

        onEnded : function () {
            if( ! (this.config.hideOnEnded && this.config.autoHide) )
                return;
            this._ended = true;
            var node = this.find().stop();
            node.height(0);
        },

        createMarkup : function () {
            var url = this.baseUrl + this.config.template;
            $.ajax(url , {
                context: this,
                success : function (data){
                    $(this.container).append(data);
                    if( this.config.autoHide )
                        this.find().height(0); // start closed
                    this.init();
                }
            });
        },

        delayedToggle : function ( bool) {
            this._delayed = bool;

            // don't auto-hide;
            if( ! this.config.autoHide && ! bool){
                return;
            }
            var self = this;
            setTimeout( function () {
                if( this.__opened != self._delayed )
                    self.toggle(self._delayed);
            }, this.config.mouseDelayMsec)
        },

        toggle : function ( bool ) {
            this.__opened = bool;

            var node = this.find().stop();
            var height = this.find('container').height();
            if( bool )
                node.animate({height: height}, 500, function () {
                    node.height('')
                });
            else
                node.animate({height: 0}, 500);

            if( this.embed )
                this.embed.close(0);
        },

        /* core */
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