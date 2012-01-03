



var Foo = function (el) {
    this.__currentTime = .123;
    this.__readyState = 456;
    this.node = $("<div></div>").appendTo(el);
};

Foo.prototype = {
    attach : function (el) {
        var map =  Ramp.Utils.Proxy.mapProperty;
        map('currentTime readyState', el, this);
    },

    // MediaController

    play : function () {

    },

    pause : function () {

    },

    duration :  function () {

    },

    readyState : function (val) {
        console.log("ready!")
        if( val !== undefined )
            this.__readyState = val;
        return this.__readyState;
    },

    currentTime : function (val) {
        console.log(["current! ", val, this, this.__currentTime])
        if( val !== undefined )
            this.__currentTime = val;
        console.log(["...current! ", val, this, this.__currentTime])
        return this.__currentTime;
    },

    paused : function () {
        return this.__paused;
    },

    volume : function () {

    },

    muted : function () {

    }

//    buffered : function () {    },
//    played : function () {    },
//    defaultPlaybackRate : function () {    },
//    playbackRate : function () {    },
//    seekable :  function () {    }
};

//function mapProperty (obj, prop, source ) {
//    defineProperty(obj, prop, {
//        get : function () {
//            return source["_" + prop].call(source);
//        },
//        set : function (val) {
//            return source["_" + prop].call(source, val);
//        }
//    })
//}
//
//function defineProperty (obj, prop, descriptor) {
//    try {
//        Object.defineProperty(obj, prop, descriptor);
//    }
//    catch(e){
//        console.log("not defineProperty");
//    }
//
//    if( obj.__defineGetter && descriptor.get )
//        obj.__defineGetter__( prop, descriptor.get);
//    if( descriptor.set && obj.__defineSetter__ )
//        obj.__defineSetter__( prop, descriptor.set);
//}


var t, foo;
$(function () {
    t = document.getElementById('target');
    c = document.getElementById('control');
    foo = new Foo(t);
    foo.attach(t)
});