	
	///////////////////////////////////////////////
	// Utility functions
	/**
	 * extends a subClass type from a baseClass type
	 * @param {Object} subClass
	 * @param {Object} baseClass
	 */
	function extend(subClass, baseClass) {
	   function inheritance() {}
	   inheritance.prototype = baseClass.prototype;
	   subClass.prototype = new inheritance();
	   subClass.prototype.constructor = subClass;
	   subClass.baseConstructor = baseClass;
	   subClass.superClass = baseClass.prototype;
	}

	/**
	 * adds a replace method much like append or prepend but handling the
	 * behavior of a dom-element's replaceChild method
	 */
	jQuery.fn.replace = function() {
	    var stack = [];
	    return this.domManip(arguments, true, 1, function(a){
	        this.parentNode.replaceChild( a, this );
	        stack.push(a);
	    }).pushStack( stack );
	};

	/**
	 * determines if the user-agent is an iDevice such as iPhone/iPod/iPad
	 * returns {boolean} true if it's an idevice
	 */
	function isIDevice(uagent) {
		if ( uagent.match(/iPhone/i) ) return true;
		if ( uagent.match(/iPod/i) ) return true;
		if ( uagent.match(/iPad/i) ) return true;
		return false;
	}
	
	function isOSX106OrHigher(uagent) {
		//var UA = String(uagent.match(/Intel Mac OS X 10_6/));
		var UA = String(uagent.match(/Intel Mac OS X [0-9_]+/));
		if ( !UA ) return false;
		var versmaj = UA.split('_')[0].split(' ')[4];
		var versmin = UA.split('_')[1];
		return ( (versmaj==10 && versmin>=6) || (versmaj>10) ) ? true : false;
	}

	/**
	 * Get the computed style of an element
	 * @param el {Node} the node to query for style information
	 * @param css_style {String} the style value to retrieve
	 */
	function getStyle(el, css_style){
		var current_value = "";
		if(document.defaultView && document.defaultView.getComputedStyle) {
			current_value = document.defaultView.getComputedStyle(el, "").getPropertyValue( cssStyle);
		} else if(oElm.currentStyle) {
			css_style = css_style.replace(/\-(\w)/g, function (x, y){ return y.toUpperCase(); });
			current_value = el.currentStyle[css_style];
		}
		return current_value;
	}

	/**
	 * Event adding.  Produces a dynamic function
	 * @param el {Node} the node to add the event to
	 * @param type {String} the event type to attach to
	 * @param fn {function} the function to execute
	 */
	_addEvent = (function () {
	  if (document.addEventListener) {
	    return function (el, type, fn) {
	      if (el && el.nodeName || el === window) {
	        el.addEventListener(type, fn, false);
	      } else if (el && el.length) {
	        for (var i = 0; i < el.length; i++) { addEvent(el[i], type, fn); }
	      }
	    };
	  } else {
	    return function (el, type, fn) {
	      if (el && el.nodeName || el === window) {
	        el.attachEvent('on' + type, function () { return fn.call(el, window.event); });
	      } else if (el && el.length) {
	        for (var i = 0; i < el.length; i++) { addEvent(el[i], type, fn); }
	      }
	    };
	  }
	})();

	/**
	 * Recursively merges two config objects 
	 * @param {Object} base - the base config (default)
	 * @param {Object} ext - the extending config
	 */
	function mergeConfigs(base, ext) {
		for (var p in ext) {
			try {
				// Property in destination object set; update its value.
				if ( ext[p].constructor==Object ) {
					base[p] = mergeConfig(base[p], ext[p]);
				} else {
					base[p] = ext[p];
				}
			} catch(e) {
				// Property in destination object not set; create it and set its value.
				base[p] = ext[p];
			}
		}
		return base;
	}

	/**
	 * Detects if an object is a string
	 * @param {Object} object
	 */
	function isString(object) {
		return Object.prototype.toString.call(object) === '[object String]';
	}


	/**
	 * Determines if the given element is in the given array
	 * @param element {Object} the element to look for in the array
	 * @param arr {array} the array to search
	 * @returns {Boolean}
	 */
	function arrayContains(element, arr) {
		for (var i=0;i<arr.length;i++) {
			if (arr[i] == element) { return true; }
		}
		return false;
	};
	
	/**
	 * Generates a GUID-like string using the most common approach
	 * @returns {String}
	 */
	function generateGuid() {
		var S4 = function() {
		   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		}
	   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
	}

	/**
	 * accepts a jfeeditem object and returns a video configuration
	 * @param {Object} item
	 */
	function item_to_videoconfig(item) {
		conf = {
			'sources':[],
			'posterimg':'',
			'autoplay':true,
			'autobuffer':true,
			'controls':true,
			'height':'354',
			'width':'640',
			'scalemode':'fit',
			'id':'someid'	
		};
		conf.posterimg = item.thumbnail;
		conf.id = item.id;
		var files = item.getFiles();
		for (var x=0;x<files.length;x++) {
			var file = files[x];
			var src = {'src':file.src,'type':file.type};
			conf.sources.push(src);
		}
		return conf;
	}
	
	/**
	 * parses the file extension from a filename
	 * @param filename {String} the filename
	 * @returns {String} the extension (excluding the .)
	 */
	function _getExtension(filename) {
		var fparts = filename.split('.');
		if (fparts.length == 0) return null;
		return fparts[fparts.length-1];
	}

	/**
	 * Finds the appropriate plugin from the plugins part of the passed config
	 * and manages the calling to/from the plugin.
	 * @param {Object} the standard ovp config object to examine for a plugin
	 * @param {String} hookname The name of the plugin hook to target.
	 * @param {Varient} ... other arguments to pass to the plugin hook call
	 */
	function _pluginCaller() {
		// make the arguments object an actual array so we can strip stuff off it
		var args = Array.prototype.slice.call(arguments);
		var cfg = args.shift();
		var hname = args.shift();
		// now look for our call and return the result of calling the function
		// if available
		for (var i=0;i<cfg.plugins.length;i++){
			var plugin = cfg.plugins[i];
			if (plugin['hook'] == hname) {
				return plugin['ref'](args);
			}
		}
		return null;
	}
