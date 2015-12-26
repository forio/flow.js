'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['webpack:edge', 'webpack:tests', 'mocha:test']
        },
        stylesAddons: {
            files: ['src/add-ons/**/*.scss'],
            tasks: ['sass:addons']
        },
        scriptsAddons: {
            files: ['src/add-ons/**/*.js', 'src/add-ons/**/*.html'],
            tasks: ['webpack:addons']
        },
        tests: {
            files: ['tests/specs/**/*.js', 'tests/specs/*.js', 'tests/*.js', '!tests/dist/*'],
            tasks: ['webpack:tests', 'mocha:test']
        }
    });
};
