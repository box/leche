/**
 * @fileoverview A JavaScript testing utility designed to work with Mocha and Sinon
 * @author nzakas
 */

'use strict';

/*global describe*/

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

/*
 * Because this isn't a test file, we need to include mocha explicitly so that
 * the globals (describe(), it(), etc.) are available when running in Node.js.
 * For the browser, we pass in an option to omit Mocha from the build, as we want
 * to use the global Mocha functions and not bundle Mocha with it (which could
 * introduce incompatibility issues). So this line is effectively just for Node.js
 * and is ignored in the browserified version.
 */
require('mocha');

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

/**
 * Determines if a given property is an accessor property of an object. This is
 * important because accessor properties have functions that will still execute
 * after Leche inherits from that object, effectively keeping functionality alive
 * on the fake object.
 * @param {Object} object The object to check.
 * @param {string} key The property name to check.
 * @returns {boolean} True if it's an accessor property, false if not.
 * @private
 */
function isAccessorProperty(object, key) {

	var result = false;

	// make sure this works in older browsers without error
	if (Object.getOwnPropertyDescriptor && object.hasOwnProperty(key)) {

		var descriptor = Object.getOwnPropertyDescriptor(object, key);
		result = !('value' in descriptor);
	}

	return result;
}

/**
 * Determines if a given property is a data property in ES5. This is
 * important because we can overwrite data properties with getters in ES5,
 * but not in ES3.
 * @param {Object} object The object to check.
 * @param {string} key The property name to check.
 * @returns {boolean} True if it's an ES5 data property, false if not.
 * @private
 */
function isES5DataProperty(object, key) {

	var result = false;

	// make sure this works in older browsers without error
	if (Object.getOwnPropertyDescriptor && object.hasOwnProperty(key)) {

		var descriptor = Object.getOwnPropertyDescriptor(object, key);
		result = ('value' in descriptor) && (typeof descriptor.value !== 'function');
	}

	return result;
}

/**
 * Determines if a given property is a data property in ES3.
 * @param {Object} object The object to check.
 * @param {string} key The property name to check.
 * @returns {boolean} True if it's an ES5 data property, false if not.
 * @private
 */
function isES3DataProperty(object, key) {
	return typeof object[key] !== 'function';
}

/**
 * An abstraction of Object.create() to ensure that this library can also be used
 * in browsers.
 * @param {Object} proto The object that should be the prototype of a new object.
 * @returns {Object} A new object whose prototype is proto.
 * @see http://javascript.crockford.com/prototypal.html
 * @private
 */
function createObject(proto) {
	function F() {}
	F.prototype = proto;
	return new F();
}

/**
 * Returns the first maxLen characters of a the JSON string representation of
 * the given object.
 *
 * @param {Object} object The object to get a string representation for.
 * @param {number} maxLen The number of characters to truncate to.
 * @returns {string} The first maxLen characters of the JSON string.
 */
function truncatedJSONStringify(object, maxLen) {
	return JSON.stringify(object).slice(0, maxLen);
}

/**
 * Gets a string representation of an object. If there is a usable toString()
 * implementation, then it will return that. Otherwise, it will attempt to get
 * a more specific string representation by getting the JSON string version of
 * the object. For arrays, it will attempt to stringify its items recursively.
 *
 * @param {*} object The object to get a string representation for.
 * @param {number} maxDepth The maximum depth to recurse for arrays.
 * @returns {string} The string representation of the object.
 * @private
 */
function stringifyObject(object, maxDepth) {
	var stringRepresentation = object.toString();
	if (object instanceof Array && maxDepth > 0) {
		return object.map(function(item) {
			return stringifyObject(item, maxDepth - 1);
		}).toString();
	} else if (stringRepresentation === '[object Object]') {
		return truncatedJSONStringify(object, 30);
	} else {
		return stringRepresentation;
	}
}

/**
 * Converts an array into an object whose keys are a string representation of the
 * each array item and whose values are each array item. This is to normalize the
 * information into an object so that other operations can assume objects are
 * always used. For an array like this:
 *
 *		[ "foo", "bar" ]
 *
 * It creates an object like this:
 *
 *		{ "foo": "foo", "bar": "bar" }
 *
 * If there are duplicate values in the array, only the last value is represented
 * in the resulting object.
 *
 * @param {Array} array The array to convert.
 * @returns {Object} An object representing the array.
 * @private
 */
