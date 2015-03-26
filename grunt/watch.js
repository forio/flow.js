'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['browserify:edge', 'browserify:tests:', 'mocha:test']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/specs/*.js', 'tests/*.js'],
            tasks: ['browserify:tests:', 'mocha:test']
        }
    });
};
