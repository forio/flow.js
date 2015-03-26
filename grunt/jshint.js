'use strict';

module.exports = function (grunt) {
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
};
