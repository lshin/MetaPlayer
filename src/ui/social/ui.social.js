( function () {
    var $ = jQuery;

    var defaults = {
        cssPrefix : "metaplayer-social",

        facebookApi : '//www.facebook.com/plugins/like.php',
        twitterApi: '//platform.twitter.com/widgets/tweet_button.html',

        shareText : "Check this video out -- "
    };

    var Social = function (target, service, options) {

        if( !(this instanceof Social) )
            return new Social(target, service, options);

        this.config = $.extend(true, {}, defaults, options);

        // if passed in player instance
        if( service.service )
            service = service.service;

        this.service = service;
        this.container = target;

        this.addDom();
        this.service.onMetaData( this.onMetaData, this );
    };

    Ramp.social = Social;

    Social.prototype = {

        addDom : function () {
            var el = this.create().appendTo(this.container);
            el.hide();

            this.create('twitter', 'iframe').appendTo( el );
            this.create('facebook', 'iframe').appendTo( el );
            this.create('clear').appendTo( el );
        },

        onMetaData : function (data) {
            this.setTwitter(data);
            this.setFacebook(data);
            this.find().show();
        },

        setTwitter : function (t) {

            var cacheBust  = Math.random().toString().substr(2);

            var params = {
//                via : '',
//                related : '',
                count : 'horizontal',
                lang : 'en',
                '_' : cacheBust // cache
            };



            params.text = this.config.shareText + ( t.title || '');
            params.url =  t.link || t.linkURL;

            if( t.hashtags )
                params.hashtags = t.hashtags;

            var query = $.map( params, function (val,key) {
                return escape(key) + "=" + escape(val);
            }).join('&');

            var el = this.find('twitter');
            var src = this.config.twitterApi + "#" + query;

            // force a reload even though the url doesn't change before the hash
            el.attr('src', '');
            setTimeout( function () {
                el.attr('src', src);
            },0);
        },

        setFacebook : function (t) {

            var params = {
                'href' : '',
                'layout' : 'button_count',
                'show_faces' : false,
                'action' : 'like',
                'colorscheme' : 'light',
                'width' : '',
                'height' : ''
            };

            var el = this.find('facebook');

            params.href = t.link || t.linkURL || document.location.toString();
            params.width = el.width();
            params.height = el.height();

            var src = this.config.facebookApi  + "?" + $.param(params, true);
            el.attr('src', src);
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
            return  this.config.cssPrefix + (className ? '-' + className : '');
        }
    };
})();
