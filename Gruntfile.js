module.exports = function (grunt) {
    'use strict';

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
                tasks: ['mocha:test', 'uglify:production']
            },
            tests: {
                files: ['tests/spec/**/*.js'],
                tasks: ['mocha:test']
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
                sourceMapIncludeSources: false
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
