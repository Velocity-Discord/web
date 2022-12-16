import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import sucrase from "@rollup/plugin-sucrase";
import { defineConfig } from "rollup";

export default defineConfig({
    input: "packages/main/index.js",
    output: {
        file: "packages/out/index.js",
        format: "iife",
        name: "injectVelocity",
    },
    plugins: [
        terser(),
        resolve(),
        sucrase({
            exclude: ["node_modules/**"],
            transforms: ["jsx"],
            jsxPragma: "window.React.createElement",
            jsxFragmentPragma: "window.React.Fragment",
            production: true,
        }),
    ],
});
