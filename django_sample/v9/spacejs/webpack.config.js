const NODE_ENV = process.env.NODE_ENV || "development";
const webpack = require("webpack");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const BundleTracker = require("webpack-bundle-tracker");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        sample: "./src/core/js/sample.js"
    },
    mode: NODE_ENV,
    devtool: NODE_ENV === "production" ? "" : "source-map",
    output: {
        path: __dirname + "/public/sample/build",
        filename: "[name].[hash:8].js",
        chunkFilename: "[name].[chunkhash:8].js",
        publicPath: "/static/sample/build/"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        plugins: ["@babel/plugin-proposal-class-properties"],
                        presets: ["@babel/preset-env", "@babel/preset-react"]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [
                    NODE_ENV === "production" ?
                        {loader: MiniCssExtractPlugin.loader} :
                        {loader: 'style-loader'},
                    {loader: "css-loader"}
                ]
            }
        ]
    },
    plugins:
        NODE_ENV === "production" ?
            [
                new CleanWebpackPlugin({
                    verbose: true,
                    dry: false
                }),
                new webpack.optimize.AggressiveMergingPlugin(),
                new webpack.optimize.OccurrenceOrderPlugin(),
                new UglifyJsPlugin({
                    uglifyOptions: {
                        compress: {},
                        output: {
                            comments: false
                        }
                    },
                    sourceMap: false
                }),
                new MiniCssExtractPlugin({
                    filename: "./[name].[contenthash:8].css"
                }),
                new BundleTracker({
                    filename: "../webpack-stats.json",
                    indent: 2
                })
            ]
            :
            [
                new BundleTracker({
                    filename: "../webpack-stats.json",
                    indent: 2
                })
            ]
};
