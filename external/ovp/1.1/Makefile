COMPRESSOR=/usr/local/bin/yuicompressor-2.4.2.jar

all: minify prepend

build: force_look
	cd src; $(MAKE) $(MFLAGS)
	cp -r ../html-1.0/* ./html/
	cp ../flash/player/bin-release/AkamaiJSFlashPlayer.swf ./html/ovp.swf
	cp ../silverlight/player/binary/OVP.xap ./html/ovp.xap

minify: build
	java -jar ${COMPRESSOR} --type css -o ovp-min.css css/ovp.css
	java -jar ${COMPRESSOR} --type js -o ovp-min.js ovp.js
	java -jar ${COMPRESSOR} --type js -o jquery/jquery-min.js jquery/jquery.js

prepend: build minify
	cat jquery/jquery-min.js > ovp_jquery-min.js
	cat ovp-min.js >> ovp_jquery-min.js
	cat jquery/jquery-min.js > ovp_jquery.js
	cat ovp.js >> ovp_jquery.js

clean:
	rm -f ovp-min.css ovp-min.js ovp_jquery-min.js ovp.js ovp_jquery.js jquery/jquery-min.js
	rm -rf html/*

force_look:
	true
