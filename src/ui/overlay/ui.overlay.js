
(function () {

    var $ = jQuery;

    var defaults = {
        target : '',
        autoHide : true,
        cssPrefix : 'metaplayer-overlay',
        template : 'templates/ui.overlay.tmpl.html',
        captions : false,
        seekBeforeSec : 1,
        hideOnEnded : true
    };

    var Overlay = function (player, service, options) {

        if( !(this instanceof Overlay ))
            return new Overlay(player, service, options);

        this.config = $.extend({}, defaults, options);

        // two-argument constructor(player, options)
        if( options == undefined && player.service ) {
            options = service;
            service = player.service;
        }
        this.service = service;
        this.player = player;
        this.playlist = player.playlist;
        this.baseUrl = Ramp.Utils.Script.base('(metaplayer||ui).overlay(.min)?.js');
        this.nextUp = Ramp.data();

        if( this.config.container ) {
            this.container = this.config.container;
            this.init();
        }
        else {
            this.container = this.config.target || this.player.parentNode;
            this.createMarkup(); // async init
        }
    };

    Ramp.overlay = function (player, service, options) {
        return Overlay(player, service, options);
    };

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
                self.player.play();
            });
            this.find('play').click( function (e) {
                self.player.play();
            });
            this.find('pause').click( function (e) {
                self.player.pause();
            });
            this.find('mute').click( function (e) {
                self.player.muted = true;
            });

            this.find('unmute').click( function (e) {
                self.player.muted = false;
            });

            this.find('search-btn').click( function (e) {
                self.doSearch();
            });

            this.find('search-input').keypress( function (e) {
                if (e.which == 13 ) {
                    self.doSearch();
                }
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

            if( this.config.autoHide  && ! this.config.target ) {
                var container = $(this.container);
                container.bind('mouseenter', function () {
                    if( ! self._ended )
                        self.toggle(true)
                });
                container.bind('mouseleave', function () {
                    if( ! self._ended )
                        self.toggle(false)
                })
            }

            this.find('preview').click( function () {
                self.playlist.next();
            });
        },

        addServiceListeners : function () {
            if( ! this.service.onTags )
                return;

            this.service.onTags(this.onTags, this);
//            this.service.onSearch(this.onSearchResult, this);
        },

        onTags : function (tags) {
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
                self.player.currentTime = result.start - self.config.seekBeforeSec;
            });

            var time = this.create('result-time');
            time.text( Ramp.Utils.Format.seconds( result.start) );
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
            if(! this.player.popcorn )
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
            if(! this.player.popcorn )
                return;

            if( bool )
                this.player.popcorn.enable('subtitle');
            else
                this.player.popcorn.disable('subtitle');

            this.find('cc').toggle(bool);
            this.find('cc-off').toggle(!bool)
        },


        addPlayerListeners : function () {
            var self = this;
            $(this.player).bind('pause play seeked seeking canplay', function(e){
                self.onPlayStateChange();
            });
            $(this.player).bind('ended', function(e){
                self.onEnded();
            });
            $(this.player).bind('volumechange', function(e){
                self.onVolumeChange();
            });

        },

        addPlaylistListeners : function (){
            if( ! this.playlist )
                return;
            this.playlist.onTrackChange( this.onTrackChange, this);
            this.playlist.onPlaylistChange( this.onPlaylistChange, this);
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
            this.player.muted = false;
            this.player.volume = ratio;
        },

        onVolumeChange : function () {
            var muted = this.player.muted;
            this.find('mute').toggle( !muted );
            this.find('unmute').toggle( muted );

            var volume = muted ? 0 : this.player.volume;

            this.find('volume').width( (volume * 100) + "%");
        },

        onPlayStateChange : function (e) {
            this._ended = false;
            // manage our timers based on play state
            // don't use toggle(); triggers layout quirks in chrome
            if( this.player.paused ) {
                this.find('pause').hide();
                this.find('play').show();
            }
            else {
                this.find('play').hide();
                this.find('pause').show();
            }
        },

        onEnded : function () {
            if( ! this.config.hideOnEnded )
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

        toggle : function ( bool ) {
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