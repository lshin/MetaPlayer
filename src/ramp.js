/**
    Metaplayer - A media player framework for HTML5/JavaScript for use with RAMP services.

    Copyright (c) 2011 RAMP Holdings, Inc.

    Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    Created: 2011 by Greg Kindel <gkindel@ramp.com>

     Dependencies: jQuery
*/
var Ramp;

(function () {
    // ============================================================== Ramp()

    var $ = jQuery;

    Ramp = function (mediaId, host, options){
        if( ! (this instanceof Ramp) )
            return new Ramp(mediaId, host, options);

        this.service();

        if( mediaId && host ) {
            this.service.load(mediaId, host)
        }
    };

    // namespace anchors
    Ramp.Players = {};
    Ramp.Services = {};
    Ramp.Views = {};
    Ramp.UI = {};
    Ramp.Utils = {};

})();
