	//////////////////////////////////////////////////////////////////
	// HTML5Video Object
	//////////////////////////////////////////////////////////////////
	/**
	 * Create an HTML5Video object, decended from the Base Video class
	 * @param {Object} config
	 */
	var HTML5Video = function(config){
		HTML5Video.baseConstructor.call(this,config);
	};
	extend(HTML5Video, Video);
	
	/**
	 * assigns any events that are specific to the html5 player
	 */
	HTML5Video.prototype._assignEvents = function() {
		var self = this;
		// Track loaded bytes (could also compute and store rate here as well)
		_addEvent(this.player, 'progress', function(evt) {
			self.bytesLoaded = evt.loaded;
			self.bytesTotal = evt.total;
		});
	}

	/**
	 * Determines if ths object can play based on what's in the sources config
	 */	
	HTML5Video.prototype.canPlay = function() {
		var retval = [];
		var sources = this.videoconfig.sources;
		var userAgent = navigator.userAgent.toLowerCase();
		var FF = (/mozilla/.test (userAgent) && !/(compatible|webkit)/.test(userAgent)) ? true : false;
		for (var i=0; i<sources.length; i++) {
			var source = sources[i];
			var src = source.src;
			var bitrate = source.bitrate || 0;
			var url_qs_parts = src.split("?");
			var path_parts = String(url_qs_parts[0]).split('/');
			var extension = String(_getExtension(path_parts[path_parts.length-1]));
			var protocol = src.split('://')[0];
			//check the protocol
			if ( arrayContains(protocol, ['http','https'])) {
				// look for known extensions specific to browsers that support some chosen media types
				if ( (!FF) && arrayContains(extension, ['mp4','m4a','m4v','mp3']) ) {
					retval.push({'src':src,'ismbr':false,'srctype':'mediasource','type':source.type,'codecs':source.codecs});
				} else if ( (FF) && arrayContains(extension, ['ogg','oga','ogv']) ) {
					retval.push({'src':src,'ismbr':false,'srctype':'mediasource','type':source.type,'codecs':source.codecs});
				} else if ( (!FF) && extension == 'm3u8' && (isOSX106OrHigher(navigator.userAgent) || isIDevice(navigator.userAgent)) ) {
					retval.push({'src':src,'ismbr':true,'srctype':'refsource','type':source.type,'codecs':source.codecs});
				}
			}
		}
		// return false or an array of objects		
		return ( retval.length ==0 ) ? false : retval;
	}
	
	/**
	 * Internal render function used to actually create the video tag
	 */
	HTML5Video.prototype._render = function() {
		var vidHTML = '<video id="'+this.videoconfig.id+'" class="'+this.ovpconfig.ovp_container_class+'-video" poster="'+this.videoconfig.posterimg+'" ';
		//vidHTML += ( isIDevice(navigator.userAgent) ) ? 'controls >' : '>';
		vidHTML += '>';
		for (var x=0;x<this.videoconfig.sources.length;x++) {
			var src = this.videoconfig.sources[x];
			vidHTML += '<source src="'+src['src']+'"';
			if (src.type) vidHTML += ' type="'+src['type'];
			vidHTML += '"/>';
		}
		vidHTML += '</video>';
		var video = $(vidHTML);
		video.hide();
		this.wrapperNode.append(video);
		video.fadeIn('fast');
		this.player = video.get(0);				
		return video;
	}
	
	/**
	 * renders a player to the given node starting with a poster image
	 */
	HTML5Video.prototype._renderWithPoster = function() {
		var self = this;
		var node = this.wrapperNode;
		this._createPoster(function(){
			node.children().fadeOut('fast');
			node.empty();	// clear the contents of the node
			self._render();
			self._assignEvents();
			if (self.videoconfig.controls) {
				self.showControls();
				self.setupFader();
			}
			if (self.videoconfig.autobuffer || self.videoconfig.autoplay) {
				self.playpause();
			}
		});
	}
	
	HTML5Video.prototype._renderImmediately = function() {
		this._render();
		//if ( !isIDevice(navigator.userAgent) ) {
		if ( true ) {
			this._assignEvents();
			if (this.videoconfig.controls) {
				this.showControls();
				this.setupFader();
			}
			if (this.videoconfig.autobuffer || this.videoconfig.autoplay) {
				this.playpause();
			}
		}
	}
