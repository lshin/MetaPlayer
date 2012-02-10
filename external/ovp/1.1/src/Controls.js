	///////////////////////////////////////////////
	// Controls Objects
	/**
	 * The Controls class.  The job of this class is to setup the basic elements
	 * and allow them to be rendered to the screen. It also manages things like seek/
	 * scrubbing.
	 * @param {Object} video - the corresponding video object we're rendering with/controling.
	 */
	var Controls = function(video) {
		this.managedVideo = video;
		var pixel = video.ovpconfig.controls.src_img;
		var mvid = video.getID();
		this.extendedClass = '';  // class extension
		this.controlcontainer = $('<div id="'+mvid+'-controlcontainer"></div>');
		this.controlss = $('<div id="'+mvid+'-controls"></div>');
		this.playpause = $('<div id="'+mvid+'-playpause"><img src="'+pixel+'"></div>');
		this.volumebtn = $('<div id="'+mvid+'-volumebtn"><img src="'+pixel+'"></div>');
		this.fsbtn = $('<div id="'+mvid+'-fullscreenbtn"><img src="'+pixel+'"></div>');
		this.position = $('<div id="'+mvid+'-position"></div>');
		this.scrubber = $('<div id="'+mvid+'-scrubber"></div>');
		this.scrubberp = $('<img id="'+mvid+'-scrubber-playing" src="'+pixel+'" />');
		this.scrubberb = $('<img id="'+mvid+'-scrubber-buffered" src="'+pixel+'" />');
		this.scrubberr = $('<img id="'+mvid+'-scrubber-remaining" src="'+pixel+'" />');
		this.scrubber.append(this.scrubberp);
		this.scrubber.append(this.scrubberb);
		this.scrubber.append(this.scrubberr);
		this.duration = $('<div id="'+mvid+'-duration"></div>');
		//this.returnBtn = $('<img id="'+mvid+'-playlistreturn" src="'+pixel+'" />');

		// attach to video events - play/pause, volume, fullscreen
		var controls = this;
		this.playpause.click(function(){controls.managedVideo.playpause();});
		this.volumebtn.click(function(){controls.managedVideo.mutetoggle();});
		this.fsbtn.click(function(){controls.managedVideo.fullscreentoggle();});
		this.scrubber.click(function(e){controls._onScrubberClick(e);});
		//this.returnBtn.click(function(){controls.managedVideo.playlistReturn();});
	};
	Controls.prototype.setClasses = function() {
		var ext = this.extendedClass;
		var ovpclass = this.managedVideo.ovpconfig['ovp_container_class'];
		var cc = this.controlcontainer; cc.removeClass(); cc.addClass(ovpclass+'-controlcontainer'+ext);
		var cs = this.controlss; cs.removeClass(); cs.addClass(ovpclass+'-controls'+ext);
		var pp = this.playpause; pp.removeClass(); pp.addClass(ovpclass+'-playbtn'+ext); 
		var vb = this.volumebtn; vb.removeClass(); vb.addClass(ovpclass+'-volumebtn'+ext);
		var fsb = this.fsbtn; fsb.removeClass(); fsb.addClass(ovpclass+'-fullscreenbtn'+ext);
		var pos = this.position; pos.removeClass(); pos.addClass(ovpclass+'-position'+ext);
		var scrw = this.scrubber; scrw.removeClass(); scrw.addClass(ovpclass+"-scrubber"+ext);
		var scrp = this.scrubberp; scrp.removeClass(); scrp.addClass(ovpclass+'-scrubber-playing'+ext);
		var scrb = this.scrubberb; scrb.removeClass(); scrb.addClass(ovpclass+'-scrubber-buffered'+ext);
		var scrr = this.scrubberr; scrr.removeClass(); scrr.addClass(ovpclass+'-scrubber-remaining'+ext);
		var dur = this.duration; dur.removeClass(); dur.addClass(ovpclass+'-duration'+ext);
		//var ret = this.returnBtn; ret.removeClass(); ret.addClass(ovpclass+'-playlistbtn'+ext);
	};
	Controls.prototype.setPaused = function() {
		this.playpause.removeClass();
		this.playpause.addClass(this.managedVideo.ovpconfig['ovp_container_class']+'-playbtn'+this.extendedClass);
	}
	Controls.prototype.setPlaying = function() {
		this.playpause.removeClass();
		this.playpause.addClass(this.managedVideo.ovpconfig['ovp_container_class']+'-pausebtn'+this.extendedClass);
	}
	Controls.prototype.setVolumeBtn = function() {
		this.volumebtn.removeClass();
		this.volumebtn.addClass(this.managedVideo.ovpconfig['ovp_container_class']+'-volumebtn'+this.extendedClass);
	}
	Controls.prototype.setMutedBtn = function() {
		this.volumebtn.removeClass();
		this.volumebtn.addClass(this.managedVideo.ovpconfig['ovp_container_class']+'-mutedbtn'+this.extendedClass);
	}
	Controls.prototype.setExtendedClass = function(classext) {
		this.extendedClass = classext;
	}
	Controls.prototype.show = function(fnCallback) {
		if (isIDevice(navigator.userAgent)) return
		var controlcontainer = this.controlcontainer
		//this.returnBtn.fadeIn('fast')
		controlcontainer.fadeIn('fast', fnCallback);
	}
	Controls.prototype.hide = function(fnCallback) {
		if (isIDevice(navigator.userAgent)) return
		var controlcontainer = this.controlcontainer
		//this.returnBtn.fadeOut('fast')
		controlcontainer.fadeOut('fast', fnCallback);
	}
	Controls.prototype.remove = function() {
		var controlcontainer = this.controlcontainer
		controlcontainer.fadeOut('fast', function(){controlcontainer.remove();});
	}
	Controls.prototype.render = function() {
		var vid = this.managedVideo;
		var controlcontainer = this.controlcontainer;
		var controlss = this.controlss;
		//var returnBtn = this.returnBtn;
		this.setClasses();
		this.position.html( this._asTime(vid.getCurrentTime()) );
		this.duration.html( "-"+this._asTime(vid.getDuration()-vid.getCurrentTime()) );
		controlss.append(this.playpause);
		controlss.append(this.volumebtn);
		controlss.append(this.fsbtn);
		controlss.append(this.position);
		controlss.append(this.scrubber);
		controlss.append(this.duration);
		controlcontainer.append(controlss);
		controlcontainer.hide();
		//returnBtn.hide();
		$(vid.getWrapperNode()).append(controlcontainer);
		//$(vid.getWrapperNode()).append(returnBtn);
		controlcontainer.fadeIn('fast');
		//returnBtn.fadeIn('fast');
	};
	Controls.prototype.updateTimeline = function() {
		var mvid = this.managedVideo;
		this.position.html( this._asTime(mvid.getCurrentTime()) );
		this.duration.html( "-"+this._asTime(mvid.getDuration()-mvid.getCurrentTime()) );
		if (mvid.getDuration() > 0) {
			this._onProgress(mvid.getCurrentTime(), mvid.getDuration(), mvid.getBytesLoaded(), mvid.getTotalBytes());
		}
	}
	Controls.prototype._onPlaylistReturnClick = function(e) {
		return null;
	}
	Controls.prototype._onScrubberClick = function(e) {
		var posx = e.pageX;
		var posy = e.pageY;
		var scrubber = this.scrubber;
		var L = posx-scrubber.offset().left;
		var W = scrubber.width();
		if (L==0) { return null;}
		var p = (L/W)*this.managedVideo.getDuration(); // point in timeline to seek to
		this.managedVideo.seekTo(p);
		this.updateTimeline();
	}
	Controls.prototype._onProgress = function(playtime, playtotal, bytesLoaded, totalBytes) {
		var buffered = (bytesLoaded == 0 || totalBytes == 0) ? 0 : bytesLoaded/totalBytes;
		var totalWidth = this.scrubber.width();
		var progWidth = Math.round((totalWidth/playtotal)*playtime);
		var bufferWidth = Math.round( totalWidth*(buffered) )-progWidth;
		bufferWidth = (bufferWidth < 0) ? 0 : bufferWidth; // normalize to 0 in the case of a negative
		var remainWidth = Math.round(totalWidth-progWidth-bufferWidth);
		// Ensure that the total of all of these does not exceed the container width
		this.scrubberp.width( progWidth+'px' );
		this.scrubberb.width( bufferWidth+'px' );
		this.scrubberr.width( remainWidth+'px' );
	}
	Controls.prototype._asTime = function(t) {
		if (!t) return "00:00";
		t = Math.round(t);
		var s = t % 60;
		var m = Math.floor(t / 60);  
		return this._two(m) + ':' + this._two(s);		
	}
	Controls.prototype._two = function(s) {
		s += "";
		if (s.length < 2) s = "0" + s;
		return s;		
	}
