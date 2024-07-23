import { defineConfig } from "@jcx0/fastify-ts";

export default defineConfig({
  input: "./api.yaml",
  output: "./src/gen",
  format: "prettier",
});
