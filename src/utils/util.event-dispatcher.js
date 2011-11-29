
(function () {

    Ramp.EventDispatcher = function ( target ) {

        if( target._listeners )
            return;

        target._listeners = {};

        target.listen = function ( eventType, callback, scope, data) {
            if( ! this._listeners[eventType] )
                this._listeners[eventType] = [];

            this._listeners[eventType].push({
                fn : callback,
                scope : scope,
                data: data
            })
        };

        target.dispatch = function (eventType, eventObject) {
            if( ! this._listeners[eventType] )
                return;

            if( ! eventObject )
                eventObject = {};

            eventObject.type = eventType;
            eventObject.source = this;

            var l = this._listeners[eventType];
            if( ! l )
                return;

            for(var i=0; i < l.length; i++ ){
                l[i].fn.call(l[i].scope || this, eventObject, l[i].data )
            }
        };
    }

})();
