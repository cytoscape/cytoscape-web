import path from 'path'
import url from 'url'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  mode: 'development',
  devtool: false,
  target: 'web',
  optimization: {
    minimize: false,
  },
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'hello-cy-world.js',
    publicPath: '/',
    library: {
      type: 'module',
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    zustand: 'zustand',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  experiments: {
    outputModule: true,
  },
}
