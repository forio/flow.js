'use strict';

module.exports = function (grunt) {
    grunt.config.set('sass', {
        options: {
            sourceMap: true
        },
        addons: {
            files: {
                'dist/add-ons/flow-inspector.css': 'src/add-ons/flow-inspector/flow-inspector.scss'
            }
        }
    });
};
