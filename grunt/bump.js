'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-bump');
    grunt.config.set('bump', {
        options: {
            files: ['package.json'],
            pushTo: 'origin',
            updateConfigs: ['pkg'],
            commitFiles: ['-a']

        }
    });

};
