
(function () {

    var $ = jQuery;

    Ramp.Plugin.prototype.captions = function (options){
        this.player.ramp.captions = new Ramp.Captions(this, options);
    };

    var defaults = {
        cssPrefix : 'metaplayer-captions-',
        intervalMsec : 500
    };

    function _contains (cue, time){
        return (time >= cue.start && time < cue.end );
    }

    Ramp.Captions = function (player, options) {
        this.options = $.extend(true, {}, defaults, options);
        this.container = player.container();
        this.player = player;
        this.captions = [];

        this.player.listen('load', this.onLoad, this);
        this.player.listen('seeking', this.onSeek, this);
        this.player.listen('seek', this.onSeek, this);
        this.player.listen('playback', this.onPlayStateChange, this);

        this.timer = Ramp.Timer(this.options.intervalMsec);
        this.timer.listen('time', this.render, this);

    };

    Ramp.Captions.prototype = {

        onLoad : function (data) {
            console.log("captions ready");
            this.captions = data.captions;
            this.createMarkup();
        },

        onSeek : function ( data) {
            this.render();
//            this.setCaption('');
        },

        onPlayStateChange : function () {
            // manage our timers based on play state
            if( this.player.playing )
                this.timer.start();
            else
                this.timer.reset();
            this.render();
        },

        setCurrentCaption : function (time) {
            var caption, i=0;

            while( i < this.captions.length ) {
                caption = this.captions[i++];
                if( _contains(caption, time) ){
                    this.current = caption;
                    return;
                }
            }
        },

        render : function () {
            var time = this.player.status().time;

            if( this.current && _contains( this.current, time) ){
                return;
            }

            // todo: optimize, or replace w/ popcornjs
            this.setCaption('');

            if( ! this.captions )
                return;

            this.setCurrentCaption(time);
            this.setCaption(this.current.text);
        },

        setCaption : function ( text ) {
            this.find('cc-content').text(text);
        },

        createMarkup : function () {
            if( this.find('cc-content').length )
                return;
            var container = $( this.container );
            container.append( this.create('cc-content') );
        },


        /* core */
        find : function (className){
            return $(this.container).find('.' + this.cssName(className) );
        },
        create : function (className){
            return $("<div></div>").addClass( this.cssName(className) );
        },

        cssName : function (className){
            return  this.options.cssPrefix + className;
        }

    };

})();
