

(function () {

    var $ = jQuery;
    var Popcorn = window.Popcorn;

    var defaults = {
        cssPrefix : "transcript",
        focusMs : 750,
        fadeMs : 1000,
        opacity: .4,
        timestamps : true,
        breaks : true
    };

    var Transcript = function (target, player, options) {

        // two argument constructor (target, options)
        if( options == undefined && ! (player && player.play) ) {
            options = player;
            player = null;
        }
        if( typeof target == "string" && Transcript.instances[target] ) {
            var self = Transcript.instances[target];
            if( player && player.play )
                self.player = player;
            return self;
        }

        if( !(this instanceof Transcript) )
            return new Transcript(target, player, options);

        this.target = target;
        this.player = player;
        this.config = $.extend(true, {}, defaults, options);

        this.init();
        this.addListeners();

        Transcript.instances[target] = this;
    };

    Transcript.instances = {};


    MetaPlayer.addPlugin("transcript", function (target, options) {
        return Transcript( target, this.video, options);
    });


    Transcript.prototype = {
        init : function (){
            this.container = this.create();
            this.scroller = this.create('scroller');
            this._captions = {};
            $(this.target).append( this.container );
            $(this.container).append( this.scroller );
        },

        addListeners : function (e) {
            var self = this;
            this.container.bind("click touchstart", function (e){
                var node = $(e.target).parent( '.' + self.cssName('caption') );
                if( ! node.length )
                    return;
                var options = $(node).data('options');
                if( options ) {
                    self.player.currentTime = options.start;
                    e.stopPropagation();
                    e.preventDefault();
                }
            });
            this.container.bind("mouseenter touchstart", function (e){
                self.mousing = true;
            });
            this.container.bind("mouseleave touchend", function (e){
                self.mousing = false;
            });
        },

        append :  function (options) {
            var el = this.create("caption", this.config.breaks ? 'div' : 'span');

            if( this.config.timestamps) {
                var ts = this.create("time", 'span');
                ts.text( options.start + "s");
                el.append(ts);
            }

            var text = this.create("text", 'span');
            text.text( options.text );
            el.append(text);

            el.data('options', options);
            el.css('opacity', this.config.opacity);
            this.scroller.append(el);
            this._captions[ options.start ] = el;
        },

        clear : function () {
            $(this.scroller).empty();
            this._captions = {};
        },

        focus : function (options) {
            var el = this._captions[options.start];
            el.stop().animate({opacity: 1}, this.config.focusMs);
            el.toggleClass( this.cssName('focus'), true );

            var top = el.position().top - (this.container.height() / 2);
            if( ! this.mousing )
                this.container.animate({ scrollTop: top }, 1000);
        },

        blur : function (options) {
            var el = this._captions[options.start];
            el.stop().animate({opacity: this.config.opacity}, this.config.fadeMs);
            el.toggleClass( this.cssName('focus'), false )
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
        Popcorn.plugin( "transcript" , {

            _setup: function( options ) {
                var t = Transcript(options.target, this.media);
                t.append( options );
            },

            start: function( event, options ){
                var t = Transcript(options.target);
                t.focus(options)
            },

            end: function( event, options ){
                var t = Transcript(options.target);
                t.blur(options)

            },

            _teardown: function( options ) {
                var t = Transcript(options.target);
                t.clear();
            }
        });
    }

})();
