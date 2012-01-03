
(function () {

    var $ = jQuery;

    var defaults = {
        autoLoad : true,
        related: true,
        loop : false,
        dispatcher : null
    };

    var MediaController = function () {

    };

    MediaController.prototype = {

        // Media extenstions:
        /*
        error
        src
        !currentSrc
        crossorigin
        !networkState
        preload
        !buffered[]
        load()
        !readyState
        !seeking
        currentTime
        initalTime
        duration
        startOffsetTime
        paused
        defaultPlaybackRate
        playbackRate
        played
        seekable
        ended
        autoplay
        loop
        play()
        pause()
        mediaGroup
        controller
        controls
        volume
        muted
        defaultMuted
        audioTracks
        videoTracks
        textTracks
        addTextTrack
         */

        // MediaController
        duration :  function () {},
        currentTime : function () {},
        paused : function () {},
        play : function () {},
        pause : function () {},
        volume : function () {},
        muted : function () {},
        buffered : function () {},

        played : function () {},
        defaultPlaybackRate : function () {},
        playbackRate : function () {},
        seekable :  function () {}


    };

})();
