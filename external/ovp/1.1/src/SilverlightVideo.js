	//////////////////////////////////////////////////////////////////
    // SilverlightVideo Object
    //////////////////////////////////////////////////////////////////
    /**
    * Create a SilverlightVideo object, decended from the Base Video class
    * @param {Object} config
    */
    var SilverlightVideo = function (config) {
		this._slPlayer = null;
        SilverlightVideo.baseConstructor.call(this, config);
    };
    extend(SilverlightVideo, Video);

    SilverlightVideo.prototype.fullscreentoggle = function () {
        SilverlightVideo.superClass.fullscreentoggle.call(this);
    }

    SilverlightVideo.prototype.isPlaying = function () {
        if (this._slPlayer.getMediaProperty('paused')) return false;
        else return true;
    }

    SilverlightVideo.prototype.isEnded = function () {
        if (this._slPlayer.getMediaProperty('ended')) {
			return true;
		}
        else return false;
    }

	/**
	 * Returns a boolean indicating if the environment supports native fullscreen
	 */
	SilverlightVideo.prototype.supportsNativeFullscreen = function() {
		return false;
	}

    SilverlightVideo.prototype.mutetoggle = function () {
        if (this._slPlayer.getMediaProperty('volume') == 0) {
            this._slPlayer.setMediaProperty("volume", 1.0);
            this.controls.setVolumeBtn();
        } else {
            this._slPlayer.setMediaProperty("volume", 0.0);
            this.controls.setMutedBtn();
        }
    }
    /**
    * retrieves the current timeline position of the player
    */
    SilverlightVideo.prototype.getCurrentTime = function () {
        //return (this._slPlayer.getMediaProperty) ? this._slPlayer.getMediaProperty("currentTime") || 0 : 0;
		try {
			return this._slPlayer.getMediaProperty("currentTime");
		} catch(error) {
			// should log this
		}
		return 0;
    }

    /**
    * retrieves the current duration of the player
    */
    SilverlightVideo.prototype.getDuration = function () {
		try {
			return this._slPlayer.getMediaProperty("duration");
		} catch(error) {
			// should log this
		}
		return 0;
    }

    SilverlightVideo.prototype.seekTo = function (seconds) {
        this._slPlayer.setMediaProperty("currentTime", seconds);
        return true;
    }

    /**
    * Toggles between play and pause for this video
    */
    SilverlightVideo.prototype.playpause = function () {
        if (this.isPlaying()) {
            this._slPlayer.pauseMedia();
            this.controls.setPaused();
        } else {
            this._slPlayer.playMedia();
            this.controls.updateTimeline();
            this.controls.setPlaying();
        }
    }

    SilverlightVideo.prototype.canPlay = function () {
        var retval = [];
        var sources = this.videoconfig.sources;
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            var src = source.src;
            var bitrate = source.bitrate || 0;
            var url_qs_parts = src.split("?");
            var path_parts = String(url_qs_parts[0]).split('/');
            var extension = String(_getExtension(path_parts[path_parts.length - 1])).toLowerCase();
            // look for known extensions
            if (arrayContains(extension, ['asf', 'wmv', 'wma'])) { retval.push({ 'src': src, 'ismbr': false, 'srctype': 'mediasource', 'type': source.type, 'codecs': source.codecs }); }
            else if (arrayContains(extension, ['asx', 'wvx', 'wax'])) { retval.push({ 'src': src, 'ismbr': false, 'srctype': 'refsource', 'type': source.type, 'codecs': source.codecs }); }
            else if (arrayContains(extension, ['manifest', 'ism\\manifest'])) { retval.push({ 'src': src, 'ismbr': true, 'srctype': 'mediasource', 'type': source.type, 'codecs': source.codecs }); }
            else if (arrayContains(extension, ['mp4', 'm4a', 'm4v', 'mp3'])) {
                //check the protocol
                var protocol = src.split('://');
				if (protocol.length > 1) {
					if (arrayContains(protocol[0], ['http', 'https'])) { retval.push({ 'src': src, 'ismbr': false, 'srctype': 'mediasource', 'type': source.type, 'codecs': source.codecs }); }
				}
            }
        }
        // return false or an array of objects		
        return (retval.length == 0) ? false : retval;
    }

	SilverlightVideo.prototype._getPlayerPluginStr = function() {
		var ret = "";
		if (this.ovpconfig.players['Silverlight'].plugins != undefined && this.ovpconfig.players['Silverlight'].plugins.length ) {
			ret = "smfPlugins=";
			for (var i=0; i<this.ovpconfig.players['Silverlight'].plugins.length; i++) {
				ret += this.ovpconfig.players['Silverlight'].plugins[i]+","
			}
		}
		return ret;
	}

    SilverlightVideo.prototype._render = function (callbackfn) {
        var sources = this.canPlay();
        if (!sources) { return false; } //drop out if sources comes back false
        var div_id = generateGuid();
        var videoconf = this.videoconfig;
        var div = $('<div id="' + div_id + '">');
		var player_plugins = this._getPlayerPluginStr();
        //this.wrapperNode.append(div);
        var source = sources[0];

        var slTag = Silverlight.createObject(
                        this.ovpconfig.players.Silverlight.src, //'OVP.xap',
                        null, //div.parent()[0],	// parent element
                        videoconf.id,
                        {
                            width: "" + videoconf.width,
                            height: "" + videoconf.height,
                            background: '#eeeeee',
                            version: this.ovpconfig.players.Silverlight.minver
                        },
                        { onLoad: callbackfn },
                        "autoplay=true, muted=false, playlistoverlay=false, stretchmode=UniformToFill, stretchmodefullscreen=UniformToFill, type=SupportPlayer, volume=1," +
						player_plugins + "enableOvpHtml5Interface=true, mediasource=" + source.src,
                        null);
		slTag = $(slTag).addClass(this.ovpconfig.ovp_container_class + "-video");				
        this.wrapperNode.append(slTag);
        //div.parent().html(slTag);
    }

    SilverlightVideo.prototype._renderWithPoster = function () {
        var self = this;
        var sources = this.canPlay();
        if (!sources) { return false; } //drop out if sources comes back false
        var node = this.wrapperNode;
        this._createPoster(function () {
            node.children().fadeOut('fast');
            node.empty(); // clear the contents of the node
            //render the player
            self._render(function (ret) {
                var source = sources[0];
                function finishFunc() {
                    self._slPlayer = ret.getHost().content.html5_sl_player;
                    if (!self._slPlayer) { // the player needs to initialize after the sl plugin is loaded...this typically happens after the template has been applied
                        window.setTimeout(finishFunc, 1000);
                        return false;
                    }
                    self.player = ret.getHost();
                    if (self.videoconfig.controls) {
                        self.showControls();
                        self.setupFader();
                    }
                    if (self.videoconfig.autobuffer || self.videoconfig.autoplay) {
                        //Silverlight starts playing automatically so just set the fact that we're playing into the controls
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
    SilverlightVideo.prototype._renderImmediately = function () {
        var self = this;
        var sources = this.canPlay();
        if (!sources) { return false; } //drop out if sources comes back false
        var node = this.wrapperNode;
        self._render(function (ret) {
            var source = sources[0];
            //ANOTHER CALLBACK to wait for silverlight to be ready
            function finishFunc() {
                self._slPlayer = ret.getHost().content.html5_sl_player;
                if (!self._slPlayer) { // the player needs to initialize after the sl plugin is loaded...this typically happens after the template has been applied
						window.setTimeout(finishFunc, 100);
						return false;
                    }
                self._slPlayer.setMediaProperty("src", source.src);
                self.player = ret.getHost();
                if (self.videoconfig.controls) {
                    self.showControls();
                    self.setupFader();
                }
                if (self.videoconfig.autobuffer || self.videoconfig.autoplay) {
                    //Silverlight starts playing automatically so just set the fact that we're playing into the controls
                    self.controls.setPlaying();
                }
            }
            window.setTimeout(finishFunc, 100);
        });
    }
