'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['dist/flow-edge.js'],
            tasks: ['mocha:test']
        },
        stylesAddons: {
            files: ['src/add-ons/**/*.scss'],
            tasks: ['sass:addons']
        },
        scriptsAddons: {
            files: ['src/add-ons/**/*.js', 'src/add-ons/**/*.html'],
            tasks: ['browserify:addons']
        }
    });
};
