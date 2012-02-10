all: do_always
	cat header.js > ../ovp.js
	cat ../LICENSE >> ../ovp.js
	cat ../README >> ../ovp.js
	cat ../TODO >> ../ovp.js
	
	echo "*/\n(function(window) {" >> ../ovp.js
	cat product-info.js >> ../ovp.js
	cat includes.js >> ../ovp.js
	cat Controls.js >> ../ovp.js
	cat Video.js >> ../ovp.js
	cat HTML5Video.js >> ../ovp.js
	cat FlashVideo.js >> ../ovp.js
	cat SilverlightVideo.js >> ../ovp.js
	cat utils.js >> ../ovp.js
	cat ovp.js >> ../ovp.js
	cat footer.js >> ../ovp.js
	echo '})(window);' >> ../ovp.js


do_always:
	true
