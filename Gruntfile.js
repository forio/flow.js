module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-browserify2');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-markdox');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs-checker');
    var UglifyJS = require('uglify-js');

    grunt.initConfig({
        watch: {
            source: {
                files: ['src/**/*.js'],
                tasks: ['browserify2:dev']
            },
            tests: {
                files: ['tests/specs/**/*.js', 'tests/*.js'],
                tasks: ['browserify2:tests:','mocha:test']
            }
        },

        browserify2: {
            options: {
                expose: {

                },
                entry: './src/app.js',
                compile: './dist/flow.js'
            },
            tests: {
                options: {

                    entry: './tests/test-list.js',
                    compile: './tests/tests-browserify-bundle.js',
                    debug: true
                }
            },
            dev: {
                options: {
                    debug: true
                }
            },
            production: {
                options: {
                    debug: false,
                    compile: './dist/flow.min.js'
                },
                afterHook: function(src) {
                    var result = UglifyJS.minify(src, {fromString: true, warnings: true, mangle: true});
                    return result.code;
                }
            }
        },

        jshint : {
            options: {
                jshintrc: true,
                reporter: require('jshint-stylish')
            },
            source: {
                files: {
                    src: ['src/**/*.js']
                }
            },
            tests: {
                files: {
                    src: ['tests/spec/**/*.js']
                }
            },
            all: {
                files: {
                    src: ['src/**/*.js', 'tests/spec/**/*.js']
                }
            }
        },
        uglify: {
            options: {
                compress: false,
                sourceMap: false,
                sourceMapIncludeSources: true
            },
            dev: {
                files: []
            },
            production: {
                options: {
                    compress: true,
                    sourceMap: true,
                    sourceMapIncludeSources: true
                },
                files: {

                }
            }
        },
        markdox: {
            options: {
                // Task-specific options go here.
                template: 'documentation/template.ejs'
            },
            target: {
                files:  [

                ]
            }
        },
        mocha: {
            test: {
                src: ['tests/index.html'],
                options: {
                    run: true
                }
            }
        }
    });

    grunt.registerTask('test', ['mocha']);
    grunt.registerTask('documentation', ['markdox']);
    grunt.registerTask('validate', ['jshint:all', 'test']);
    grunt.registerTask('production', ['browserify2:production']);
    grunt.registerTask('default', ['watch']);

};
