	///////////////////////////////////////////////
	// Video Object
	var Video = function(config) {
		this.ovpconfig = config
		this.videoconfig = {"sources":[]};
		this.renderfunc = function(){};
		this.environment = {};
		this.parentNode = undefined;
		this.wrapperNode = undefined;
		this.player = undefined;
		this.controls = undefined;
		this.replacedContent = undefined;
		this.bytesLoaded = 1;
		this.bytesTotal = 1;
		this.controlsCountdown = config['control_keepalive_seconds'];
		this.controlsState = 'NOTRENDERED';
		var self = this;
		this.t = undefined; // update timer
	};
	/**
	 * starts the update timer for the video.
	 */
	Video.prototype._startCount = function() {
		var self = this; // scoping
		this.t = window.setInterval(function() {
	        if (self.isEnded() != true) {
				if (self.controlsState != 'HIDDEN') {
					self.controls.updateTimeline();
				}
	        } else {
				self.controls.setPaused();
	        }
			if ( self.controlsCountdown <= 0 ) {
				if (self.controlsState != 'HIDDEN' && self.controls && self.controls.hide) {
					self.hideControls();
				}
			} else {
				self.controlsCountdown--;
			}
	    }, 1000);		
	}
	/**
	 * retrieves the appropriate controls object
	 */
	Video.prototype._getControlsObject = function() {
		var controls = _pluginCaller(this.ovpconfig, 'getcontrolobj', this);
		if (controls) {
			return controls;
		} else {
			return new Controls(this);	// builtin defalut controls
		}
	}
	/**
	 * stops the update timer for the video
	 */
	Video.prototype._pauseCount = function() {
		window.clearInterval(this.t);
	}
	/**
	 * Returns the id of the video object
	 */
	Video.prototype.getID = function() {
		return this.videoconfig['id'] || generateGuid();
	}
	/**
	 * Returns the video object's parent node reference
	 */
	Video.prototype.getContainer = function() {
		return this.parentNode;
	}
	/**
	 * Gives the video object a standard render function to use for generating
	 * a player.
	 * @param {Function} renderfunc - the render function
	 */
	Video.prototype.setRenderFunction = function(renderfunc) {
		this.renderfunc = renderfunc;
	}
	/**
	 * Parses the configuration of this video from the given video tag
	 * @param {Object} node
	 */
	Video.prototype.parseFromDomNode = function(node) {
		// Parse the video node ourselves
		var sources = node.getElementsByTagName('source');
		for (var i = 0; i < sources.length; i++) {
				var src = {};
				var source = sources[i];
				src['src'] = source.getAttribute('src');
				src['type'] = source.getAttribute('type');
				src['codec'] = source.getAttribute('codec');
				src['bitrate'] = source.getAttribute('bitrate');
				this.videoconfig['sources'].push(src);
		}
		this.videoconfig['posterimg'] = node.getAttribute('poster');
		this.videoconfig['autoplay'] = new Boolean(node.getAttribute('autobuffer'));
		this.videoconfig['autobuffer'] = this.videoconfig['autoplay'];
		this.videoconfig['controls'] = new Boolean(node.getAttribute('controls'));
		this.videoconfig['height'] = node.getAttribute('height');
		this.videoconfig['width'] = node.getAttribute('width');
		this.videoconfig['scalemode'] = 'fit';
		if (!this.videoconfig['id'])
			this.videoconfig['id'] = node.getAttribute('id') || generateGuid();
	}

	/**
	 * retrieves the current timeline position of the player
	 */
	Video.prototype.getCurrentTime = function()	{
		return this.player.currentTime || 0;
	}
	
	/**
	 * retrieves the current duration of the player
	 */
	Video.prototype.getDuration = function() {
		return this.player.duration || 0;
	}
	
	/**
	 * retrieves the number of bytes in the buffer
	 */
	Video.prototype.getBytesLoaded = function() {
		return this.bytesLoaded || 0;
	}
	
	/**
	 * retrieves the total number of bytes of the video
	 */
	Video.prototype.getTotalBytes = function() {
		return this.bytesTotal || 0;
	}
	
	/**
	 * retrieves the div wrapper for the video
	 */
	Video.prototype.getWrapperNode = function() {
		return this.wrapperNode;
	}
	
	/**
	 * Returns a boolean indicating if the video object is currently playing
	 */
	Video.prototype.isPlaying = function() {
	    if (this.player.paused == false) return true;
		else return false;
	}

	/**
	 * Returns a boolean indicated if the video player has "ended"
	 */
	Video.prototype.isEnded = function() {
		return this.player.ended;
	}

	/**
	 * Returns a boolean indicating if the environment supports native fullscreen
	 */
	Video.prototype.supportsNativeFullscreen = function() {
		return this.player.webkitSupportsFullscreen;
	}

	/**
	 * shows the controls object
	 * @TODO: provide hook for user-supplied controls
	 */
	Video.prototype.showControls = function(fnCallback) {
		if (this.controlsState != 'VISIBLE') {
			if (! this.controls) {
				//this.controls = new Controls(this);
				this.controls = this._getControlsObject();
				this.controls.render();			
			} else {
				this.controls.show(fnCallback);
				this.controls.updateTimeline();
			}		
			this._startCount();
			this.controlsState = 'VISIBLE';
		}
	}
	
	Video.prototype.hideControls = function(fnCallback) {
		if (this.controlsState != 'HIDDEN') {
			if (this.controls) {
				this.controls.hide(fnCallback);
			}
			this._pauseCount();
			this.controlsState = 'HIDDEN';			
		}
	}

	/**
	 * Toggles between play and pause for this video
	 */
	Video.prototype.playpause = function() {
	    if ( this.isPlaying() ) {
	        this.player.pause();
	        this.controls.setPaused();
	    } else {
	        this.player.play();
			this.controls.updateTimeline();
			this.controls.setPlaying();
	    }
	}
	
	/**
	 * Seeks to a position in the video
	 * @param {Object} seconds
	 */
	Video.prototype.seekTo = function(seconds) {
		this.player.currentTime = seconds;
		return true;
	}
	
	/**
	 * Toggles between muted and unmuted for this video
	 */
	Video.prototype.mutetoggle = function() {
		if (this.player.volume == 0) {
			this.player.volume = 1.0;
			this.controls.setVolumeBtn();
		} else {
			this.player.volume = 0.0;
			this.controls.setMutedBtn();
		}
	}
	
	/**
	 * Toggles fullscreen on and off
	 */
	Video.prototype.fullscreentoggle = function() {
		//sniff for firefox to turn on/off animation because it's broken in FF
		var userAgent = navigator.userAgent.toLowerCase();
		var ff = (/mozilla/.test (userAgent) && !/(compatible|webkit)/.test(userAgent)) ? true : false;

		if ( this.supportsNativeFullscreen() ) {
			this.player.controls = true;
			this.player.webkitEnterFullScreen();
			return
		}
		var p = $(this.wrapperNode);
		var wind = $(window);
		var self = this;
		var env = this.environment;
		var controls = this.controls;
		this.goingFullScreen = true;

		if (this.environment.inFullscreen != true) {                                    
			this.environment.inFullscreen = true;
			if (!ff) {
				p.css('position', 'absolute');
				p.css('z-index', '99');
			}
			env.playerHeight = p.height();
			env.playerWidth = p.width();
			env.playerLeft = p.offset().left;
			env.playerTop = p.offset().top;
			env.windowHeight = wind.height();
			env.windowWidth = wind.width();
			env.scrollTop = wind.scrollTop();
			env.scrollLeft = wind.scrollLeft();
			this.hideControls(function(){
				var oncomplete = function(){
			        // switch control classes to fullscreen
					controls.setExtendedClass('-fs');
					controls.setClasses();
					if ( self.isPlaying() ) controls.setPlaying();
					else controls.setPaused();
					self.showControls();
					if (!ff) {
						p.removeClass();
						p.addClass(self.ovpconfig.ovp_container_class+'-video-wrapper-fs'); // set fullscreen class on wrapper
					}
					self.goingFullScreen = false;					
				};
				if (ff) {
					p.width(env.windowWidth+'px');
					p.height(env.windowHeight+'px');
					wind.scrollTop(p.offset().top);
					wind.scrollLeft(p.offset().left);
					oncomplete();
				} else {
					p.css('position', 'absolute');
					p.animate({width: '100%', height: '100%', left:0, top:0}, {duration: 400,complete: oncomplete });
				}
			});
	    } else {
			this.environment.inFullscreen = false;
			p.css('position', '');p.css('left', '');p.css('top', '');p.css('z-index','');
			this.hideControls(function(){
				var oncomplete = function() {
					// switch control classes to normal
					controls.setExtendedClass('');
					controls.setClasses();
					if ( self.isPlaying() ) controls.setPlaying();
					else controls.setPaused();
					self.showControls();
					if (!ff) {
						p.removeClass();
						p.addClass(self.ovpconfig.ovp_container_class+'-video-wrapper'); // set normal class on wrapper
					}
					self.goingFullScreen = false;
				};
				if (ff) {
					p.width(env.playerWidth+'px');
					p.height(env.playerHeight+'px');
					wind.scrollTop(env.scrollTop);
					wind.scrollLeft(env.scrollLeft);
					oncomplete();
				} else {
					p.css('position', ''); //reapply the class instead
					p.animate({width:self.environment.playerWidth, height:self.environment.playerHeight}, {duration:'fast',complete:oncomplete});
				}
			});
	    }
	}
	
	/**
	 * sets up fader events on the controls.  This is how the controls fade in/out
	 */
	Video.prototype.setupFader = function() {
		var self = this;
		var controls = this.controls;
		var p = $(this.wrapperNode);
		p.mousemove(function(){
			if ( ! self.goingFullScreen ) {
				self.controlsCountdown = self.ovpconfig['control_keepalive_seconds'];
				self.showControls();
			}
		});
		p.mouseleave(function(){
			if (!self.goingFullScreen) {
				self.hideControls();
			}
		});
	}
	
	/**
	 * determines what, if anything, the video thinks it can play based on what it knows
	 * about the media available. Overridden in each subclass.
	 * @returns Array of objects or false if nothing can be played
	 */
	Video.prototype.canPlay = function() {
		// this will be overridden so just say we'll play everything in the base-class
		var retval = [];
		var sources = this.videoconfig.sources;
		for (var i=0; i<sources.length; i++) {
			var source = sources[i];
			var bitrate = source.bitrate || 0;
			retval.push({'src':source.src, 'ismbr':false, 'bitrate':bitrate, 'type':source.type, 'codecs':source.codecs});
		}
		// return false or an array of objects		
		return ( retval.length ==0 ) ? false : retval;		
	}
	
	/**
	 * renders a player to the given node starting with a poster image
	 */
	Video.prototype._createPoster = function(callbackfn) {
		var self = this;
		var node = this.wrapperNode;
		var ud = $('<div style="height:100%;width:100%;min-height:100%;min-width:100%;background:url('+this.videoconfig.posterimg+') no-repeat center black;"></div>');
		node.append(ud);
		ud.fadeTo('slow', 0.4);
		var playcords = {
			top: ((this.videoconfig['height'] / 2) - 40),
			left: ((this.videoconfig['width'] / 2) - 40)
		}
		var playbtn = $('<img style="top:'+playcords.top+'px;left:'+playcords.left+'px;" id="'+this.videoconfig.id+'-bigplaybtn" class="'+this.ovpconfig.ovp_container_class+'-bigplaybtn" src="'+this.ovpconfig.controls.src_img+'"/>');
		playbtn.mouseenter(function(){ud.fadeTo('fast', 1.0)});
		playbtn.mouseleave(function(){ud.fadeTo('fast',0.4);});
		playbtn.click(callbackfn);
		node.append(playbtn);
	}

	/**
	 * Restores the video element to it's pre-render state
	 */
	Video.prototype.playlistReturn = function() {
		return null;
	}

	/**
	 * renders the poster and calls the object's renderfunc method to render the player
	 */
	Video.prototype.render = function(node) {
		// if it's a browser we'll render a fake poster otherwise no
		node = $(node);
		this.parentNode = node.parent();
		var div = $('<div id="'+this.videoconfig['id']+'" class="'+this.ovpconfig.ovp_container_class+'-video-wrapper'+'"></div>');
		this.wrapperNode = div;
		node.replaceWith(div);
		//if (isIDevice(navigator.userAgent) || this.ovpconfig['immediately']) {
		if (this.ovpconfig['immediately']) {
			this._renderImmediately();
		} else {
			this._renderWithPoster();
		}
	}
