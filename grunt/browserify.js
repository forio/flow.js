'use strict';
var UglifyJS = require('uglify-js');

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-browserify2');
    grunt.config.set('browserify2', {
        options: {
            expose: {

            },
            entry: './src/app.js'
        },
        tests: {
            options: {

                entry: './tests/test-list.js',
                compile: './tests/tests-browserify-bundle.js',
                debug: true
            }
        },
        edge: {
            options: {
                debug: true,
                compile: './dist/flow-edge.js'
            }
        },
        mapped: {
            options: {
                debug: true,
                compile: './dist/flow.js'
            },
            afterHook: function (src) {
                var banner = grunt.file.read('./banner.js');
                banner = grunt.template.process(banner, { data: grunt.file.readJSON('package.json') });
                return banner + src;
            }
        },
        min: {
            options: {
                debug: false,
                compile: './dist/flow.min.js'
            },
            afterHook: function (src) {
                var result = UglifyJS.minify(src, {
                    fromString: true,
                    warnings: true,
                    mangle: true,
                    compress:{
                        pure_funcs: [ 'console.log' ]
                    }
                });
                var code = result.code;
                var banner = grunt.file.read('./banner.js');
                banner = grunt.template.process(banner, { data: grunt.file.readJSON('package.json') });
                return banner + code;
            }
        }
    });

};
