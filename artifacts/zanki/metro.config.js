const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const isProd =
  process.env.NODE_ENV === "production" ||
  process.env.EXPO_PUBLIC_ENV === "production";

if (isProd) {
  /**
   * Terser minifier — runs before Hermes bytecode compilation.
   * Together they produce output that is extremely difficult to reverse.
   */
  config.transformer = {
    ...config.transformer,
    minifierPath: require.resolve("metro-minify-terser"),
    minifierConfig: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        passes: 2,
        inline: 2,
        sequences: true,
        booleans: true,
        conditionals: true,
        evaluate: true,
        if_return: true,
        join_vars: true,
        loops: true,
        unused: true,
      },
      mangle: {
        toplevel: false,
        properties: { regex: /^__/ },
      },
      format: {
        comments: false,
        beautify: false,
      },
    },
  };
}

module.exports = config;
