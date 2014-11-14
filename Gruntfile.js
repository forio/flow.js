module.exports = function (grunt) {
    'use strict';

    var UglifyJS = require('uglify-js');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['browserify2:edge', 'browserify2:tests:', 'mocha:test']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/specs/*.js', 'tests/*.js'],
            tasks: ['browserify2:tests:', 'mocha:test']
        }
    });

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

    grunt.loadNpmTasks('grunt-mocha');
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

    grunt.loadNpmTasks('grunt-contrib-jshint');
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

    grunt.loadNpmTasks('grunt-jscs');
    grunt.config.set('jscs', {
        src: ['src/*.js', 'src/**/*.js', 'tests/specs/*.js', 'tests/specs/**/*.js']
    });


    grunt.config.set('incrementVersion', {
        options: {
            files:  ['./dist/*.js']
        }
    });

    //loq --first-parent --no-merges
    grunt.loadNpmTasks('grunt-conventional-changelog');
    grunt.config.set('changelog', {
        options: {
            dest: 'dist/CHANGELOG.md',
            editor: 'sublime -w'
        }
    });

    grunt.loadNpmTasks('grunt-bump');
    grunt.config.set('bump', {
        options: {
            files: ['package.json', 'bower.json'],
            pushTo: 'master',
            updateConfigs: ['pkg'],
            commitFiles: ['-a']

        }
    });

    grunt.registerTask('test', ['mocha']);
    grunt.registerTask('validate', ['test', 'jshint:all', 'jscs']);
    grunt.registerTask('generateDev', ['browserify2:edge']);
    grunt.registerTask('production', ['generateDev', 'browserify2:mapped', 'browserify2:min']);

    grunt.registerTask('incrementVersion', function () {
        var files = this.options().files;
        grunt.file.expand(files).forEach(function (file) {
            var mainFile = grunt.file.read(file);
            var updated = grunt.template.process(mainFile, { data: grunt.file.readJSON('package.json') });
            grunt.file.write(file, updated);
        });
    });

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['validate', 'bump-only:' + type, 'incrementVersion', 'changelog', 'production', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    grunt.registerTask('default', ['watch', 'generateDev']);
};
