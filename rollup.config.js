import path from "path";
import alias from "@rollup/plugin-alias";
import typescript from "@rollup/plugin-typescript";
import banner2 from "rollup-plugin-banner2";
import dts from "rollup-plugin-dts";

const config = [
  {
    input: "build/index.js",
    output: {
      file: "dist/index.js",
      format: "esm",
    },
    external: ["react"],
    plugins: [
      typescript(),
      alias({
        entries: [
          { find: /^~/, replacement: path.resolve(process.cwd() + "/src") },
        ],
      }),
      banner2(() => '"use client";\n'),
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
