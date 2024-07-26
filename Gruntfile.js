module.exports = function (grunt) {
    'use strict';
    var r = require;

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

    grunt.file.expand('build/*.js').forEach(function (task) {
        require('./' + task)(grunt);
    });

    grunt.registerTask('addons', ['sass:addons', 'webpack:addons']);
    grunt.registerTask('addonsDev', ['watch:scriptsAddons', 'watch:stylesAddons']);

    grunt.registerTask('test', ['karma:testWithCoverage']);
    grunt.registerTask('documentation', ['eslint', 'markdox']);
    
    grunt.registerTask('validate', ['eslint', 'test']);
    grunt.registerTask('production', ['validate', 'webpack:mapped', 'webpack:min', 'addons']);

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['bump-only:' + type, 'production', 'incrementVersion', 'changelog', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    grunt.registerTask('default', ['webpack:edge', 'watch']);
};
