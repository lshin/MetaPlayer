
(function () {

    var $ = jQuery;

    var PopcornPlayer = function (popcorn) {

        // fix up canPlayType

    };



    MetaPlayer.addPlayer("popcorn", function (popcorn, options) {
       this.popcorn = popcorn;
       return new PopcornPlayer(popcorn);
    });
})();