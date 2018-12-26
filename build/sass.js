const sass = require('node-sass');

module.exports = function (grunt) {
    grunt.config.set('sass', {
        options: {
            implementation: sass,
            sourceMap: true
        },
        addons: {
            files: {
                'dist/add-ons/flow-inspector.css': 'src/add-ons/flow-inspector/flow-inspector.scss'
            }
        }
    });
};
