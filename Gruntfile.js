module.exports = function (grunt) {
    'use strict';

    // require('time-grunt')(grunt);
    require('jit-grunt')(grunt, {
        'bump-only': 'grunt-bump',
        'bump-commit': 'grunt-bump',
        'changelog': 'grunt-conventional-changelog',
    });

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        cdnBasePath: '//forio.com/tools/js-libs/flow/'
    });

    grunt.file.expand('grunt/*.js').forEach(function (task) {
        require('./' + task)(grunt);
    });

    grunt.registerTask('generateDev', ['browserify:edge']);
    grunt.registerTask('addons', ['browserify:addons', 'sass:addons']);
    grunt.registerTask('test', ['generateDev', 'browserify:tests', 'mocha',]);
    grunt.registerTask('documentation', ['jshint:all', 'jscs', 'markdox']);
    grunt.registerTask('validate', ['jshint:all', 'jscs', 'test']);
    grunt.registerTask('production', ['validate', 'addons', 'browserify:mapped', 'browserify:min']);

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['bump-only:' + type, 'production', 'incrementVersion', 'changelog', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    //grunt.registerTask('default', ['generateDev', 'addons', 'watch']);
    grunt.registerTask('default', ['webpack:edge', 'webpack:tests', 'watch']);
};
