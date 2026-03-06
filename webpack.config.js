const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: 'body',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'words.csv',      to: 'words.csv'      },
        { from: 'homework.csv',   to: 'homework.csv'   },
        { from: 'lyrics.csv',     to: 'lyrics.csv'     },
        { from: 'src/Victory!.mp3', to: 'Victory!.mp3' },
      ],
    }),
  ],
  resolve: {
    modules: ['node_modules'],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
};