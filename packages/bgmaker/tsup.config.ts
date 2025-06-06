import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    actions: "src/components/actions.ts",
    ContactForm: "src/components/ContactForm.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false, // Keep actions and form as separate files
  sourcemap: true,
  clean: true,
  shims: true, // for cjs/esm interop
  external: ["react", "react-dom", "next"], // these are peer dependencies for a library
  esbuildOptions(options) {
    options.jsx = 'automatic'; // Use automatic JSX runtime
  },
  // 'use client'; directive in ContactForm.tsx source should be preserved by tsup
}); 