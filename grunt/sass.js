'use strict';

module.exports = function (grunt) {
    grunt.config.set('sass', {
        options: {
            sourceMap: true
        },
        debug: {
            files: {
                'dist/flow-debug.css': 'styles/flow-debug.scss'
            }
        }
    });
};
