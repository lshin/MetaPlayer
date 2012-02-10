$(document).ready(function(){
	module("ovp class");

	var config = {};
	var myovp = new _ovp();


	test('Test Fullscreen Toggle', function() {});
	test('Antitest Fullscreen Toggle', function() {});

	test('Test Mute Toggle', function() {});
	test('Antitest Mute Toggle', function() {});

	test('Test Current Time', function() {});
	test('Antitest Current Time', function() {});

	test('Test PlayPause Toggle', function() {});
	test('Antitest PlayPause Toggle', function() {});

	test('Test Duration', function() {});
	test('Antitest Duration', function() {});

	test('Test seek to', function() {});
	test('Antitest seek to', function() {});

	test('Test can play', function() {});
	test('Antitest can play', function() {});

	test('test [ok]', function() { ok(true, "works");});
	test('test [equals]', function() {
		var x = 'h';
		equals('h', x, "x should be 'h'");
	});

	test("test 1", function(){ ok(true); });
	test("test 2", function(){ ok(true, 'also passing'); });
	test("test 3", function(){ ok(true, 'lastly passing'); });

	test("MOD-B test 1", function(){
		//expect(2);
		equals(true, true, "failing test");
		equals(true, true, "passing test");
	});
});
