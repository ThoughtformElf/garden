import { nodeResolve } from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

const isProduction = !process.env.ROLLUP_WATCH;

export default {
  input: "editor.js",
  output: {
    file: "editor.bundle.js",
    format: "iife",
    sourcemap: true, // Good for debugging
  },
  plugins: [
    nodeResolve(),
    !isProduction && serve({
      contentBase: '', // Serve files from the project root
      port: 8080,
    }),
    !isProduction && livereload({
      watch: '', // Watch the project root for changes
    }),
  ],
};
