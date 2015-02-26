/**
 * @fileoverview Tests for Leche
 * @author nzakas
 */

/*global describe, it, afterEach, sinon, leche, chai*/

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var sinon = compatRequire('sinon') || sinon,
	assert = (compatRequire('chai') || chai).assert,
	leche = compatRequire('../../lib/leche') || leche;

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

// constants
var TEST_PREFIX = 'with ';

// variables
var withData = leche.withData;

/**
 * An abstraction over require() to allow these tests to be run in a browser.
 * @param {string} name The name of the package to load.
 * @returns {?Object} The module in Node.js, null in browsers.
 * @private
 */
function compatRequire(name) {
	if (typeof require === 'function') {
		return require(name);
	} else {
		return null;
	}
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

describe('leche', function() {

	var sandbox = sinon.sandbox.create();

	afterEach(function() {
		sandbox.verifyAndRestore();
	});

	describe('create()', function() {

		it('should create an object with the specified methods', function() {

			var object = leche.create(['method1', 'method2']);

			assert.ok(object.hasOwnProperty('method1'));
			assert.ok(object.hasOwnProperty('method2'));
			assert.equal(typeof object.method1, 'function');
			assert.equal(typeof object.method2, 'function');
		});

		it('should create an object with methods that do nothing', function() {

			var object = leche.create(['method1', 'method2']);

			assert.doesNotThrow(function() {
				object.method1();
			});

			assert.doesNotThrow(function() {
				object.method2();
			});

		});

	});

	describe('fake()', function() {

		it('should create an object whose prototype is the template when called', function() {
			var template = {};
			var fake = leche.fake(template);

			assert.ok(template.isPrototypeOf(fake));
		});

		it('should create an object whose methods throw an error when called on an object with own methods only', function() {

			var template = {
				method: function() {
					return true;
				}
			};

			var fake = leche.fake(template);
			assert.throws(function() {
				fake.method();
			}, /Unexpected call to method "method"\./);
		});

		it('should create an object whose prototype methods throw an error when called on an object with prototype methods', function() {

			var template = {
				method: function() {
					return true;
				}
			};

			var fake = leche.fake(Object.create(template));
			assert.throws(function() {
				fake.method();
			}, /Unexpected call to method "method"\./);
		});

		it('should create an object whose properties throw an error when accessed', function() {

			var template = {
				name: 'leche'
			};

			var fake = leche.fake(template);
			assert.throws(function() {
				fake.name; // calls getter
			}, /Unexpected use of property "name"\./);

		});

		it('should create an object whose properties do not throw an error when set to a value', function() {

			var template = {
				name: 'leche'
			};

			var fake = leche.fake(template);
			fake.name = 'box';

			assert.equal(fake.name, 'box');
		});

		it('should create an object with a data property when called on an object with only an accessor property', function() {

			var template = {
				get data() {
					return this.foo.bar;
				}
			};

			var fake = leche.fake(template);
			assert.isTrue('data' in fake);
			assert.isUndefined(fake.data);
		});


	});

	describe('withData()', function(){

		it ('should call the passed-in function multiple times with an object dataset', function() {
			var spy = sandbox.spy();

			withData({
				name1: [ 1, 2 ],
				name2: [ 3, 4 ]
			}, spy);

			var firstCall = spy.getCall(0),
				secondCall = spy.getCall(1);

			assert.ok(spy.calledTwice);
			assert.ok(firstCall.calledWith(1, 2));
			assert.ok(secondCall.calledWith(3, 4));
		});

		it ('should call the passed-in function multiple times with an object dataset and non-array values', function() {
			var spy = sandbox.spy();

			withData({
				name1: 1,
				name2: 2
			}, spy);

			var firstCall = spy.getCall(0),
				secondCall = spy.getCall(1);

			assert.ok(spy.calledTwice);
			assert.ok(firstCall.calledWith(1));
			assert.ok(secondCall.calledWith(2));
		});

		it ('should call the passed-in function multiple times with an array dataset', function() {
			var spy = sandbox.spy();

			withData([
				[ 1, 2 ],
				[ 3, 4 ]
			], spy);

			var firstCall = spy.getCall(0),
				secondCall = spy.getCall(1);

			assert.ok(spy.calledTwice);
			assert.ok(firstCall.calledWith(1, 2));
			assert.ok(secondCall.calledWith(3, 4));
		});


		it ('should call the passed-in function multiple times with an array dataset and non-array values', function() {
			var spy = sandbox.spy();

			withData([
				1,
				2
			], spy);

			var firstCall = spy.getCall(0),
				secondCall = spy.getCall(1);

			assert.ok(spy.calledTwice);
			assert.ok(firstCall.calledWith(1));
			assert.ok(secondCall.calledWith(2));
		});

		it ('should throw an error when the first argument is null', function() {

			assert.throws(function() {
				withData(null, function() {});
			}, /First argument must be/);
		});

		it ('should throw an error when the first argument is an empty array', function() {

			assert.throws(function() {
				withData([], function() {});
			}, /First argument must be/);
		});

		describe('explicit test names', function() {

			withData({
				testName: 'testName',
				'wonderful test name': 'wonderful test name'
			}, function(expected) {
				it('should report the test name', function() {

					// @REVIEW(naeims) 2014-02-26: Make 'with ' a constant because it is used multiple times.
					// checks the previous describe()'s title
					assert.equal(this.test.parent.title, TEST_PREFIX + expected);
				});
			});

		});

		describe('implicit test names with arrays', function() {

			withData([
				[ 1, 2 ],
				[ 3, 4 ]
			], function(first, second) {
				it('should report the test name', function() {

					// checks the previous describe()'s title
					assert.equal(this.test.parent.title, TEST_PREFIX + [first, second]);
				});
			});

		});

		describe('implicit test names with primitives', function() {

			withData([
				'testName',
				123
			], function(expected) {
				it('should report the test name', function() {

					// checks the previous describe()'s title
					assert.equal(this.test.parent.title, TEST_PREFIX + expected);
				});
			});

		});

	});

});
