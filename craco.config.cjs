/* eslint-disable @typescript-eslint/no-var-requires */
const { VanillaExtractPlugin } = require('@vanilla-extract/webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { DefinePlugin } = require('webpack')

const commitHash = require('child_process').execSync('git rev-parse HEAD')

module.exports = {
  babel: {
    plugins: ['@vanilla-extract/babel-plugin'],
  },
  jest: {
    configure(jestConfig) {
      return Object.assign({}, jestConfig, {
        transformIgnorePatterns: ['@uniswap/conedison/format', '@uniswap/conedison/provider'],
        moduleNameMapper: {
          '@uniswap/conedison/format': '@uniswap/conedison/dist/format',
          '@uniswap/conedison/provider': '@uniswap/conedison/dist/provider',
        },
      })
    },
  },
  webpack: {
    plugins: [
      new VanillaExtractPlugin(),
      new DefinePlugin({
        'process.env.REACT_APP_GIT_COMMIT_HASH': JSON.stringify(commitHash.toString()),
      }),
    ],
    configure: (webpackConfig) => {
      const instanceOfMiniCssExtractPlugin = webpackConfig.plugins.find(
        (plugin) => plugin instanceof MiniCssExtractPlugin
      )
      if (instanceOfMiniCssExtractPlugin !== undefined) instanceOfMiniCssExtractPlugin.options.ignoreOrder = true

      // We're currently on Webpack 4.x that doesn't support the `exports` field in package.json.
      // See https://github.com/webpack/webpack/issues/9509.
      //
      // In case you need to add more modules, make sure to remap them to the correct path.
      //
      // Map @uniswap/conedison to its dist folder.
      // This is required because conedison uses exports field (*.→dist/*) which webpack 4 doesn't support.
      const path = require('path')
      const conedisonPkg = path.join(__dirname, 'node_modules', '@uniswap', 'conedison')
      webpackConfig.resolve.alias['@uniswap/conedison'] = path.join(conedisonPkg, 'dist')

      // Remove ModuleScopePlugin which blocks imports from node_modules/dist dirs
      const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        (plugin) => !(plugin instanceof ModuleScopePlugin)
      )

      // Node.js polyfills for webpack 5 (CRA 5 removed automatic polyfills)
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify'),
        os: require.resolve('os-browserify/browser'),
        crypto: require.resolve('crypto-browserify'),
        buffer: require.resolve('buffer/'),
        assert: require.resolve('assert/'),
        https: require.resolve('https-browserify'),
        http: require.resolve('stream-http'),
        url: require.resolve('url/'),
        zlib: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      }
      // Alias process/browser for ESM modules that need .js extension
      webpackConfig.resolve.alias['process/browser'] = require.resolve('process/browser.js')

      webpackConfig.plugins.push(
        new (require('webpack').ProvidePlugin)({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer'],
        })
      )

      // Disable TS type checking during build (React 19 + styled-components v5 type incompatibilities)
      // Types are checked separately via tsc --noEmit
      const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin')
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => !(plugin.constructor && plugin.constructor.name === 'ForkTsCheckerWebpackPlugin')
      )

      return webpackConfig
    },
  },
}
