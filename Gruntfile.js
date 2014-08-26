module.exports = function(grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-browserify2');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs-checker');
    grunt.loadNpmTasks('grunt-bump');


    var UglifyJS = require('uglify-js');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });


    grunt.config.set('bump', {
        options: {
            files: ['package.json', 'bower.json'],
            updateConfigs: ['pkg'],
            commitFiles: ['-a']

        }
    });

    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['browserify2:dev', 'browserify2:tests:']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/*.js'],
            tasks: ['browserify2:tests:', 'mocha:test']
        }
    });

    grunt.loadNpmTasks('grunt-templated-changelog');
    grunt.config.set('changelog', {
        release: {
            options: {
                version: grunt.config.get('pkg').version,
                changelog: 'dist/CHANGELOG.md',
                // labels: ['refactor'],
                template: 'simple'
            }
        }
    });

    //loq --first-parent --no-merges
    // grunt.loadNpmTasks('grunt-conventional-changelog');
    // grunt.config.set('changelog', {
    //     options: {
    //         dest: 'dist/CHANGELOG.md',
    //         editor: 'sublime -w'
    //     }
    // });

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
            }
        },
        min: {
            options: {
                debug: false,
                compile: './dist/flow.min.js'
            },
            afterHook: function(src) {
                var result = UglifyJS.minify(src, {
                    fromString: true,
                    warnings: true,
                    mangle: true
                });
                return result.code;
            }
        }
    });

    grunt.config.set('jshint', {
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
                src: ['tests/specs/**/*.js']
            }
        },
        all: {
            files: {
                src: ['src/**/*.js', 'tests/specs/**/*.js']
            }
        }
    });

    grunt.config.set('uglify', {
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
    });

    grunt.config.set('mocha', {
        test: {
            src: ['tests/index.html'],
            options: {
                growlOnSuccess: false,
                reporter: 'Min',
                run: true
            }
        }
    });


    grunt.registerTask('test', ['mocha']);
    grunt.registerTask('validate', ['jshint:all', 'test']);
    grunt.registerTask('generateDev', ['browserify2:edge']);
    grunt.registerTask('production', ['generateDev', 'browserify2:mapped', 'browserify2:min']);

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['validate', 'production', 'bump-only:' + type, 'changelog', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    grunt.registerTask('default', ['watch', 'generateDev']);

};
