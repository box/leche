module.exports = function(config) {

    'use strict';

    config.set({
        autoWatch: false,

        basePath: './',

        browsers: ['PhantomJS'],

        browserify: {
            transform: ['browserify-istanbul'],
            debug: true
        },

        browserNoActivityTimeout: 100000,

        captureConsole: true,

        colors: true,

        coverageReporter: {
            check: {
                global: {
                    statements: 95,
                    branches: 94,
                    functions: 95,
                    lines: 95
                }
            },
            reporters: [{ type: 'text' }]
        },

        files: [
            'lib/leche.js',
            'tests/lib/leche-test.js'
        ],

        frameworks: ['mocha', 'sinon-chai', 'browserify'],

        phantomjsLauncher: {
            exitOnResourceError: true
        },

        preprocessors: {
            'lib/leche.js': ['browserify'],
            'tests/lib/leche-test.js': ['browserify']
        },

        plugins: [
            'karma-mocha',
            'karma-sinon-chai',
            'karma-browserify',
            'karma-coverage',
            'karma-phantomjs-launcher'
        ],

        port: 9876,

        reporters: ['progress', 'coverage'],

        singleRun: true
    });
};
