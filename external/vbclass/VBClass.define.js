this.VBClass || (function(window){
    /*! (C) WebReflection - Mit Style License */
    function avoidSetValue(object, key, value) {
        __defineSetter__.call(object, key, throwSetAttempt);
        __defineGetter__.call(object, key, function () {
            return value;
        });
    }
    function delegateConstructor(constructor, original) {
        return function VBClass() {
            var object = new original;
            constructor.apply(object, arguments);
            return object;
        };
    }
    function throwSetAttempt() {
        throw "read only";
    }
    var
        o = {},
        Object = window.Object,
        hasOwnProperty = o.hasOwnProperty,
        __defineGetter__ = o.__defineGetter__,
        __defineSetter__ = o.__defineSetter__
    ;
    window.VBClass = function VBClass(name, definition) {
        if (hasOwnProperty.call(window, name)) {
            throw "Class redefined";
        }
        var
            constructor = function VBClass() {},
            proto = constructor.prototype,
            current, key
        ;
        for (key in definition) {
            if (hasOwnProperty.call(definition, key) && key != "constructor") {
                current = definition[key];
                if (hasOwnProperty.call(current, "value")) {
                    typeof(current = current.value) == "function" ?
                        avoidSetValue(proto, key, current) :
                        proto[key] = current
                    ;
                } else {
                    if (hasOwnProperty.call(current, "get")) {
                        __defineGetter__.call(proto, key, current.get);
                    }
                    if (hasOwnProperty.call(current, "set")) {
                        __defineSetter__.call(proto, key, current.set);
                    }
                }
            }
        }
        return (window[name] = hasOwnProperty.call(definition, "constructor") ?
            delegateConstructor(definition.constructor.value, constructor) :
            function VBClass() {
                return new constructor;
            }
        );
    };
}(this));