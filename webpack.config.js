const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
    watch: true,
    entry: {
        index: './src/scripts/main.js'
    },
    mode: 'development',
    devServer: {
        open: true,
        //contentBase: path.join(__dirname, 'dist')
        publicPath: '/dist/',
        writeToDisk: true //avoir le dossier 'dist' sur l'ordinateur

    },
    devtool: 'inline-source-map',
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(__dirname, './src/index.html'),
            chunks: ['index']
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css',            
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        
                    },
                    'css-loader'],
            },
            {
                test: /\.html$/,
                use: ["html-loader"]
            },
            {
                test: /\.(jpg|png)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "assets/textures/"
                    }
                }
            },            
        ]
    }
};