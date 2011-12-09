

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
        });

        unit.test("seek to end", function () {
            unit.event("seeked", self.media, "seeked     event", function (){
                unit.event("ended", self.media, "ended event");
                unit.event("mediaChange", self.service, "media change event");
            });
            self.media.currentTime = self.media.duration - 3;
            self.media.play();
        });

        unit.test("next clip test ", function () {
            unit.equal(self.media.index, 1, "now on second video");
            unit.equal( self.getCurrentTitle(), "Video 2", "second video title matches");

        });

        // TEST: Playlist Loading
        // TEST: Next Previous
        // TEST: Index
        // TEST: Auto Advance
    }
};