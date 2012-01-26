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
        this.service.listen("metadata", this.onMetaData, this );
    };

    Ramp.social = Social;

    Social.prototype = {

        addDom : function () {
            var el = this.create().hide().appendTo(this.container)
            this.create('clear').appendTo( el );
        },

        onMetaData : function (e, data) {
            this.setFacebook(data);
            this.setTwitter(data);
            this.find().show();
        },

        setTwitter : function (t) {

            var params = {
//                via : '',
//                related : '',
                count : 'horizontal',
                lang : 'en'
            };

            params.text = this.config.shareText + ( t.title || '');
            params.url =  t.link || t.linkURL;

            if( t.hashtags )
                params.hashtags = t.hashtags;

            var query = $.map( params, function (val,key) {
                return escape(key) + "=" + escape(val);
            }).join('&');


            var el = this.create('twitter', 'iframe')
                .attr('allowtransparency', 'true')
                .attr('frameborder', '0');

            var src = this.config.twitterApi + "#" + query;
            el.attr('src', src);

            this.find('twitter').remove();
            this.find().prepend(el);
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

            var el = this.create('facebook', 'iframe')
                .attr('allowtransparency', 'true')
                .attr('frameborder', '0');

            params.href = t.link || t.linkURL || document.location.toString();
            params.width = el.width();
            params.height = el.height();

            var src = this.config.facebookApi  + "?" + $.param(params, true);
            el.attr('src', src);

            this.find('facebook').remove();
            this.find().prepend(el);
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
