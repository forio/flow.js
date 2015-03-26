'use strict';

module.exports = function (grunt) {
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
};
