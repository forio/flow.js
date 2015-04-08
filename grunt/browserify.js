'use strict';
var minifyify = require('minifyify');
var istanbul = require('browserify-istanbul');
var remapify = require('remapify');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-browserify');
    grunt.config.set('browserify', {
        options: {
            browserifyOptions: {
                debug: true
            },
            postBundleCB: function (err, buffer, next) {
                var code = grunt.template.process(buffer.toString(), { data: grunt.file.readJSON('package.json') });
                next(err, code);
            }
        },

        tests: {
            files: {
                './tests/tests-browserify-bundle.js': './tests/test-list.js'
            },
            options: {
                preBundleCB: function (b) {
                    b.plugin(remapify, {
                        src: '**/*.js',
                        cwd: './src/',
                        expose: 'src'
                    });
                }
            }
        },
        edge: {
            files: {
                './dist/flow-edge.js': './src/app.js'
            }
        },
        instrumented: {
            files: {
                './dist/flow-edge-instrumented.js': './src/app.js'
            },
            options: {
                transform: [istanbul],
                debug: false
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
                        uglify: {
                            mangle: false,
                            warnings: true,
                            compress:{
                                screw_ie8: true,
                                join_vars: false
                            }
                        }
                    });
                }
            }
        }
    });
};
