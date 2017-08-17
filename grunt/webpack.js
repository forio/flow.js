'use strict';
var webpack = require('webpack');
var path = require('path');

var uglifyOptions = {
    mangle: false,
    warnings: true,
    sourceMap: true,
    compress: {
        screw_ie8: true,
        join_vars: false
    }
};

module.exports = function (grunt) {
    var version = grunt.file.readJSON('package.json').version;
    var banner = grunt.file.read('banner.txt');
    banner = banner.replace('RELEASE_VERSION', version);

    var babelloader = { 
        test: /\.js$/, 
        exclude: /node_modules\/(?!(autotrack|dom-utils))/,
        loader: 'babel-loader',
        options: {
            plugins: [
                // 'transform-es2015-modules-commonjs',
                'transform-es2015-destructuring',
                'transform-es2015-block-scoping',
                'babel-plugin-transform-es2015-arrow-functions',
                'babel-plugin-transform-es2015-classes',
                'babel-plugin-transform-es2015-template-literals',
            ]
        }
    };
    grunt.config.set('webpack', {
        options: {
            stats: 'errors-only',
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                })
            ],
            resolve: {
                modules: [__dirname + '/../src', 'node_modules']
            }
        },
        edge: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                pathinfo: true,
                filename: 'flow-edge.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            module: {
                rules: [] //meant for testing in a new browser so no babel transpiling required
            },
            plugins: [],
            // devtool: 'eval'
        },
        mapped: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                filename: 'flow.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            module: {
                rules: [babelloader]
            },
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                }),
                new webpack.BannerPlugin({
                    banner: banner,
                    entryOnly: true
                }),
            ],
            devtool: 'source-map',
        },
        min: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                filename: 'flow.min.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            module: {
                rules: [babelloader]
            },
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                }),
                new webpack.BannerPlugin({
                    banner: banner,
                    entryOnly: true
                }),
                new webpack.optimize.UglifyJsPlugin(uglifyOptions),
            ],
            devtool: 'source-map'
        },
        addons: {
            entry: path.resolve('./src/add-ons/flow-inspector/flow-inspector.js'),
            devtool: 'source-map',
            output: {
                path: path.resolve('./dist/add-ons/'),
                filename: 'flow-inspector.min.js'
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin(uglifyOptions)
            ],
            module: {
                rules: [
                    babelloader,
                    { test: /\.html$/, loader: 'raw-loader' },
                ]
            }
        }
    });
};
