(function () {

    var Proxy = {
        proxyProperty : function (props, source, target ){
            $.each(props.split(/\s+/g), function (i, prop) {
                var fn = function (val) {
                    if( val !== undefined )
                        source[prop] = val;
                    return source[prop];
                };
                Proxy.mapProperty(prop, target, fn);
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
                Proxy.proxyFunction("on" + type, source, target);
                source.addEventListener(type, function (e) {
                    target.dispatchEvent(e);
                });
            });
        },

        mapProperty : function (props, target, fn){
            // example :   map("name" myObject, myObject._name);
            //             map("name" myObject);
            $.each(props.split(/\s+/g), function (i, prop) {
                var callback = fn || target["_" + prop];
                Proxy.define(target, prop, { get : callback, set : callback });
            });
        },


        define : function (obj, prop, descriptor) {
            if( Object.defineProperty )
                return Object.defineProperty(obj, prop, descriptor);
            descriptor.get && obj.__defineGetter__( prop, options.get);
            descriptor.set && obj.__defineSetter__( prop, options.set);
        }

    };

    Ramp.Utils.Proxy = Proxy;

})();
