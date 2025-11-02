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
const webpack = require('webpack')
const { execSync } = require('child_process')

const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin

// Bundle dependencies as a separate ES moudule

const isProduction = process.env.NODE_ENV === 'production'

// Extract the common dependencies from the package.json file
const packageJson = require('./package.json')
const deps = packageJson.dependencies

// External Apps

// List of external app properties.
// This is used in both build and runtime to manage the external apps
const appConfig = require('./src/assets/apps.json')
const externalAppsConfig = {}
appConfig.forEach((app) => {
  externalAppsConfig[app.name] = `${app.name}@${app.url}`
})

console.log('App config found:', appConfig)
console.log('These apps can be used in this build:', externalAppsConfig)

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
      // load all other assets using webpacks default loader with size optimization
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB - inline smaller assets as base64
          },
        },
      },
      // Font optimization
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
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
    publicPath: config.urlBaseName !== '' ? config.urlBaseName : '/',
    // publicPath: 'auto', // Required to use module federation (? Need to double check)
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
        // Core data models exposed to other Apps
        './CredentialStore': './src/store/CredentialStore.ts',
        './LayoutStore': './src/store/LayoutStore.ts',
        './MessageStore': './src/store/MessageStore.ts',
        './NetworkStore': './src/store/NetworkStore.ts',
        './NetworkSummaryStore': './src/store/NetworkSummaryStore.ts',
        './OpaqueAspectStore': './src/store/OpaqueAspectStore.ts',
        './RendererStore': './src/store/RendererStore.ts',
        './TableStore': './src/store/TableStore.ts',
        './UiStateStore': './src/store/UiStateStore.ts',
        './ViewModelStore': './src/store/ViewModelStore.ts',
        './VisualStyleStore': './src/store/VisualStyleStore.ts',
        './WorkspaceStore': './src/store/WorkspaceStore.ts',

        // External Apps
        './CreateNetwork': './src/externalapps/useCreateNetwork.tsx',
        './CreateNetworkFromCx2': './src/externalapps/useCreateNetworkFromCx2.tsx',
      },

      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
        '@mui/material': {
          singleton: true,
          requiredVersion: deps['@mui/material'],
        },
      },
    }),
    // Only run bundle analyzer when explicitly requested or in production
    ...(process.env.ANALYZE || isProduction
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: './ba/bundle-report.html',
            generateStatsFile: true,
            statsFilename: './ba/bundle-stats.json',
            statsOptions: {
              source: false,
              modules: false,
              chunks: true,
              chunkModules: true,
              chunkOrigins: true,
              reasons: false,
              usedExports: true, // Enable for better tree shaking insights
              providedExports: true, // Enable for better tree shaking insights
              optimizationBailout: false,
              errorDetails: false,
              publicPath: false,
              timings: true,
              builtAt: true,
              assets: true,
              entrypoints: true,
              performance: true,
              hash: true,
              version: true,
            },
          }),
        ]
      : []),
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
      templateParameters: {
        VERSION: packageJson.version,
      },
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
    ...(isProduction
      ? [
          new CompressionWebpackPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // Only compress files bigger than 10KB
            minRatio: 0.8, // Only compress if compression ratio is better than 80%
            deleteOriginalAssets: false, // Keep original files
          }),
        ]
      : []),

    new webpack.DefinePlugin({
      // Inject Git commit and build date into process.env variables
      'process.env.REACT_APP_GIT_COMMIT': JSON.stringify(
        execSync('git rev-parse --short HEAD').toString().trim(),
      ),
      'process.env.REACT_APP_LAST_COMMIT_TIME': JSON.stringify(
        execSync('git show -s --format=%cI HEAD').toString().trim(),
      ), // Use commit date instead of current date
      'process.env.REACT_APP_BUILD_TIME': JSON.stringify(
        new Date().toISOString(), // JavaScript-based timestamp
      ),
      REACT_APP_BUILD_TIME: JSON.stringify(new Date().toISOString()),
      REACT_APP_VERSION: JSON.stringify(packageJson.version),
    }),
  ],
  // Advanced code splitting for optimal bundle size
  optimization: {
    minimize: isProduction, // Only minimize in production
    usedExports: true, // Enable tree shaking
    sideEffects: true, // Respect package.json sideEffects field
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction, // Only drop console logs in production
            drop_debugger: isProduction, // Remove debugger statements in production
            pure_funcs: isProduction
              ? ['console.log', 'console.info', 'console.debug']
              : [], // Remove specific console methods
          },
          mangle: {
            safari10: true, // Fix Safari 10 issues
          },
          sourceMap: !isProduction, // Enable source maps only in development
        },
        extractComments: false, // remove comments from output
        parallel: true, // Use multi-process parallel running for faster builds
      }),
      new CssMinimizerPlugin(),
    ],
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000, // 244KB limit
      cacheGroups: {
        // Core app bundle - essential functionality only
        core: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|@mui\/material|@mui\/icons-material|zustand|immer)/,
          name: 'core',
          chunks: 'all',
          priority: 30,
          enforce: true,
        },
        // Export features bundle - PDF, PNG, SVG export
        exportFeatures: {
          test: /[\\/]node_modules[\\/](cytoscape-pdf-export|file-saver|html2canvas)/,
          name: 'export-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // Layout features bundle - G6, Cosmos, layout algorithms
        layoutFeatures: {
          test: /[\\/]node_modules[\\/](@antv\/g6|@cosmograph\/cosmos)/,
          name: 'layout-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // Data visualization features - D3, VisX, charts
        dataVizFeatures: {
          test: /[\\/]node_modules[\\/](@visx|d3-|chroma-js)/,
          name: 'data-viz-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // Table features bundle - Data grid, CSV parsing
        tableFeatures: {
          test: /[\\/]node_modules[\\/](@glideapps\/glide-data-grid|papaparse|@mantine\/core|@mantine\/hooks|@mantine\/modals|@mantine\/notifications|@mantine\/dropzone|primereact)/,
          name: 'table-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // Editor features bundle - Rich text editor
        editorFeatures: {
          test: /[\\/]node_modules[\\/](@tiptap)/,
          name: 'editor-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // AI features bundle - OpenAI, LLM query
        aiFeatures: {
          test: /[\\/]node_modules[\\/](openai|zod)/,
          name: 'ai-features',
          chunks: 'async', // Only load when needed
          priority: 25,
          enforce: true,
        },
        // Core Cytoscape engine - always needed
        cytoscape: {
          test: /[\\/]node_modules[\\/](cytoscape|cytoscape-canvas|cytoscape-svg)/,
          name: 'cytoscape-core',
          chunks: 'all',
          priority: 20,
          enforce: true,
        },
        // Utility libraries
        utils: {
          test: /[\\/]node_modules[\\/](lodash|uuid|js-cookie|keycloak-js|debug)/,
          name: 'utils',
          chunks: 'all',
          priority: 15,
          enforce: true,
        },
        // Default vendor chunk for remaining libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 5,
        },
      },
    },
  },
  // Performance hints for bundle size monitoring
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
  },
}
