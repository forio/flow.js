'use strict';

module.exports = function (grunt) {
    grunt.config.set('eslint', {
        options: {

        },
        source: {
            files: {
                src: ['src/**/*.js']
            }
        },
        tests: {
            files: {
                src: ['tests/specs/**/*.js']
            }
        }
    });
};
