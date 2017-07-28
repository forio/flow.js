'use strict';
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-mocha-phantom-istanbul-senluchen2015');
    grunt.config.set('mocha', {
        options: {
            run: true,
            growlOnSuccess: false,
        },
        testdev: {
            src: ['tests/index.html'],
            options: {
                reporter: 'Min',
                log: true
            }
        },
        test: {
            src: ['tests/index.html'],
            options: {
                reporter: 'Nyan',
                coverage: {
                    jsonReport: 'coverage',
                    lcovReport: 'coverage',
                }
            }
        }
    });
};
