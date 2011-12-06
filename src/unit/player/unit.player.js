

var PlayerUnit = function (){
    if( ! ( this instanceof PlayerUnit ))
        return new PlayerUnit();

    this.media = null;
};

PlayerUnit.prototype = {
    addTests : function (unit) {
        var self = this;

        unit.test("media setup",  function () {
            unit.nequal( self.media, undefined, "media instance not null");
            unit.equal( isNaN(self.media.duration), true, "duration ended is NaN");
        });

        unit.test("load events",  function () {
            unit.event("loadstart", self.media, "loadstart event");

            // FF bug: won't fire unless media.play() already called
            unit.log("canplay/canplaythrough event are not supported in FF w/ autoplay=false");
            unit.event("canplay", self.media, "canplay event");
            unit.event("canplaythrough", self.media, "canplaythrough event");

            unit.event("loadeddata", self.media, "loadeddata event");

            unit.event("durationchange", self.media, "durationchange event", function (){
                unit.equal( self.media.duration > 0, true, "duration > 0");
            });

            unit.event("loadedmetadata", self.media, "loadedmetadata event", function (){
                unit.equal( isNaN(self.media.duration), false, "duration defined");
            });

            self.media.load();
        });

        unit.test("volume",  function () {
            unit.equal( self.media.volume, 1, "media.ended is 1");
            self.media.volume = .5;
            unit.event("volumechange", self.media, "volumechange event", function (e) {
                unit.equal( self.media.volume, .5, "init: self.media.ended is 1");
            })
        });

        unit.test("mute",  function () {
            unit.equal( self.media.muted, false, "set self.media.muted false");
            self.media.muted = true;
            unit.event("volumechange", self.media, "muted volumechange event", function (e) {
                unit.equal( self.media.muted, true, "set self.media.muted true");
            })
        });

        unit.test("currentTime",  function () {
            unit.equal( self.media.currentTime, 0, "initial self.media.currentTime is 0");
            unit.equal( self.media.seeking, false, "initial self.media.seeking is false");

            self.media.currentTime = 30;
            unit.event("seeking", self.media, "seeking event", function (e) {
                unit.equal( self.media.seeking, true, "seeking media.seeking is true");
            });
            unit.event("seeked", self.media, "seeked event", function (e) {
                unit.equal( self.media.currentTime, 30, "seeked currentTime 30");
            });
            unit.event("timeupdate", self.media, "timeupdate event", function (e) {
                unit.equal( self.media.currentTime, 30, "timeupdate currentTime 30");
            });

        });

        unit.test("play",  function () {
            unit.equal( self.media.ended, false, "media.ended is false");
            unit.equal( self.media.paused, true, "media.paused is true");

            unit.event("play", self.media, "play event", function (e) {
                unit.equal( self.media.paused, false, "media.paused is false");
            });
            unit.event("timeupdate", self.media, "timeupdate event");
            unit.event("playing", self.media, "volumechange event");
            self.media.play();
        });

        unit.test("pause",  function () {
            unit.equal( self.media.ended, false, "media.ended is false");
            unit.equal( self.media.paused, false, "media.paused is false");

            unit.event("pause", self.media, "play event", function (e) {
                unit.equal( self.media.paused, true, "media.paused is true");
            });
            self.media.pause();
        });

        unit.test("seek while playing",  function () {
            unit.equal( self.media.paused, true, "media.paused is true");
            unit.equal( self.media.seeking, false, "initial self.media.seeking is false");

            unit.event("playing", self.media, "seeking event", function (e) {
                unit.equal( self.media.paused, false, "media.paused is false");
                self.media.currentTime = 10;
            });

            unit.event("seeking", self.media, "seeking event", function (e) {
                unit.equal( self.media.seeking, true, "media.seeking is true");
            });

            unit.event("seeked", self.media, "seeked event", function (e) {
                unit.equal( Math.abs(self.media.currentTime - 10) < 1, true, "seeked currentTime is near 10");
            });

            unit.event("timeupdate", self.media, "seeking event");

            self.media.play();
        });


        unit.test("ended event",  function () {
            unit.equal( self.media.paused, false, "media.paused is false");

            self.media.currentTime = self.media.duration - 2;

            unit.event("seeking", self.media, "seeking event");
            unit.event("ended", self.media, "ended event");

        });

    }
};