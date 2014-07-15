module.exports = function (grunt) {
    'use strict';


    grunt.loadNpmTasks('grunt-browserify2');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-markdox');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs-checker');

    grunt.initConfig({
        watch: {
            source: {
                files: ['src/**/*.js'],
                tasks: ['browserify2:dev']
            },
            tests: {
                files: ['tests/spec/**/*.js'],
                tasks: ['mocha:test']
            }
        },

        browserify2: {
            options: {
                expose: {

                },
                entry: './src/app.js',
                compile: './dist/flow.js'
            },
            dev: {
                options: {
                    debug: true
                }
            },
            production: {
                options: {
                    debug: false
                }
                // afterHook: function(src) {
                //     // var result = UglifyJS.minify(src, {fromString: true});
                //     return result.code;
                // }
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
    grunt.registerTask('production', [ 'validate', 'uglify:production', 'documentation']);
    grunt.registerTask('default', ['watch']);

};
