/**
 * @fileoverview Build file
 * @author nzakas
 */
/*global target, exec, echo, find, which, test, exit, mkdir*/

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

require('shelljs/make');

var util = require('util'),
	nodeCLI = require('shelljs-nodecli');

//------------------------------------------------------------------------------
// Data
//------------------------------------------------------------------------------

var NODE = 'node ',	// intentional extra space
	NODE_MODULES = './node_modules/',
	BUILD_DIR = './build/',
	DIST_DIR = './dist/',
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
 * Executes a Node CLI and exits with a non-zero exit code if the
 * CLI execution returns a non-zero exit code. Otherwise, it does
 * not exit.
 * @param {...string} [args] Arguments to pass to the Node CLI utility.
 * @returns {void}
 * @private
 */
function nodeExec(args) {
	args = arguments; // make linting happy
	var code = nodeCLI.exec.apply(nodeCLI, args).code;
	if (code !== 0) {
		exit(code);
	}
}

/**
 * Runs exec() but exits if the exit code is non-zero.
 * @param {string} cmd The command to execute.
 * @returns {void}
 * @private
 */
function execOrExit(cmd) {
	var code = exec(cmd).code;
	if (code !== 0) {
		exit(code);
	}
}

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

	target.generateDist();

	execOrExit('git add -A');
	execOrExit('git commit --amend --no-edit');

	execOrExit('npm version ' + type);

	// ...and publish
	execOrExit('git push origin master --tags');

	// also publish to npm (requires authentication)
	execOrExit('npm publish');
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

	echo('Running Node.js tests');
	exec(ISTANBUL + ' cover ' + MOCHA + ' -- -R dot ' + TEST_FILES);

	echo('Running browser tests');
	target.browserify();
	nodeExec("mocha-phantomjs", "-R dot", "tests/tests.htm");
};

target.docs = function() {
	echo('Generating documentation');
	exec(JSDOC + '-d jsdoc ' + JS_DIRS.join(' '));
	echo('Documentation has been output to /jsdoc');
};

target.generateDist = function() {
	var pkg = require('./package.json'),
		distFilename = DIST_DIR + pkg.name + '.js',
		minDistFilename = distFilename.replace(/\.js$/, '.min.js');

	if (!test('-d', DIST_DIR)) {
		mkdir(DIST_DIR);
	}

	exec(util.format('%s %s.js -o %s -s %s -i mocha', BROWSERIFY, LIB_DIR + pkg.name,
			distFilename, pkg.name));


	nodeExec('uglifyjs', distFilename, '-o', minDistFilename);

	// Add copyrights
	cat('./config/copyright.txt', distFilename).to(distFilename);
	cat('./config/copyright.txt', minDistFilename).to(minDistFilename);

	// ensure there's a newline at the end of each file
	(cat(distFilename) + '\n').to(distFilename);
	(cat(minDistFilename) + '\n').to(minDistFilename);
};

target.browserify = function() {
	var pkg = require('./package.json'),
		buildFilename = BUILD_DIR + pkg.name + '.js',
		minDistFilename = buildFilename.replace(/\.js$/, '.min.js');

	if (!test('-d', BUILD_DIR)) {
		mkdir(BUILD_DIR);
	}

	exec(util.format('%s %s.js -o %s -s %s -i mocha', BROWSERIFY, LIB_DIR + pkg.name,
			buildFilename, pkg.name));
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
