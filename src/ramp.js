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
(function () {
    var Ramp = function (target) {
        if(! (this instanceof Ramp) )
            return new Ramp(target);
        this.target = target;
        Ramp.layout(target);
    };
    Ramp.Players = {};
    Ramp.Services = {};
    Ramp.Views = {};
    Ramp.UI = {};
    Ramp.Utils = {};
    Ramp.Models = {};

    window.Ramp = Ramp;
})();

