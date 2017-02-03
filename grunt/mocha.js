'use strict';
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-mocha-phantom-istanbul');
    grunt.config.set('mocha', {
        options: {
            run: true,
            growlOnSuccess: false,
            reporter: 'Min',
            // log: true,
            coverage: {
                jsonReport: 'coverage'
            }
        },
        test: {
            src: ['tests/index.html']
        }
    });
};