function createNamedDataset(array) {
	var result = {};

	for (var i = 0, len = array.length; i < len; i++) {
		result[stringifyObject(array[i], 1)] = array[i];
	}

	return result;
}

/**
 * Used by eos.create() as the default implementation for each method.
 * @returns {void}
 * @private
 */
function noop() {
	// intentionally blank
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

/**
 * @module leche
 */
module.exports = {

	/**
	 * Creates a new object with the specified methods. All methods do nothing,
	 * so the resulting object is suitable for use in a variety of situations.
	 * @param {string[]} methods The method names to create methods for.
	 * @returns {Object} A new object with the specified methods defined.
	 */
	create: function(methods) {

		var object = {};

		for (var i = 0, len = methods.length; i < len; i++) {

			// it's safe to use the same method for all since it doesn't do anything
			object[methods[i]] = noop;
		}

		return object;

	},

	/**
	 * Creates a fake based on the given object. The fake has the template as
	 * its prototype and all methods are stubbed out to throw an error when
	 * called. The intent is to create an object that can be used with
	 * sinon.mock().
	 * @param {Object} template The object to base the fake off of.
	 * @returns {Object} A fake with the same methods as template.
	 */
	fake: function(template) {

		var fake = createObject(template);

		for (var key in fake) {
			/*eslint-disable no-loop-func*/

			// intentionally don't use hasOwnProperty() to get all prototype methods
			if (isAccessorProperty(template, key)) {	// must check against template, not fake

				/*
				 * It's impossible to create an object that doesn't have a property
				 * that is an accessor on its own prototype. The best we can do
				 * is create a value property of the same name that has no initial
				 * value. It's not perfect, but it does prevent errors that occur
				 * when the accessor methods assume the object is real.
				 */
				Object.defineProperty(fake, key, {
					value: undefined,
					writable: true,
					enumerable: true,
					configurable: true
				});

			} else if (isES5DataProperty(template, key)) {

				(function(propertyKey) {

					var propertyIsSet = false,
						propertyValue;

					Object.defineProperty(fake, key, {
						get: function() {
							if (propertyIsSet) {
								return propertyValue;
							}

							throw new Error('Unexpected use of property "' + propertyKey + '".');
						},
						set: function(value) {

							propertyIsSet = true;
							propertyValue = value;

							// if not for https://github.com/box/leche/issues/14, we could do this
							// Object.defineProperty(this, key, {
							//  value: value,
							//  writable: true
							// });
						},
						enumerable: true,
						configurable: true
					});
				}(key));

			} else if (isES3DataProperty(template, key)) {

				// can't do anything special for ES3, so just assign undefined
				fake[key] = undefined;

			} else if (typeof fake[key] === 'function') {
				fake[key] = (function(methodKey) {
					return function() {
						throw new Error('Unexpected call to method "' + methodKey + '".');
					};
				}(key));
			}

			/*eslint-enable no-loop-func*/
		}

		return fake;
	},

	/**
	 * A data provider for use with Mocha. Use this around a call to it() to run
	 * the test over a series of data.
	 * @param {Object|Array} dataset The data to test.
	 * @param {Function} testFunction The function to call for each piece of data.
	 * @returns {void}
	 * @throws {Error} If dataset is missing or an empty array.
	 */
	withData: function(dataset, testFunction) {

		// check for missing or null argument
		if (typeof dataset !== 'object' || dataset === null) {
			throw new Error('First argument must be an object or non-empty array.');
		}

		/*
		 * The dataset needs to be normalized so it looks like:
		 * {
		 *      "name1": [ "data1", "data2" ],
		 *      "name2": [ "data3", "data4" ],
		 * }
		 */
		var namedDataset = dataset;
		if (dataset instanceof Array) {

			// arrays must have at least one item
			if (dataset.length) {
				namedDataset = createNamedDataset(dataset);
			} else {
				throw new Error('First argument must be an object or non-empty array.');
			}
		}

		/*
		 * For each name, create a new describe() block containing the name.
		 * This causes the dataset info to be output into the console, making
		 * it easier to determine which dataset caused a problem when there's an
		 * error.
		 */
		for (var name in namedDataset) {
			if (namedDataset.hasOwnProperty(name)) {
				/*eslint-disable no-loop-func*/

				describe('with ' + name, (function(dataName) {
					return function() {

						var args = namedDataset[dataName];

						if (!(args instanceof Array)) {
							args = [args];
						}

						testFunction.apply(this, args);
					};
				}(name)));

				/*eslint-enable no-loop-func*/
			}
		}
	}

};
