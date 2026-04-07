import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  external: [
    "@lombard.finance/sdk",
    "@lombard.finance/sdk-common",
    "@lombard.finance/sdk-agent",
  ],
});
