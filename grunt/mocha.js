'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-mocha-phantom-istanbul');
    grunt.config.set('mocha', {
        test: {
            src: ['tests/index.html'],
            options: {
                growlOnSuccess: false,
                reporter: 'Min',
                run: true,
                // log: true,
            }
        }
    });
};
