import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ resolveDirs: [__dirname] });

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", ".content-collections/**"],
  },
  {
    files: ["components/sections/**/*.tsx", "components/blog/**/*.tsx"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["*.config.mjs", "*.config.js"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default config;