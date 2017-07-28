'use strict';
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-mocha-phantom-istanbul-senluchen2015');
    grunt.config.set('mocha', {
        options: {
            run: true,
            growlOnSuccess: false,
            reporter: 'Min',
        },
        testdev: {
            log: true,
            src: ['tests/index.html']
        },
        test: {
            src: ['tests/index.html'],
            coverage: {
                jsonReport: 'coverage',
                lcovReport: 'coverage',
            }
        }
    });
};
