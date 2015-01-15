/**
 * @fileoverview Build file
 * @author nzakas
 */
/*global target, exec, echo, find, which, test, mkdir*/

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

require('shelljs/make');

var util = require('util');

//------------------------------------------------------------------------------
// Data
//------------------------------------------------------------------------------

var NODE = 'node ',	// intentional extra space
	NODE_MODULES = './node_modules/',
	BUILD_DIR = './build/',
	LIB_DIR = './lib/',

	// Utilities - intentional extra space at the end of each string
	JSON_LINT = NODE + NODE_MODULES + 'jsonlint/lib/cli.js ',
	ISTANBUL = NODE + NODE_MODULES + 'istanbul/lib/cli.js ',
	MOCHA = NODE_MODULES + 'mocha/bin/_mocha ',
	JSDOC = NODE + NODE_MODULES + 'jsdoc/jsdoc.js ',
	ESLINT = NODE + NODE_MODULES + 'eslint/bin/eslint ',
	BROWSERIFY = NODE + NODE_MODULES + 'browserify/bin/cmd.js',

	// Directories
	JS_DIRS = getSourceDirectories(),

	// Files
	JS_FILES = find(JS_DIRS).filter(fileType('js')).join(' '),
	JSON_FILES = find('config/').filter(fileType('json')).join(' ') + ' .eslintrc',
	TEST_FILES = find('tests/').filter(fileType('js')).join(' '),
	JSON_SCHEMA = './config/package.schema.json';

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Generates a function that matches files with a particular extension.
 * @param {string} extension The file extension (i.e. 'js')
 * @returns {Function} The function to pass into a filter method.
 * @private
 */
function fileType(extension) {
	return function(filename) {
		return filename.substring(filename.lastIndexOf('.') + 1) === extension;
	};
}

/**
 * Determines which directories are present that might have JavaScript files.
 * @returns {string[]} An array of directories that exist.
 * @private
 */
function getSourceDirectories() {
	var dirs = [ 'lib', 'src', 'app' ],
		result = [];

	dirs.forEach(function(dir) {
		if (test('-d', dir)) {
			result.push(dir);
		}
	});

	return result;
}

/**
 * Creates a release version tag and pushes to origin.
 * @param {string} type The type of release to do (patch, minor, major)
 * @returns {void}
 */
function release(type) {
	target.test();
	exec('npm version ' + type);

	// npm version changes indentation to spaces, this changes it to tabs
	exec('git add package.json');
	exec('git commit --amend --no-edit');

	// ...and publish
	exec('git push origin master --tags');

	// also publish to npm (requires authentication)
	exec('npm publish');
}


//------------------------------------------------------------------------------
// Tasks
//------------------------------------------------------------------------------

target.all = function() {
	target.test();
};

target.lint = function() {
	echo('Validating JSON Files');
	exec(JSON_LINT + '-q -c ' + JSON_FILES);

	echo('Validating package.json');
	exec(JSON_LINT + 'package.json -q -V ' + JSON_SCHEMA);

	echo('Validating JavaScript files');
	exec(ESLINT + ' ' + JS_FILES);
};

target.test = function() {
	target.lint();
	exec(ISTANBUL + ' cover ' + MOCHA + TEST_FILES);
};

target.docs = function() {
	echo('Generating documentation');
	exec(JSDOC + '-d jsdoc ' + JS_DIRS.join(' '));
	echo('Documentation has been output to /jsdoc');
};

target.browserify = function() {
	var pkg = require('./package.json');

	if (!test('-d', BUILD_DIR)) {
		mkdir(BUILD_DIR);
	}

	exec(util.format('%s %s.js -o %s-%s.js -s %s -i mocha', BROWSERIFY, LIB_DIR + pkg.name,
			BUILD_DIR + pkg.name, pkg.version, pkg.name));

	// exec(BROWSERIFY + ' ' + LIB_DIR + pkg.name + '.js -o ' + BUILD_DIR + pkg.name + '-' + pkg.version + '.js -s ' + pkg.name);
};

target.patch = function() {
	release('patch');
};

target.minor = function() {
	release('minor');
};

target.major = function() {
	release('major');
};
