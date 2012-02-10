	///////////////////////////////////////////////
	// Default Configuration
	var DEFAULTS = {
		"controls": {
			'src_img':'images/pixel.png'	// the path to a transparent pixel to use for buttons (we set the actual button image with the css background)
		},
		"players": {
			"Flash":{"src":"ovp.swf","minver":"9","controls":true, "plugins":[]},
			// add the path to your SmoothStreamingPlugin.xap file in the plugins array to enable smooth streaming
			"Silverlight":{"src":"ovp.xap","minver":"4.0","controls":true, "plugins":[]},
			"HTML5":{"minver":"0","controls":true}
		},
		"strategy":{
			"order":["HTML5","Flash","Silverlight"]	// Case is important
		},
		"plugins":[
			{"hook":"parsevideotag", "ref":function(){}},
			{"hook":"strategy", "ref":function(){}},
			{"hook":"gettestfunction", "ref":function(){return null;}},
			{"hook":"getrenderfunction", "ref":function(){return null;}},
			{"hook":"getvideoobject", "ref":function(){}},
			{"hook":"addplayer", "ref":function(){}},
			{"hook":"getvideoobj", "ref":function(){return null;}},
			{"hook":"getcontrolobj", "ref":function(){return null;}},
		],
		"ovp_container_class":"ovp",	// this classname is prepended to all css classes
		"control_keepalive_seconds":5,	// The approximate number of seconds until controls fade out with no mouse movement
		"immediately": false			// Will the player render immediately when player-render fires or will it start with a poster image
	};
	
	// Expose OVP to the global window
	window.ovp = new _ovp();
