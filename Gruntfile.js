module.exports = function (grunt) {
    'use strict';

    // require('time-grunt')(grunt);
    require('jit-grunt')(grunt, {
        mocha: 'grunt-mocha-phantom-istanbul',
        'bump-only': 'grunt-bump',
        'bump-commit': 'grunt-bump',
        'changelog': 'grunt-conventional-changelog',
    });

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });

    grunt.file.expand('grunt/*.js').forEach(function (task) {
        require('./' + task)(grunt);
    });

    grunt.registerTask('generateDev', ['browserify:edge']);
    grunt.registerTask('test', ['generateDev', 'browserify:tests', 'browserify:instrumented', 'mocha', 'coverage-report']);
    grunt.registerTask('documentation', ['markdox']);
    grunt.registerTask('validate', ['jshint:all', 'jscs', 'test']);
    grunt.registerTask('production', ['validate', 'browserify:mapped', 'browserify:min']);

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['bump-only:' + type, 'production', 'incrementVersion', 'changelog', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    grunt.registerTask('default', ['generateDev', 'watch']);
};
