'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-bump');
    grunt.config.set('bump', {
        options: {
            files: ['package.json', 'bower.json'],
            pushTo: 'master',
            updateConfigs: ['pkg'],
            commitFiles: ['-a']

        }
    });

};
