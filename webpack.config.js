const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const CompressionWebpackPlugin = require('compression-webpack-plugin')
const config = require('./src/assets/config.json')
const BundleAnalyzerPlugin =
  require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const exp = require('constants')

const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin

// Bundle dependencies as a separate ES moudule

const isProduction = process.env.NODE_ENV === 'production'

// Extract the common dependencies from the package.json file
const deps = require('./package.json').dependencies

// External Apps
const externalAppsConfig = require('./src/assets/apps.json')

module.exports = {
  // This app is only for web browsers
  target: 'web',
  mode: isProduction ? 'production' : 'development', // Set mode to production or development
  entry: {
    cyweb: path.resolve(__dirname, './src/index.tsx'),
  },
  devtool: isProduction ? false : 'inline-source-map',
  stats: 'normal',
  module: {
    rules: [
      // look for tsx files to transform into the bundle
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: [/node_modules/, /dist/, /apps/],
      },
      // look for css files to transform into the bundle
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // load all other assets using webpacks default loader
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
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
    // publicPath: config.urlBaseName !== '' ? config.urlBaseName : '/',
    publicPath: 'auto', // Required to use module federation (? Need to double check)
  },
  // watch the dist file for changes when using the dev server
  devServer: {
    hot: true,
    client: {
      overlay: true,
    },
    static: path.resolve(__dirname, './dist'),
    historyApiFallback: {
      rewrites: [
        { from: /^\/$/, to: '/index.html' }, // default index route
        { from: /./, to: '/index.html' }, // all other routes
      ],
    },
    headers: {
      'Access-Control-Allow-Origin': '*', // allow access from any origin
    },
    port: 5500,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'cyweb',
      filename: 'remoteEntry.js',
      remotes: externalAppsConfig,
      exposes: {
        // Data models to be used by other apps
        './useDataStore': './src/components/AppManager/useDataStore.tsx',
        './WorkspaceStore': './src/store/WorkspaceStore.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
      },
    }),
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static',
    // }),
    new CopyPlugin({
      patterns: [{ from: './silent-check-sso.html', to: '.' }],
    }),
    // generate css files from the found css files in the source
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    // generate html that points to the bundle with the updated hash
    new HtmlWebpackPlugin({
      template: './index.html',
      favicon: './src/assets/favicon.ico',
    }),
    new CleanWebpackPlugin(),
    // netlify requires a _redirects file in the root of the dist folder to work with react router
    ...(process.env.BUILD === 'netlify'
      ? [
          new CopyPlugin({
            patterns: [{ from: 'netlify/_redirects', to: '.' }],
          }),
        ]
      : []),
    // ...(isProduction ? [] : [new ESLintPlugin({ extensions: ['ts', 'tsx'] })]),
    ...(isProduction ? [new CompressionWebpackPlugin()] : []),
  ],
  // split bundle into two chunks, node modules(vendor code) in one bundle and app source code in the other
  // when source code changes, only the source code bundle will need to be updated, not the vendor code
  optimization: {
    minimize: isProduction, // Only minimize in production
    minimizer: [
      new TerserPlugin({
        // Include your own code to apply the plugin.
        include: /\/src/,

        // Disable source maps for vendor code by excluding them
        exclude: /\/node_modules/,

        terserOptions: {
          // your custom options for terser
          compress: {
            drop_console: true,
          },
          sourceMap: true, // Enable source map
        },
        extractComments: false, // remove comments from output
      }),
      new CssMinimizerPlugin(),
    ],
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
