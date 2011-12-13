

var PlaylistUnit = function (){
    if( ! ( this instanceof PlaylistUnit ))
        return new PlaylistUnit();

    this.nearTimeSec = 1;
    this.media = null;
    this.service = null;
};

PlaylistUnit.prototype = {

    getCurrentTitle : function () {
        return self.media.playlist[ self.media.index ].title;
    },

    addTests : function (unit) {
        var self = this;
        unit.test("service setup",  function () {
            unit.nequal( self.service, undefined, "service instance not null");
            self.service.related( unit.callback("related event", null, function(related){
                self.related = related;
            }))
        });

        unit.test("media setup",  function () {
            unit.nequal( self.media, undefined, "media instance not null");
            unit.event("canplay", self.media, "event can play");
            unit.equal( self.getCurrentTitle(), "Video 1", "first video title matches");
        });

        unit.test("intial state", function () {
            unit.equal( self.media.index, 0, "default index is 0");
            unit.equal(self.media.nextTrackIndex(), 1, "nextTrackIndex: 1");
        });

        unit.test("seek to end, autoadvance", function () {
            unit.equal(self.media.index, 0, "now on first video");
            unit.event("seeked", self.media, "seeked event", function (){
                unit.event("ended", self.media, "ended event");
                unit.event("trackChange", self.media, "trackChange event", function () {
                    unit.equal(self.media.index, 1, "now on second video");
                    unit.equal( self.getCurrentTitle(), "Video 2", "second video title matches");
                });
            });
            self.media.currentTime = self.media.duration - 3;
            self.media.play();
        });

        unit.test("index assign", function () {
            unit.equal(self.media.index, 1, "now on second video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.equal(self.media.index, 0, "now on first video");
            });
            self.media.index = 0;
        });

        unit.test("nextTrack()", function () {
            unit.equal(self.media.index, 0, "now on first video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.equal(self.media.index, 1, "now on second video");
            });
            self.media.nextTrack();
        });

        unit.test("previousTrack()", function () {
            unit.equal(self.media.index, 1, "now on second video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.equal(self.media.index, 0, "now on first video");
            });
            self.media.previousTrack();
        });

        unit.test("previousTrack() loops ", function () {
            unit.equal(self.media.index, 0, "now on first video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.equal(self.media.index, 1, "now on second video");
            });
            unit.equal(self.media.nextTrackIndex(), 1, "nextTrackIndex: 1");
            self.media.previousTrack()
        });

        unit.test("nextTrack() loops ", function () {
            unit.equal(self.media.index, 1, "now on second video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.equal(self.media.index, 0, "now on first video");
            });
            unit.equal(self.media.nextTrackIndex(), 0, "nextTrackIndex: 0");
            self.media.nextTrack()
        });

        unit.test("ended loops ", function () {
            unit.equal(self.media.index, 0, "now on first video");
            unit.event("trackChange", self.media, "trackChange event", function () {
                unit.event("canplay", self.media, "canplay event", function () {
                    unit.equal(self.media.index, self.media.playlist.length - 1, "now on last video");
                    unit.event("seeked", self.media, "seeked event", function (){
                        unit.event("ended", self.media, "ended event");
                        unit.event("trackChange", self.media, "trackChange event", function () {
                            unit.equal(self.media.index, 0, "now on first video");
                        });
                    });
                    self.media.currentTime = self.media.duration - 3;
                    self.media.play();
                });
            });
            self.media.index = self.media.playlist.length - 1;
        });

    }
};