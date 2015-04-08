'use strict';

module.exports = function (grunt) {
    //loq --first-parent --no-merges
    grunt.loadNpmTasks('grunt-conventional-changelog');
    grunt.config.set('changelog', {
        options: {
            dest: 'dist/CHANGELOG.md',
            editor: 'sublime -w'
        }
    });
};
