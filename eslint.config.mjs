import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Vendored registry components (shadcn, aceternity and friends). They are
    // pulled in as-is and re-pulled on update, so linting them to this project's
    // standard only creates diffs that get overwritten. Our own code — app/,
    // lib/, scripts/ and the components beside this directory — stays strict.
    files: ["components/ui/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
      "prefer-const": "off",
    },
  },
]);

export default eslintConfig;
