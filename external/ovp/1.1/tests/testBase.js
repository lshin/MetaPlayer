$(document).ready(function(){
	module("ALLTESTS");

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
