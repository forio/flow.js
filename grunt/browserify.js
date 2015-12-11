'use strict';
var minifyify = require('minifyify');
var istanbul = require('browserify-istanbul');
var remapify = require('remapify');
var stringify = require('stringify');

var uglifyOptions = {
    mangle: false,
    warnings: true,
    compress:{
        screw_ie8: true,
        join_vars: false
    }
};

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-browserify');
    grunt.config.set('browserify', {
        options: {
            browserifyOptions: {
                debug: true
            },
            postBundleCB: function (err, buffer, next) {
                var version = grunt.file.readJSON('package.json').version;
                var versioned = buffer.toString().replace(/<%= version %>/g, version);
                next(err, versioned);
            }
        },

        tests: {
            files: {
                './tests/dist/tests-browserify-bundle.js': './tests/test-list.js'
            },
            options: {
                preBundleCB: function (b) {
                    b.plugin(remapify, {
                        src: '**/*.js',
                        cwd: './src/',
                        expose: 'src'
                    });
                },
                postBundleCB: null
            }
        },
        instrumented: {
            files: {
                './tests/dist/tests-browserify-bundle-instrumented.js': './tests/test-list.js'
            },
            options: {
                transform: [istanbul],
                debug: false,
                preBundleCB: function (b) {
                    b.plugin(remapify, {
                        src: '**/*.js',
                        cwd: './src/',
                        expose: 'src'
                    });
                },
                postBundleCB: null
            }
        },
        edge: {
            files: {
                './dist/flow-edge.js': './src/app.js'
            }
        },

        addons: {
            files: {
                './dist/add-ons/flow-inspector.min.js': './src/add-ons/flow-inspector/flow-inspector.js'
            },
            options: {
                transform: [stringify],
                preBundleCB: function (b) {
                    b.plugin(minifyify, {
                        map: 'flow-inspector.min.js.map',
                        output: './dist/add-ons/flow-inspector.min.js.map',
                        uglify: uglifyOptions
                    });
                }
            }
        },
        mapped: {
            files: {
                './dist/flow.js': './src/app.js'
            }
        },
        min: {
            files: {
                './dist/flow.min.js': './src/app.js'
            },
            options: {
                preBundleCB: function (b) {
                    b.plugin(minifyify, {
                        map: 'flow.min.js.map',
                        output: 'dist/flow.min.js.map',
                        uglify: uglifyOptions
                    });
                }
            }
        }
    });
};
