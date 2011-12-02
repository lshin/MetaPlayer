
(function () {

    var $ = jQuery;

    var defaults = {
        target : '',
        autoHide : true,
        cssPrefix : 'metaplayer-overlay',
        template : 'view.overlay.tmpl.html'
    };

    var Overlay = function (player, options, ramp) {

        if( !(this instanceof Overlay ))
            return new Overlay(player, options, ramp);

        if( options.container )
            this.container = options.container;

        this.config = $.extend({}, defaults, options);
        this.ramp = ramp;

        if( window.Popcorn && (player instanceof Popcorn )){
            this.popcorn = player;
            this.player = player.media;
        }
        else
            this.player = player;

        if( ! this.container )
            this.createMarkup();
        else
            this.init();
    };


    Ramp.Views.Overlay = Overlay;

    Overlay.prototype = {
        init : function () {
            this.addUIListeners();
            this.addPlayerListeners();
            this.addPopcornListeners();
            this.addServiceListeners();

            //  render initial state
            this.onVolumeChange();
            this.onPlayStateChange();
            this.setCaptions(true);

        },

        baseUrl :  Ramp.Utils.Script.base('view.overlay.js'),

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

            var volume_bg = this.find('volume-bg');
            $(volume_bg).bind('mousedown touchstart', function (e){
                self.onVolumeDragStart(e);
            });
            $(document).bind('mouseup touchend', function (e) {
                self.onVolumeDragEnd(e);
            });
            $(document).bind('mousemove touchemove', function (e) {
                if( ! self.volumeDragging )
                    return;
                self.onVolumeDrag(e);
            });

            if( this.config.autoHide ) {
                this.container.bind('mouseenter', function () {
                    self.toggle(true)
                });
                this.container.bind('mouseleave', function () {
                    self.toggle(false)
                })
            }

            this.find('preview').click( function () {
                self.ramp.load( self.nextup );
            });
        },

        addServiceListeners : function () {
            this.ramp.tags(this.onTags, null, this);
            this.ramp.mediaChange(this.onMediaChange, null, this);
        },

        onTags : function (tags) {
            var self = this;
            $.each(tags, function (i, tag){
                self.createTag(tag.term);
            });
        },

        onMediaChange : function () {
            this.nextup = null;
            $('.' + this.cssName('tag') ).remove();
            this.find('next').hide();
        },

        createTag : function ( term ) {
            var el = this.create('tag');
            var label = this.create('tag-label');
            label.text(term);
            el.append(label);
            this.find('tags').prepend(el);
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
            $(this.player).bind('pause play seeked seeking canplay', function(e){
                self.onPlayStateChange();
            });
            $(this.player).bind('volumechange', function(e){
                self.onVolumeChange();
            });
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
            var bg = this.find('volume-bg');
            var x =  e.pageX - bg.offset().left;
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
            // manage our timers based on play state
            var paused = this.player.paused;
            this.find('play').toggle( paused );
            this.find('pause').toggle( !paused );
        },

        createMarkup : function () {
            var url = this.baseUrl + this.config.template;
            $.ajax(url , {
                context: this,
                success : function (data){
                    this.container = $(this.player).parent();
                    this.container.append(data);
                    this.init();
                }
            });
        },

        toggle : function ( bool ) {
            var node = this.find().stop();
            var height = this.find('container').height();
            if( bool )
                node.animate({height: height}, 500);
            else
                node.animate({height: 0}, 500);
        },

        nextUp : function ( next ) {
            this.nextup = next;
            next.metadata(this.onNextData, null, this);
        },

        onNextData : function (metadata) {
            this.find('preview-thumb').attr('src', metadata.thumbnail);
            this.find('preview-title').text(metadata.title);
            this.find('next').show();
        },

        /* utils */
        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className){
            return $("<div></div>").addClass( this.cssName(className) );
        },

        cssName : function (className){
            return this.config.cssPrefix + (  className ?  '-' + className : '' );
        }
    };

})();