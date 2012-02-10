$(document).ready(function(){
	module("testUtils");

	var config = {};

	test('Tests for extend function', function() {
		/**
		 * setup a base object with some variables and then a 
		 * sub object and extend it.  We'll use this for testing
		 */
		var baseObj = function() {
			this.constructorset = true;
		}
		baseObj.prototype.myFunc = function(a) { return a; }
	    var testableObj = function () {
	        testableObj.baseConstructor.call(this);
	    };
	    extend(testableObj, baseObj);
		var myTest = new testableObj();
		
		// Now test it
		equals(myTest.constructorset, true, "Testing that the base constructor succeeded")
		equals(myTest.myFunc(true), true, "Testing that functions where inherited");
		equals(myTest.myFunc(1), 1, "Testing that functions were inherited and not just true");
	});
	
	test('Tests the isIDevice function', function() {
		var test_true1 = 'iPad 3.2.1';
		var test_true2 = 'iPhone';
		var test_true3 = 'iPod';
		var test_true4 = 'ipad 3.2.1';
		var test_true5 = 'iphone';
		var test_true6 = 'ipod';
		var should_test_false = 'iPud 3.2.1';
		equals(isIDevice(test_true1), true, "Testing that iDevice UA tests true");
		equals(isIDevice(test_true2), true, "Testing that iDevice UA tests true");
		equals(isIDevice(test_true3), true, "Testing that iDevice UA tests true");
		equals(isIDevice(test_true4), true, "Testing that iDevice UA tests true");
		equals(isIDevice(test_true5), true, "Testing that iDevice UA tests true");
		equals(isIDevice(test_true6), true, "Testing that iDevice UA tests true");
		equals(isIDevice(should_test_false), false, "Testing that non-iDevice UA tests false");
	});

	test('Tests the check for Snow Leopard', function(){
		var test_true1 = 'Intel Mac OS X 10_6';
		var test_true2 = 'Intel Mac OS X 10_7';
		var test_false1 = 'Intel Mac OS X 10_5';
		var test_false2 = 'Something else';
		equals(isOSX106OrHigher(test_true1), true, 'Testing that snow-leopard UA tests true'); 
		equals(isOSX106OrHigher(test_true2), true, 'Testing that another snow-leopard+ UA tests true'); 
		equals(isOSX106OrHigher(test_false1), false, 'Testing that a non-snow-leopard UA tests true'); 
		equals(isOSX106OrHigher(test_false2), false, 'Testing that another non-snow-leopard UA tests true'); 
	});	

	
	
	test('Test Merge Configs', function(){
		var conf1 = {'key1':'val1', 'key2':'val2'};
		var conf2 = {'key2':'nvl2', 'key3':'nvl3'};
		var conf3 = {'ext1':true, 'ext2':false};
		var conf4 = {'ext3':1, 'ext4':2};
		
		equals( mergeConfigs(conf1, conf2).key1, 'val1', "Tests that a key from base is merged");
		equals( mergeConfigs(conf1, conf2).key2, 'nvl2', "Tests that a key from the extending dict wins");
		equals( mergeConfigs(conf1, conf2).key3, 'nvl3', "Tests that an untouched key from the extending dict remains");

		equals( mergeConfigs(conf3, conf4).ext1, true, "Testing untouched merges with different datatypes");
		equals( mergeConfigs(conf3, conf4).ext2, false, "Testing untouched merges with different datatypes");
		equals( mergeConfigs(conf3, conf4).ext3, 1, "Testing untouched merges with different datatypes");
		equals( mergeConfigs(conf3, conf4).ext4, 2, "Testing untouched merges with different datatypes");
		
	});

	test('Test is String', function(){
		equals( isString('my string'), true, 'Testing that a native string is a string');
		equals( isString(String("my string")), true, 'Testing that a string object is a string');
		equals( isString(1), false, 'Testing that an integer is not a string');
		equals( isString(true), false, 'Testing that a boolean is not a string');
	});
	
	test('Test arrayContains', function(){
		var arr1 = ['string','1',3,true,1.36];
		equals( arrayContains('string', arr1), true, 'testing that a string was in the array');
		equals( arrayContains('1', arr1), true, 'testing that an integer string was in the array');
		equals( arrayContains(3, arr1), true, 'testing that an integer was in the array');
		equals( arrayContains(true, arr1), true, 'testing that a boolean was in the array');
		equals( arrayContains(1.36, arr1), true, 'testing that a float was in the array');

		// negation tests		
		equals( arrayContains(false, arr1), false, 'testing that the other boolean was not in the array');
		equals( arrayContains('3', arr1), true, 'testing that an integer-string which matches an integer was in the array');
	});

	test('Test GUID Generation', function(){
		//03217ce2-b203-9834-33c9-c89fe615d5f2 - example
		var g1 = generateGuid();
		var g2 = generateGuid();
		
		equals( (g1.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) != ''), true, 'Testing to see if the generated guids match a typical guid regex' );
		equals( (g1 == g2), false, "testing to make sure 2 consecutive guids do not match");
	});
	
	// @TODO: Need to gather up an rss feed 
	test('Test RSS Feed Item to Video Config', function() {});

	test('Test Get Extension', function() {
		equals( _getExtension("testfile.ext"), 'ext', "testing that a standard file extension is received");
		equals( _getExtension("testfile.ext.bak"), 'bak', "testing that a double extension returns the last one");
	});

});
