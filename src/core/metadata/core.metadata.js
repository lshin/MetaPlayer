(function () {

    var $ = jQuery;

    var defaults = {
    };

    var MetaData = function (player, options){

        if( !(this instanceof MetaData ))
            return new MetaData(options);

        this.config = $.extend({}, defaults, options);
        MetaPlayer.dispatcher(this);
        this._data = {};
        this._callbacks = {};
        this._lastUri = null;
    };


    /**
     * Fired when a uri becomes the focus, broadcasting events on updates.
     * @name FOCUS
     * @event
     * @param uri The new focus uri
     */
    MetaData.FOCUS = "focus";

    /**
     * Fired when MetaData needs a resource to be defined.
     * @name LOAD
     * @event
     * @param uri Opaque string which can be used by a service to load metadata.
     */
    MetaData.LOAD = "load";

    /**
     * Fired when new metadata is received as a result of a load() request.
     * @name LOAD
     * @event
     * @param data The metadata from a resulting load() request.
     */
    MetaData.DATA = "data";


    // register with framework as a plugin
    MetaPlayer.addPlugin("metadata", function (options) {
        this.metadata = new MetaData(this, options);
    });

    MetaData.prototype = {

        /**
         * Request MetaData for an uri
         * @param uri
         * @param callback (optional)  If specified will suppress the DATA event
         */
        load : function ( uri, callback, scope) {
            var e;

            // calling w/o callback will trigger a DATA event if uri changes
            if( callback )
                this._queue(uri, callback, scope);
            else {
                this._lastUri = uri;
                e = this.createEvent();
                e.initEvent(MetaData.FOCUS);
                e.uri = uri;
                this.dispatchEvent(e);
            }

            // cache hit gets response immediately, otherwise request data via LOAD
            if( this._data[uri] && this._data[uri]._cached ) {
                this._response(uri);
                return true;
            }

            // dispatch event requesting metadata services
            e = this.createEvent();
            e.initEvent(MetaData.LOAD, false, true);
            e.uri = uri;

            if( this.dispatchEvent(e) ){
                return false; // no one is handling this request for data
            }
            else {
                return true; // async lookup, they should wait
            }
        },

        getFocusUri : function () {
            return this._lastUri;
        },

        /**
         * Returns any for a URI without causing an external lookup.
         * @param uri Optional argument specifying media guid. Defaults to last load() uri.
         */
        getData : function ( uri ){
            var guid = uri || this._lastUri;
            return this._data[guid]
        },

        /**
         * Sets the data for a URI, triggering DATA if the uri has focus.
         * @param data
         * @param uri (optional) Data uri, or last load() uri.
         * @param cache (optional) allow lookup of item on future calls to load(), defaults true.
         */
        setData : function (data, uri, cache ){
            var guid = uri || this._lastUri;
            this._data[guid] = $.extend(true, {}, this._data[guid], data);
            this._data[guid]._cached = ( cache == null ||  cache ) ? true : false;
            this._response(guid);
        },

        /**
         * Frees external references for manual object destruction.
         * @destructor
         */
        destroy : function  () {
            this.dispatcher.destroy();
            delete this.player;
        },

        // registers a callback
        _queue : function ( uri, callback, scope ) {
            if( ! this._callbacks[uri] )
                this._callbacks[uri] = [];
            this._callbacks[uri].push({ fn : callback, scope : scope });
        },

        // handles setting data, firing event and callbacks as necessary
        _response : function ( uri ){
             var data = this._data[uri];

            if( this._lastUri == uri ) {
                var e = this.createEvent();
                e.initEvent(MetaData.DATA, false, true);
                e.uri = uri;
                e.data = data;
                this.dispatchEvent(e);
            }

            if( this._callbacks[uri] ) {
                $.each( this._callbacks[uri] || [], function (i, callback ) {
                    callback.apply(callback.scope, data);
                });
                delete this._callbacks[uri];
            }
        }
    };

    MetaPlayer.MetaData = MetaData;

})();