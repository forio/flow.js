'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['browserify:edge', 'browserify:tests:', 'mocha:test', 'coverage-report']
        },
        stylesAddons: {
            files: ['src/add-ons/**/*.scss'],
            tasks: ['sass:addons']
        },
        scriptsAddons: {
            files: ['src/add-ons/**/*.js', 'src/add-ons/**/*.html'],
            tasks: ['browserify:addons']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/specs/*.js', 'tests/*.js', '!tests/dist/*'],
            tasks: ['browserify:tests', 'mocha:test', 'coverage-report']
        }
    });
};
