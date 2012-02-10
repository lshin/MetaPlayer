	//////////////////////////////////////////////////////////////////
	// FlashVideo Object
	//////////////////////////////////////////////////////////////////
	/**
	 * Create an FlashVideo object, decended from the Base Video class
	 * @param {Object} config
	 */
	var FlashVideo = function(config){
		FlashVideo.baseConstructor.call(this,config);
	};
	extend(FlashVideo, Video);

	/**
	 * example of how to override a method in the superclass
	 */	
	FlashVideo.prototype.fullscreentoggle = function() {
		FlashVideo.superClass.fullscreentoggle.call(this);
	}
	
	FlashVideo.prototype.isPlaying = function() {
	    if ( this.player.getFlashMediaProperty('paused') ) return false;
		else return true;
	}

	FlashVideo.prototype.mutetoggle = function() {
		if (this.player.getFlashMediaProperty('volume') == 0) {
			this.player.setFlashMediaProperty("volume", 1.0);
			this.controls.setVolumeBtn();
		} else {
			this.player.setFlashMediaProperty("volume", 0.0);
			this.controls.setMutedBtn();				
		}
	}
	/**
	 * retrieves the current timeline position of the player
	 */
	FlashVideo.prototype.getCurrentTime = function() {
		if (this.player.getFlashMediaProperty) {
			return this.player.getFlashMediaProperty("currentTime");
		} else {
			return 0;
		}
	}
	
	/**
	 * Toggles between play and pause for this video
	 */
	FlashVideo.prototype.playpause = function() {
	    if ( this.isPlaying() ) {
	        this.player.pauseFlashMedia();
	        this.controls.setPaused();
	    } else {
	        this.player.playFlashMedia();
			this.controls.updateTimeline();
			this.controls.setPlaying();
	    }
	}

	/**
	 * retrieves the current duration of the player
	 */
	FlashVideo.prototype.getDuration = function() {
		var d = 0;
		if (this.player.getFlashMediaProperty) {
			return this.player.getFlashMediaProperty("duration");
		} else {
			return 0;
		}
	}
	
	FlashVideo.prototype.seekTo = function(seconds) {
		this.player.setFlashMediaProperty("currentTime", seconds);
		return true;
	}
	
	FlashVideo.prototype.canPlay = function() {
		var retval = [];
		var sources = this.videoconfig.sources;
		for (var i=0; i<sources.length; i++) {
			var source = sources[i];
			var src = source.src;
			var bitrate = source.bitrate || 0;
			var url_qs_parts = src.split("?");
			var path_parts = String(url_qs_parts[0]).split('/');
			var extension = String(_getExtension(path_parts[path_parts.length-1]));

			// look for known extensions
			if ( arrayContains(extension, ['flv','f4v','f4f'])) { retval.push({'src':src,'ismbr':false,'srctype':'mediasource','type':source.type,'codecs':source.codecs});}
			else if ( arrayContains(extension, ['smi','smil'])) { retval.push({'src':src,'ismbr':true,'srctype':'refsource','type':source.type,'codecs':source.codecs});}
			else if ( arrayContains(extension, ['mp4','m4a','m4v','mp3']) ) { retval.push({'src':src,'ismbr':false,'srctype':'mediasource','type':source.type,'codecs':source.codecs}); }
		}
		// return false or an array of objects		
		return ( retval.length ==0 ) ? false : retval;
	}

	/**
	 * internal method call used for rendering the actual player
	 */
	FlashVideo.prototype._render = function(callbackfn) {
		var sources = this.canPlay();
		if (!sources) { return false; } //drop out if sources comes back false
		var div_id = generateGuid();
		var videoconf = this.videoconfig;
		var div = $('<div id="'+div_id+'">');
		var smode = (videoconf.scalemode) ? videoconf.scalemode : "fit";
		var pmode = (videoconf.playlistmode) ? videoconf.playlistmode : "overlay";
		this.wrapperNode.append(div);
		var source = sources[0];		
		//using swfobject new
		var flashvars = {'src':source.src,
						//'autostart':videoconf.autobuffer,
						'mode':pmode,
						'scaleMode':smode };
		var params = {'allowfullscreen':true, 'allowscriptaccess':'always', 'wmode':'transparent'};
		var attributes = {'id':videoconf.id,'class':this.ovpconfig.ovp_container_class+"-video"};
		swfobject.embedSWF(this.ovpconfig.players.Flash.src, div_id, videoconf.width, videoconf.height, this.ovpconfig.players.Flash.minver, '', flashvars, params, attributes, callbackfn);
	}
	
	/**
	 * renders a player/controls starting with a poster image
	 */
	FlashVideo.prototype._renderWithPoster = function() {
		var self = this;
		var sources = this.canPlay();
		if (!sources) { return false; } //drop out if sources comes back false
		var node = this.wrapperNode;
		this._createPoster(function(){
			node.children().fadeOut('fast');
			node.empty();	// clear the contents of the node
			//render the player
			self._render(function(ret){
				var source = sources[0];
				function finishFunc(){
					var player = ret.ref;
					if (!player.setFlashMediaProperty) { // look for flash to have exposed the interface and call ourselves if it has not yet.
						window.setTimeout(finishFunc, 100);
						return false;
					}
					player.setFlashMediaProperty("src", source.src);
					self.player = player;
					if (self.videoconfig.controls) {
						self.showControls();
						self.setupFader();
					}
					if (self.videoconfig.autobuffer || self.videoconfig.autoplay) {
						//Flash starts playing automatically so just set the fact that we're playing into the controls
						self.controls.setPlaying(); 
					}
				}
				window.setTimeout(finishFunc, 100);
			});			
		});
	}
	
	/**
	 * immediately renders a player and possibly controls
	 */
	FlashVideo.prototype._renderImmediately = function() {
		var self = this;
		var sources = this.canPlay();
		if (!sources) { return false; } //drop out if sources comes back false
		self._render(function(ret){
			var source = sources[0];
			//ANOTHER CALLBACK to wait for flash to be ready
			function finishFunc(){
				var player = ret.ref;
				if (!player.setFlashMediaProperty) { // look for flash to have exposed the interface and call ourselves if it has not yet.
					window.setTimeout(finishFunc, 100);
					return false;
				}
				player.setFlashMediaProperty("src", source.src);
				self.player = player;
				if (self.videoconfig.controls) {
					self.showControls();
					self.setupFader();
				}
				if (self.videoconfig.autobuffer || self.videoconfig.autoplay) {
					//Flash starts playing automatically so just set the fact that we're playing into the controls
					self.controls.setPlaying(); 
				}
			}
			window.setTimeout(finishFunc, 100);
		});
	}
