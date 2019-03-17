const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, options) => {
    const config = {
        entry: {
            popup: ['./popup.js'],
            document: ['./document.js']
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'dist')
        },
        optimization: {
            splitChunks: {
                cacheGroups: {
                    commons: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all'
                    }
                }
            }
        }
    };

    if(options.mode === 'development') {
        config.plugins = [
            new webpack.HotModuleReplacementPlugin(),
            new HtmlWebpackPlugin({
                title: 'Development',
                showErrors: true
            })
        ];

        config.devtool = 'inline-source-map';

        config.devServer = {
            hot: true,
            host: '0.0.0.0',
            contentBase: path.resolve(__dirname, 'dist'),
            stats: {
                color: true
            }
        };
    } else {
        config.plugins = [
            new CleanWebpackPlugin(['dist'])
        ];
    }

    return config;
};