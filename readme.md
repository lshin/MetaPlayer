MetaPlayer
=============
A standards-based, multiple engine, media player framework.

About
-------------
MetaPlayer's goals are to:
* Support multiple playback engines (HTML5, Flowplayer, Youtube, etc).
* Provide a stable UI framework built on the standard-based HTML5 media interface.
* Seamless integration with RAMP transcription and metadata services.

Quick Start
-------------

        document.addEventListener("DOMContentLoaded", function () {

            // ramp services
            ramp = Ramp('36234882', "/pca");

            // html5 player loader
            ramp.html5('#target');

            // controls & timeline
            ramp.controls();

            // overlay
            ramp.overlay();

        }, false);


License
-------------
Copyright (c) 2011 [RAMP Holdings, Inc.](http://www.ramp.com)

Licensed under the MIT license: [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.