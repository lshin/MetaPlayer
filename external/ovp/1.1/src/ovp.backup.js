	/***********************************************************************/
	/**************************Object***************************************/
	/***********************************************************************/
	///////////////////////////////////////////////
	// OVP Object
	/**
	 * The ovp object constructor, called internally and set as a page global.
	 */
	var _ovp = function(){
		this._config = DEFAULTS;
		this._defaults = DEFAULTS;
		this.product_info = PRODUCT_INFO;
	}
	
	/**
	 * Merges a config into the current config
	 * @param {Object} config - the config variables to pull in
	 */
	_ovp.prototype.init = function(config) {
		this._config = mergeConfigs(mergeConfigs(DEFAULTS, this._config), config);
	};

	/**
	 * Renders the player to the given node ID.  The children of this node will
	 be replaced so be warned.
	 * @param {Object} id The id of where to render the video
	 * @param {Object} videoconf The video configuration to render
	 */
	_ovp.prototype.render = function(element, videoconf){
		if (isString(element)) element = document.getElementById(element);
		if (!element) return;
		if (element) {
			this._playerRender(element, videoconf);
		}
	};

	/**
	 * Adopts all of the video tags on a page
	 * @param {String} selector - the selector syntax of the node(s) to adopt
	 */
	_ovp.prototype.adopt = function(){
		var videos = document.body.getElementsByTagName('video');
		for (var i=0;i<videos.length;i++) {
			this._playerRender(videos[i]);
		}
	};
	
	/**
	 * Renders the Feed Display class to the given node ID.  This will download the
	 * feed url and use its contents to add items to a particular location as a
	 * content-slider.
	 * @param {String} id - the id of the element where you would like to render the feed display
	 * @param {Object} feedUrl - the url of the feed to use (must meet sandbox restrictions)
	 */
	_ovp.prototype.renderFeed = function(id, feedUrl) {
		var me = this;	//scoping for "this"
	    jQuery.getFeed({
	        url: feedUrl,
	        success: function(feed) {
				var items = $('<ul></ul>');
				var html = '';
				var el = $('#'+id);
	            for (var i = 0; i < feed.items.length; i++) {
					html = '';
					var item = feed.items[i];
					var l_item = $('<li style="position:relative;background-image:url('+item.thumbnail+');background-repeat:no-repeat;" id="'+item.id+'" ></li>');
					l_item.bind('click', {'item': item}, function(e){
						el.fadeOut('fast', function(){ //fade out and call render
							me.render(el.get(0), item_to_videoconfig(e.data.item))
						});
					});
					html += '<div style="position:absolute;top:0px;left:0px;height:100%;width:100%;"><img src="'+item.thumbnail+'" style="height:100%;width:100%;"></div><h2 style="background:black;opacity:.6;color:white;margin-bottom:0px;padding:.5em;">'+item.title+'</h2>';
					html += '<h3 style="background:black;opacity:.6;color:white;margin-top:0px;padding:.5em;">'+item.description+'</h3></li>';
					l_item.append($(html));
					items.append(l_item);
				}
				var player = $('<div class="feedSlider"></div>').append($('<div class="wrapper"></div>').append(items));
				el.append(player);
				//player.anythingSlider();
				player.feedSlider();
	        }
	    });
	}
		
	_ovp.prototype._playerRender = function(node, videoconf) {
		// Attempt any registered plugins for the Video Object
		var player = this._pluginCaller('strategy');
		if ( player && this._getPlayerTestFunction(player)() ) {
			var video = this._getVideoObject(player)
			video.render(node);
		} else {
			//determine a Video Object on our own, the plugin didn't give us one
			for (var x=0;x<this._config.strategy.order.length;x++) {
				player = this._config.strategy.order[x];
				if ( player && this._getPlayerTestFunction(player)(this._config.players[player].minver) ) {
					// The player seems to be able to handle the environment, now what about the video config
					var video = this._getVideoObject(player)
					if (videoconf) {
						video.videoconfig = videoconf;
					} else {
						video.parseFromDomNode(node);
					}
					if ( video.canPlay() ) {
						video.render(node);
						break;
					}
				}
			}
		}
	};
		
	/**
	 * Factory method, returns a testing function for the given type
	 * @param {String} type - the type to check for
	 */
	_ovp.prototype._getPlayerTestFunction = function(type) {
		var plugin_test_func = this._pluginCaller('gettestfunction', type);
		if (plugin_test_func) {
			return plugin_test_func;
		} else if (type == 'Flash') {
			return this.isFlashSupported;
		} else if (type == 'Silverlight') {
			return this.isSilverlightSupported;
		} else if (type == 'HTML5') {
			return this.isHTML5Supported;
		}
		return function(){return false;};
	}
	
	/**
	 * Factory method, returns a video object for the given type
	 * @param {String} type - the type to check for
	 */
	_ovp.prototype._getVideoObject = function(type) {
		var pluginVideoObject = this._pluginCaller('getvideoobject', type);
		if (pluginVideoObject) {
			return pluginVideoObject
		} else if (type == 'Flash') {
			return new FlashVideo(this._config);
		} else if (type == 'Silverlight') {
			return new SilverlightVideo(this._config);
		} else if (type == 'HTML5') {
			return new HTML5Video(this._config);
		}
		return function(){new Video(this._config);};
	}
	
	/**
	 * Detects browser support for the video tag.
	 * @returns {boolean} the result of the test
	 */
	_ovp.prototype.isHTML5Supported = function(minver){
		var vidtest = document.createElement('video');
		return (('controls' in vidtest));
	};
	
	/**
	 * Detects browser support for Flash, uses swfobject's built in detection.
	 * @returns {boolean} the result of the test
	 */
	_ovp.prototype.isFlashSupported = function(minver){
		return swfobject.hasFlashPlayerVersion(minver);
	};
	
	/**
	 * Detects browser support for Silverlight, uses silverlight.js's built in
	 * detection.
	 * @returns {boolean} the result of the test
	 */
	_ovp.prototype.isSilverlightSupported = function(minver){
		return Silverlight.isInstalled(minver);
	};
		
	/**
	 * Finds the appropriate plugin from the plugins config on the object and
	 * manages the calling to/from the plugin.
	 * @param {String} hookname The name of the plugin hook to target.
	 */
	_ovp.prototype._pluginCaller = function(hookname) {
		for (var i=0;i<this._config.plugins.length;i++){
			var plugin = this._config.plugins[i];
			if (plugin['hook'] == hookname) {
				return plugin['ref'](arguments);
			}
		}
		return null;
	}
	
