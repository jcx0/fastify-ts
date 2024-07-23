import { defineConfig } from "@stylewoven/fastify-ts";

export default defineConfig({
  input: "./api.yaml",
  output: "./src/gen",
  format: "prettier",
});
