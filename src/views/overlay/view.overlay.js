
(function () {

    var $ = jQuery;

    var defaults = {
        target : '',
        autoHide : true,
        cssPrefix : 'metaplayer-overlay',
        template : 'view.overlay.tmpl.html'
    };

    var Overlay = function (media, options, ramp) {

        if( !(this instanceof Overlay ))
            return new Overlay(media, options, ramp);

        this.config = $.extend({}, defaults, options);
        this.ramp = ramp;
        this.media = media;

        if( this.config.container ) {
            this.container = this.config.container;
            this.init();
        }
        else
            this.createMarkup(); // async init
    };

    Ramp.Views.Overlay = Overlay;

    Ramp.prototype.overlay = function (options) {
        return Overlay(this.media, options, this);
    };


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
                self.media.play();
            });
            this.find('play').click( function (e) {
                self.media.play();
            });
            this.find('pause').click( function (e) {
                self.media.pause();
            });
            this.find('mute').click( function (e) {
                self.media.muted = true;
            });
            this.find('unmute').click( function (e) {
                self.media.muted = false;
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
                self.media.nextTrack();
            });
        },

        addServiceListeners : function () {
            this.ramp.service.tags(this.onTags, this);
        },

        onTags : function (tags) {
            var self = this;
            $.each(tags, function (i, tag){
                self.createTag(tag.term);
            });
        },

        onTrackChange : function () {
            this.nextup = null;

            $('.' + this.cssName('tag') ).remove();
            this.find('next').hide();

            var nextup = this.media.playlist[ this.media.nextTrackIndex() ];
            if( nextup ){
                this.find('preview-thumb').attr('src', nextup.thumbnail);
                this.find('preview-title').text(nextup.title);
                this.find('next').show();
            }
        },

        createTag : function ( term ) {
            var el = this.create('tag');
            var label = this.create('tag-label');
            label.text(term);
            el.append(label);
            this.find('tags').prepend(el);
        },

        addPopcornListeners : function () {
            if(! this.ramp.popcorn )
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
            if(! this.ramp.popcorn )
                return;

            if( bool )
                this.ramp.popcorn.enable('subtitle');
            else
                this.ramp.popcorn.disable('subtitle');

            this.find('cc').toggle(bool);
            this.find('cc-off').toggle(!bool)
        },


        addPlayerListeners : function () {
            var self = this;
            $(this.media).bind('pause play seeked seeking canplay', function(e){
                self.onPlayStateChange();
            });
            $(this.media).bind('volumechange', function(e){
                self.onVolumeChange();
            });

            $(this.media).bind('trackChange', function(e){
                self.onTrackChange();
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
            this.media.muted = false;
            this.media.volume = ratio;
        },

        onVolumeChange : function () {
            var muted = this.media.muted;
            this.find('mute').toggle( !muted );
            this.find('unmute').toggle( muted );

            var volume = muted ? 0 : this.media.volume;

            this.find('volume').width( (volume * 100) + "%");
        },

        onPlayStateChange : function (e) {
            // manage our timers based on play state
            var paused = this.media.paused;
            this.find('play').toggle( paused );
            this.find('pause').toggle( !paused );
        },

        createMarkup : function () {
            var url = this.baseUrl + this.config.template;
            $.ajax(url , {
                context: this,
                success : function (data){
                    this.container = $(this.media).parent();
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