import {
  type Comments,
  compiler,
  type Node,
  TypeScriptFile,
} from "../../compiler";
import type { Model, OperationParameter, Service } from "../../openApi";
import { ensureValidTypeScriptJavaScriptIdentifier } from "../../openApi/common/parser/sanitize";
import type { Client } from "../../types/client";
import { getConfig } from "../config";
import { enumKey, enumName, enumUnionType, enumValue } from "../enum";
import { escapeComment } from "../escape";
import { sortByName } from "../sort";
import { transformTypeName } from "../transform";
import { toType } from "./type";

const ControllersTypeName = "Controllers";
const OperationsTypeName = "OperationsT";

type OnNode = (node: Node) => void;

const emptyModel: Model = {
  $refs: [],
  base: "",
  description: null,
  enum: [],
  enums: [],
  export: "interface",
  imports: [],
  isDefinition: false,
  isNullable: false,
  isReadOnly: false,
  isRequired: false,
  link: null,
  name: "",
  properties: [],
  template: null,
  type: "",
};

const processComposition = (client: Client, model: Model, onNode: OnNode) => {
  processType(client, model, onNode);
  model.enums.forEach((enumerator) => processEnum(client, enumerator, onNode));
};

const processEnum = (
  client: Client,
  model: Model,
  onNode: OnNode,
  isExported: boolean = false
) => {
  if (!isExported) {
    return;
  }

  const config = getConfig();

  const properties: Record<string | number, unknown> = {};
  const comments: Record<string | number, Comments> = {};
  model.enum.forEach((enumerator) => {
    const key = enumKey(enumerator.value, enumerator.customName);
    const value = enumValue(enumerator.value);
    properties[key] = value;
    const comment = enumerator.customDescription || enumerator.description;
    if (comment) {
      comments[key] = [escapeComment(comment)];
    }
  });

  // ignore duplicate enum names
  const name = enumName(client, model.name)!;
  if (name === null) {
    return;
  }

  const comment = [
    model.description && escapeComment(model.description),
    model.deprecated && "@deprecated",
  ];

  if (config.types.enums !== "typescript") {
    const node = compiler.typedef.alias(
      ensureValidTypeScriptJavaScriptIdentifier(model.name),
      enumUnionType(model.enum),
      comment
    );
    onNode(node);
  }

  if (config.types.enums === "typescript") {
    const node = compiler.types.enum({
      comments,
      leadingComment: comment,
      name,
      obj: properties,
    });
    onNode(node);
  }

  if (config.types.enums === "javascript") {
    const expression = compiler.types.object({
      comments,
      leadingComment: comment,
      multiLine: true,
      obj: properties,
      unescape: true,
    });
    const node = compiler.export.asConst(name, expression);
    onNode(node);
  }
};

const processType = (client: Client, model: Model, onNode: OnNode) => {
  const comment = [
    model.description && escapeComment(model.description),
    model.deprecated && "@deprecated",
  ];
  const node = compiler.typedef.alias(
    transformTypeName(model.name),
    toType(model),
    comment
  );
  onNode(node);
};

const processModel = (client: Client, model: Model, onNode: OnNode) => {
  switch (model.export) {
    case "all-of":
    case "any-of":
    case "one-of":
    case "interface":
      return processComposition(client, model, onNode);
    case "enum":
      return processEnum(client, model, onNode, true);
    default:
      return processType(client, model, onNode);
  }
};

const processServiceTypes = (services: Service[], onNode: OnNode) => {
  type ReplyMap = Map<number | "default", Model>;
  type Params = "Params" | "Querystring" | "Header" | "Body" | "Reply";
  type Content = ReplyMap | OperationParameter[];
  type ParamsMap = Map<Params, Content>;
  type OperationId = Service["operations"][number]["name"];

  const operationsMap = new Map<OperationId, ParamsMap>();

  services.forEach((service) => {
    service.operations.forEach((operation) => {
      const hasReq = operation.parameters.length;
      const hasRes = operation.results.length;
      const hasErr = operation.errors.length;

      if (hasReq || hasRes || hasErr) {
        const paramsMap = new Map<Params, Content>();

        if (hasReq) {
          if (operation.parametersPath.length > 0) {
            paramsMap.set("Params", sortByName([...operation.parametersPath]));
          }
          if (operation.parametersQuery.length > 0) {
            paramsMap.set(
              "Querystring",
              sortByName([...operation.parametersQuery])
            );
          }
          if (operation.parametersHeader.length > 0) {
            paramsMap.set(
              "Header",
              sortByName([...operation.parametersHeader])
            );
          }
          if (operation.parametersBody) {
            paramsMap.set("Body", [operation.parametersBody]);
          }
        }

        if (hasRes) {
          let replyMap = paramsMap.get("Reply");
          if (!replyMap) {
            paramsMap.set("Reply", new Map());
            replyMap = paramsMap.get("Reply")!;
          }

          if (Array.isArray(replyMap)) {
            return;
          }

          operation.results.forEach((result) => {
            replyMap.set(result.code, result);
          });
        }

        if (hasErr) {
          let replyMap = paramsMap.get("Reply");
          if (!replyMap) {
            paramsMap.set("Reply", new Map());
            replyMap = paramsMap.get("Reply")!;
          }

          if (Array.isArray(replyMap)) {
            return;
          }

          operation.errors.forEach((error) => {
            replyMap.set(error.code, error);
          });
        }

        operationsMap.set(operation.name, paramsMap);
      }
    });
  });

  const properties = Array.from(operationsMap).map(
    ([operationId, operationMap]) => {
      const operationParams = Array.from(operationMap).map(
        ([name, paramsOrReplyMap]) => {
          const reqResParameters = Array.isArray(paramsOrReplyMap)
            ? paramsOrReplyMap
            : Array.from(paramsOrReplyMap).map(([code, base]) => {
                const value: Model = {
                  ...emptyModel,
                  ...base,
                  isRequired: true,
                  name: String(code),
                };
                return value;
              });

          const reqResKey: Model = {
            ...emptyModel,
            export: "interface",
            isRequired: true,
            name,
            properties: reqResParameters,
          };
          return reqResKey;
        }
      );
      const operationKey: Model = {
        ...emptyModel,
        export: "interface",
        isRequired: true,
        name: operationId,
        properties: operationParams,
      };
      return operationKey;
    }
  );

  const type = toType({
    ...emptyModel,
    export: "interface",
    properties,
  });
  const node = compiler.typedef.alias(OperationsTypeName, type);
  onNode(node);
};

export const processTypes = async ({
  client,
  files,
}: {
  client: Client;
  files: Record<string, TypeScriptFile>;
}): Promise<void> => {
  files.types?.add(
    compiler.import.named({ name: "RouteHandler", isTypeOnly: true }, "fastify")
  );
  for (const model of client.models) {
    processModel(client, model, (node) => {
      files.types?.add(node);
    });
  }

  if (files.services && client.services.length) {
    processServiceTypes(client.services, (node) => {
      files.types?.add(node);
    });
    files.types?.add(
      compiler.typedef.alias(
        ControllersTypeName,
        toType({
          ...emptyModel,
          export: "reference",
          base: `{ [OperationId in keyof ${OperationsTypeName}]: RouteHandler<{ [Param in keyof ${OperationsTypeName}[OperationId]]: ${OperationsTypeName}[OperationId][Param] extends { requestBody: infer Body; } ? Body : ${OperationsTypeName}[OperationId][Param]; }> }`,
        })
      )
    );
  }
};
