import path from 'path';

export default {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'app1.js',
    // eslint-disable-next-line no-undef
    path: path.resolve(process.cwd(), 'dist'),

    library: 'app1',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
       {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx']
  }
};
