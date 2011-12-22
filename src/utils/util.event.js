
(function () {
    var $ = jQuery;

    var EventDispatcher = function (target){
        if( ! (this instanceof EventDispatcher ))
            return new EventDispatcher(target);
        this._listeners = {};
        this._observed = {};

        if( target )
            this.attach(target);
    };

    Ramp.Utils.EventDispatcher = EventDispatcher;

    EventDispatcher.prototype = {
        _interface : "listen forget dispatch addEventListener removeEventListener dispatchEvent",

        attach : function (target) {
            var names = this._interface.split(/\s+/g);
            var i, name;
            for(i = 0; i < names.length; i++ ) {
                name = names[i];
                target[name] = this._wrap(name);
            }
        },

        _wrap : function(name) {
            var self = this;
            return function () {
                return self[name].apply(self, arguments);
            }
        },

        listen : function ( eventType, callback, scope, data) {
            if( ! this._listeners[eventType] )
                this._listeners[eventType] = [];

            this._listeners[eventType].push({
                fn : callback,
                scope : scope,
                data: data
            })
        },

        forget : function (type, callback) {
            var l = this._listeners[type];
            if( ! l )
                return;
            var i;
            for(i=l.length - 1; i >= 0; i-- ){
                if( l[i].fn = callback ) {
                    l.splice(i, 1);
                }
            }
        },

        dispatch : function (eventType, data, eventObject) {
            var l = this._listeners[eventType];

            if( ! eventObject )
                eventObject = {};

            eventObject.type = eventType;
            eventObject.source = this;

            if( data !== undefined)
                eventObject.data = data;

            if( this._observed[eventType] !== undefined )
                this._observed[eventType] = data || true;

            if( ! l )
                return;

            for(var i=0; i < l.length; i++ ){
                l[i].fn.call(l[i].scope || this, eventObject, l[i].data )
            }
        },

        // makes myobject.eventtype(fn) listen for event
        // and trigger callback with data immediately, if mapped property not null
        // useful for object that load data synchronously
        // syntax based on jQuery events:  $(element).click( callback );
        observer : function (eventType) {
            this._observed[eventType] = null;
            var self = this;
            return function (callback, scope) {
                var listener = function (e) {
                    callback.call(scope , self._observed[eventType] );
                };
                self.listen(eventType, listener);
                if( self._observed[eventType] !== null )
                    setTimeout(listener, 0);
            };
        },

        // traditional event apis
        addEventListener : function (eventType, callback) {
            this.listen(eventType, callback);
        },

        removeEventListener : function (type, callback) {
            this.forget(type, callback);
        },

        dispatchEvent : function (event) {
            if( ! (event instanceof Object) )
                throw "invalid event";
            this.dispatch(event.type, null, event);
        }

    }

})();
