(function () {
    var $ = jQuery;

    var Proxy = {
        proxyProperty : function (props, source, target ){
            $.each(props.split(/\s+/g), function (i, prop) {
                Proxy.mapProperty(prop, target, source);
            });
        },

        proxyFunction : function (props, source, target ){
            $.each(props.split(/\s+/g), function (i, prop) {
                target[prop] = function () {
                    return source[prop].apply(source, arguments);
                };
            });
        },

        proxyEvent : function (types, source, target ){
            $.each(types.split(/\s+/g), function (i, type) {
//                Proxy.proxyFunction("on" + type, source, target);
                $(source).bind(type, function (e) {
                    $(target).trigger(e);
                });
            });
        },

        mapProperty : function (props, target, source){
            // example :   map("name" myObject, myObject._name);
            //             map("name" myObject);
            if( ! source )
                source = target;

            $.each(props.split(/\s+/g), function (i, prop) {

                // support _propName
                var sProp = (source[prop] == undefined)
                    ?  "_" + prop
                    : prop;

                var fn;

                if( source[sProp] instanceof Function ){
                    fn = function () {
                        return source[sProp].apply(source, arguments);
                    };
                }
                else {
                    fn = function (val) {
                        if( val !== undefined )
                            source[sProp] = val;
                        return source[sProp];
                    };
                }

                Proxy.define(target, prop, { get : fn, set : fn });
            });
        },

        define : function (obj, prop, descriptor) {

            if( Object.defineProperty ){
                try {
                    // modern browsers
                    return Object.defineProperty(obj, prop, descriptor);
                }
                catch(e){
                    // ie8 exception if not DOM element
                    console.log(["IE8? " , obj, e]);
                }
            }

            if( obj.__defineGetter ){
                // old FF, webkit
                if( descriptor.get )
                    obj.__defineGetter__( prop, descriptor.get);
                if( descriptor.set && obj.__defineSetter__ )
                    obj.__defineSetter__( prop, descriptor.set);
                return;
            }


            // ie7 support, no getter/setter, but we know when the property changes
            // (on dom elements only)

            if( ! obj.__definedProperties__ )
                obj.__definedProperties__ = {};

            obj.__definedProperties__[prop] = descriptor;

            if( ! obj.onpropertychange ) {
                obj.onpropertychange = function () {
                    var p = event.propertyName;
                    var desc = obj.__definedProperties__[p];
                    if( desc && desc.set )
                        desc.set(obj[p]);
                };
            }
        }
    };

    if( ! window.Ramp )
        window.Ramp = {};

    if( ! Ramp.Utils )
        Ramp.Utils = {};

    Ramp.Utils.Proxy = Proxy;


})();
