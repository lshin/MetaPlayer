
(function () {

    Ramp.Utils.EventDispatcher = function ( target ) {

        if( target._listeners )
            return;

        target._listeners = {};
        target._observed = {};

        target.listen = function ( eventType, callback, scope, data) {
            if( ! this._listeners[eventType] )
                this._listeners[eventType] = [];

            this._listeners[eventType].push({
                fn : callback,
                scope : scope,
                data: data
            })
        };

        target.forget = function (type, callback) {
            var l = this._listeners[type];
            if( ! l )
                return;
            var i;
            for(i=l.length - 1; i >= 0; i-- ){
                if( l[i].fn = callback ) {
                    l.splice(i, 1);
                }
            }
        };

        target.dispatch = function (eventType, data, eventObject) {
            if( ! this._listeners[eventType] )
                return;

            if( ! eventObject )
                eventObject = {};

            eventObject.type = eventType;
            eventObject.source = this;

            if( data !== undefined)
                eventObject.data = data;

            if( data && this._observed[eventType] !== undefined )
                this._observed[eventType] = data;

            var l = this._listeners[eventType];
            if( ! l )
                return;

            for(var i=0; i < l.length; i++ ){
                l[i].fn.call(l[i].scope || this, eventObject, l[i].data )
            }
        };

        // makes myobject.eventtype(fn) listen for event
        // and trigger callback with data immediately, if mapped property not null
        // useful for object that load data synchronously
        // syntax based on jQuery events:  $(element).click( callback );
        target.observable = function (type) {
            this._observed[type] = null;
            this[type] = function (callback, scope) {
                var self = this;
                var listener = function (e) {
                    callback.call(scope , self._observed[type] );
                };
                this.listen(type, listener);
                if( self._observed[type] )
                    setTimeout(listener, 0);
            };
        },

        target.addEventListener = function (eventType, callback) {
            this.listen(eventType, callback);
        };

        target.removeEventListener = function (type, callback) {
            this.forget(type, callback);
        };

        target.dispatchEvent = function (event) {
            if( ! (event instanceof Object) )
                throw "invalid event";
            this.dispatch(event.type, null, event);
        };

    }

})();
