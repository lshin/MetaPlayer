(function () {

    var $ = jQuery;

    var defaults = {
    };

    var MetaData = function (options){

        if( !(this instanceof MetaData ))
            return new MetaData(options);

        this.config = $.extend({}, defaults, options);
        this.dispatcher = MetaPlayer.dispatcher(this);
        this._data = {};
        this._cues = {};
        this._callbacks = {};
        this._lastUri = null;
    };

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

    /**
     * Fired when new cues are received as a result of a load() request.
     * @name CUES
     * @event
     * @param data The cues from a resulting load() request.
     */
    MetaData.CUES = "cues";

    // register with framework as a plugin
    MetaPlayer.addPlugin("metadata", function (options) {
        this.metadata = new MetaData(options);
    });

    MetaData.prototype = {

        /**
         * Request MetaData for an uri
         * @param uri
         * @param callback (optional)  If specified will suppress the DATA event
         */
        load : function ( uri, callback, scope) {
            // calling w/o callback will trigger a DATA event if uri changes
            if( callback )
                this._queue(uri, callback, scope);
            else
                this._lastUri = uri;

            console.log("LOAD ", uri)

            // cache hit gets response immediately, otherwise request data via LOAD
            if( this._data[uri] && this._data[uri]._cached ) {
                this._response(uri);
                this._dispatchCues(uri)
                return true;
            }

            var e = this.createEvent();
            e.initEvent(MetaData.LOAD, false, true);
            e.uri = uri;

            if( this.dispatchEvent(e) ){
                return false; // no one is handling this request for data
            }
            else {
                return true; // async lookup, they should wait
            }
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
         * Bulk adding of cue lists to a uri.
         * @param cuelists a dictionary of cue array, indexed by cue type.
         * @param uri (optional) Data uri, or last load() uri.
         */
        setCueLists : function ( cuelists , uri) {
            var self = this;
            $.each(cuelists, function(type, cues){
                self.setCues(type, cues, uri)
            });
        },

        /**
         * For a given cue type, adds an array of cues events, triggering a CUE event
         * if the uri has focus.
         * @param type The name of the cue list (eg: "caption", "twitter", etc)
         * @param cues An array of cue obects.
         * @param uri (optional) Data uri, or last load() uri.
         */
        setCues : function (type, cues , uri){
            var guid = uri || this._lastUri;

            if( ! this._cues[guid] )
                this._cues[guid] = {};

            this._cues[guid][type] = cues;
            this._dispatchCues(guid, type)
        },

        /**
         * Returns an array of caption cues events. Shorthand for getCues("caption")
         * @param uri (optional) Data uri, or last load() uri.
         */
        getCaptions : function ( uri ){
            return this.getCues("captions", uri);
        },

        /**
         * Returns an array of cue objects for a given type.
         * @param type The name of the cue list (eg: "caption", "twitter", etc)
         * @param uri (optional) Data uri, or last load() uri.
         */
        getCues : function (type, uri) {
            var guid = uri || this._lastUri;
            if(! this._cues[guid]  || ! this._cues[guid][type])
                return [];
            return this._cues[guid][type];
        },

        // broadcasts cue data available for guid, if it matches the current focus uri
        // defaults to all known cues, or can have a single type specified
        _dispatchCues : function ( guid, type ) {
            if( guid != this._lastUri )
                return;

            var self = this;
            var cues = this.getCues();

            var types = [];
            if( type ) {
                types.push(type)
            }
            else if( this._cues[guid] ){
                types = $.map(this._cues[guid], function(cues, type) {
                    return type;
                });
            }

            $.each(types, function(i, type) {
                var e = self.createEvent();
                e.initEvent(MetaData.CUES, false, true);
                e.uri = guid;
                e.type = type;
                e.cues = self.getCues(type);
                self.dispatchEvent(e);
            });
        },

        /**
         * Frees external references for manual object destruction.
         * @destructor
         */
        destroy : function  () {
            this.dispatcher.destroy();
        },

        /* "private" */

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