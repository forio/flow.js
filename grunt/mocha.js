'use strict';
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-mocha-phantom-istanbul-senluchen2015');
    grunt.config.set('mocha', {
        options: {
            run: true,
            growlOnSuccess: false,
            reporter: 'Min',
            // log: true,
            coverage: {
                jsonReport: 'coverage',
                lcovReport: 'coverage',
            }
        },
        test: {
            src: ['tests/index.html']
        }
    });
};
