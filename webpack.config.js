const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: path.resolve(__dirname, './src/index.tsx'),
  // entry: './src/index.tsx',
  devtool: 'inline-source-map',
  module: {
    rules: [
      // look for tsx files to transform into the bundle
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // look for css files to transform into the bundle
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // load all other assets using webpacks default loader
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'], // need .js and .jsx for dependency files
  },
  // use content hash for cache busting
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/',
  },
  // watch the dist file for changes when using the dev server
  devServer: {
    // static: './dist',
    hot: true,
    static: path.resolve(__dirname, './dist'),
    historyApiFallback: true,
  },
  plugins: [
    // generate css files from the found css files in the source
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    // generate html that points to the bundle with the updated hash
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
    // lint all js/jsx/ts/tsx files
    new ESLintPlugin({
      extensions: ['ts', 'tsx'],
    }),

    // netlify requires a _redirects file in the root of the dist folder to work with react router
    process.env.BUILD === 'netlify'
      ? new CopyPlugin({
          patterns: [{ from: 'netlify/_redirects', to: '.' }],
        })
      : null,
  ],
  // split bundle into two chunks, node modules(vendor code) in one bundle and app source code in the other
  // when source code changes, only the source code bundle will need to be updated, not the vendor code
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
}
