module.exports = function (api) {
  api.cache(true);

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.EXPO_PUBLIC_ENV === "production";

  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      /**
       * React Compiler — must come first so it runs before other transforms.
       */
      ["babel-plugin-react-compiler", {}],

      /**
       * Strip all console.* calls in production builds.
       * Keeps console.error so crash reports still surface in tools like Sentry.
       */
      ...(isProd
        ? [["transform-remove-console", { exclude: ["error"] }]]
        : []),
    ],
  };
};
