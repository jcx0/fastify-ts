import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { Controllers } from "@/gen/types.gen";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import glue from "fastify-openapi-glue";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ApiOptions {
  controllers: Controllers;
}

const api: FastifyPluginAsync<ApiOptions> = async (server, options) => {
  server.register(glue, {
    specification: join(__dirname, "api.yaml"),
    serviceHandlers: options.controllers,
    prefix: "v1",
  });
};

export default fp(api, "4.x");
