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

var opOptions = {
    path: path.resolve('./dist/'),
    library: 'Flow',
    libraryExport: 'default',
    libraryTarget: 'var'
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
                'transform-es2015-computed-properties',
                'babel-plugin-transform-es2015-arrow-functions',
                'babel-plugin-transform-es2015-classes',
                'babel-plugin-transform-es2015-template-literals',
            ]
        }
    };
    grunt.config.set('webpack', {
        options: {
            stats: 'errors-only',
            node: false,
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                })
            ],
            resolve: {
                modules: [__dirname + '/../src', 'node_modules'],
                alias: {
                    tests: __dirname + '/../tests',
                }
            },
            externals: {
                jquery: 'jQuery',
                lodash: '_',
            }
        },
        edge: {
            entry: path.resolve('./src/flow.js'),
            output: {
                filename: 'flow-edge.js',
                pathinfo: true,
                ...opOptions,
            },
            module: {
                rules: [] //meant for testing in a new browser so no babel transpiling required
            },
            plugins: [],
            devtool: 'cheap-module-source-map',

            // devtool: 'eval'
        },
        mapped: {
            entry: path.resolve('./src/flow.js'),
            output: {
                filename: 'flow.js',
                ...opOptions,
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
                ...opOptions,
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
            devtool: 'source-map',
        },
        addons: {
            entry: path.resolve('./src/add-ons/flow-inspector/flow-inspector.js'),
            devtool: 'source-map',
            output: {
                ...opOptions,
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
