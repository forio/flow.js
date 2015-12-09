'use strict';

module.exports = function (grunt) {
    grunt.config.set('sass', {
        options: {
            sourceMap: true
        },
        addons: {
            files: {
                'dist/add-ons/flow-debug.css': 'src/add-ons/flow-debug/flow-debug.scss'
            }
        }
    });
};
