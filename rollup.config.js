import path from "path";
import alias from "@rollup/plugin-alias";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const config = [
  {
    input: "build/components/SvgViewport.js",
    output: {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
    },
    external: ["react"],
    plugins: [
      typescript(),
      alias({
        entries: [
          { find: /^~/, replacement: path.resolve(process.cwd() + "/src") },
        ],
      }),
      terser(),
    ],
  }, {
    input: "build/components/SvgViewport.d.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [
      dts(),
      alias({
        entries: [
          { find: /^~/, replacement: path.resolve(process.cwd() + "/src") },
        ],
      }),
    ],
  },
];
export default config;
