import camelcase from 'camelcase';

import {
  ClassElement,
  compiler,
  FunctionParameter,
  TypeScriptFile,
} from '../../compiler';
import type { Operation, OperationParameter, Service } from '../../openApi';
import type { Client } from '../../types/client';
import { getConfig } from '../config';
import { escapeComment, escapeDescription, escapeName } from '../escape';
import { modelIsRequired } from '../required';
import { transformServiceName } from '../transform';
import { unique } from '../unique';

type OnImport = (importedType: string) => void;

export const operationDataTypeName = (operation: Operation) =>
  `${camelcase(operation.service, {
    pascalCase: true,
  })}${camelcase(operation.name, {
    pascalCase: true,
  })}Data`;

export const operationResponseTypeName = (operation: Operation) =>
  `${camelcase(operation.service, {
    pascalCase: true,
  })}${camelcase(operation.name, {
    pascalCase: true,
  })}Response`;

const toOperationParamType = (
  operation: Operation,
  onImport: OnImport,
): FunctionParameter[] => {
  const config = getConfig();

  const importedType = operationDataTypeName(operation);

  if (!operation.parameters.length) {
    return [];
  }

  onImport(importedType);

  if (config.useOptions) {
    const isOptional = operation.parameters.every((p) => !p.isRequired);
    return [
      {
        default: isOptional ? {} : undefined,
        name: 'data',
        type: importedType,
      },
    ];
  }

  return operation.parameters.map((p) => {
    const typePath = `${importedType}['${p.name}']`;
    return {
      default: p?.default,
      isRequired: modelIsRequired(p) === '',
      name: p.name,
      type: typePath,
    };
  });
};

const toOperationReturnType = (operation: Operation, onImport: OnImport) => {
  const config = getConfig();
  const results = operation.results;
  // TODO: we should return nothing when results don't exist
  // can't remove this logic without removing request/name config
  // as it complicates things
  let returnType = compiler.typedef.basic('void');
  if (results.length) {
    const importedType = operationResponseTypeName(operation);
    onImport(importedType);
    returnType = compiler.typedef.union([importedType]);
  }
  if (config.useOptions && config.services.response === 'response') {
    returnType = compiler.typedef.basic('ApiResult', [returnType]);
  }
  if (config.client === 'angular') {
    returnType = compiler.typedef.basic('Observable', [returnType]);
  } else {
    returnType = compiler.typedef.basic('CancelablePromise', [returnType]);
  }
  return returnType;
};

const toOperationComment = (operation: Operation) => {
  const config = getConfig();
  let params: string[] = [];
  if (operation.parameters.length) {
    if (config.useOptions) {
      params = [
        '@param data The data for the request.',
        ...operation.parameters.map(
          (p) =>
            `@param data.${p.name} ${p.description ? escapeComment(p.description) : ''}`,
        ),
      ];
    } else {
      params = operation.parameters.map(
        (p) =>
          `@param ${p.name} ${p.description ? escapeComment(p.description) : ''}`,
      );
    }
  }
  const comment = [
    operation.deprecated && '@deprecated',
    operation.summary && escapeComment(operation.summary),
    operation.description && escapeComment(operation.description),
    ...params,
    ...operation.results.map(
      (r) =>
        `@returns ${r.type} ${r.description ? escapeComment(r.description) : ''}`,
    ),
    '@throws ApiError',
  ];
  return comment;
};

const toRequestOptions = (operation: Operation) => {
  const config = getConfig();
  const toObj = (parameters: OperationParameter[]) =>
    parameters.reduce(
      (prev, curr) => {
        const key = curr.prop;
        const value = config.useOptions ? `data.${curr.name}` : curr.name;
        if (key === value) {
          prev[key] = key;
        } else if (escapeName(key) === key) {
          prev[key] = value;
        } else {
          prev[`'${key}'`] = value;
        }
        return prev;
      },
      {} as Record<string, unknown>,
    );

  const obj: Record<string, any> = {
    method: operation.method,
    url: operation.path,
  };
  if (operation.parametersPath.length) {
    obj.path = toObj(operation.parametersPath);
  }
  if (operation.parametersCookie.length) {
    obj.cookies = toObj(operation.parametersCookie);
  }
  if (operation.parametersHeader.length) {
    obj.headers = toObj(operation.parametersHeader);
  }
  if (operation.parametersQuery.length) {
    obj.query = toObj(operation.parametersQuery);
  }
  if (operation.parametersForm.length) {
    obj.formData = toObj(operation.parametersForm);
  }
  if (operation.parametersBody) {
    if (operation.parametersBody.in === 'formData') {
      if (config.useOptions) {
        obj.formData = `data.${operation.parametersBody.name}`;
      } else {
        obj.formData = operation.parametersBody.name;
      }
    }
    if (operation.parametersBody.in === 'body') {
      if (config.useOptions) {
        obj.body = `data.${operation.parametersBody.name}`;
      } else {
        obj.body = operation.parametersBody.name;
      }
    }
  }
  if (operation.parametersBody?.mediaType) {
    obj.mediaType = operation.parametersBody?.mediaType;
  }
  if (operation.responseHeader) {
    obj.responseHeader = operation.responseHeader;
  }
  if (operation.errors.length) {
    const errors: Record<number | string, string> = {};
    operation.errors.forEach((err) => {
      errors[err.code] = escapeDescription(err.description ?? '');
    });
    obj.errors = errors;
  }
  return compiler.types.object({
    identifiers: ['body', 'headers', 'formData', 'cookies', 'path', 'query'],
    obj,
    shorthand: true,
  });
};

const toOperationStatements = (operation: Operation) => {
  const config = getConfig();
  const statements: any[] = [];
  const requestOptions = toRequestOptions(operation);
  if (config.name) {
    statements.push(
      compiler.class.return({
        args: [requestOptions],
        name: 'this.httpRequest.request',
      }),
    );
  } else {
    if (config.client === 'angular') {
      statements.push(
        compiler.class.return({
          args: ['OpenAPI', 'this.http', requestOptions],
          name: '__request',
        }),
      );
    } else {
      statements.push(
        compiler.class.return({
          args: ['OpenAPI', requestOptions],
          name: '__request',
        }),
      );
    }
  }
  return statements;
};

export const processService = (service: Service, onImport: OnImport) => {
  const config = getConfig();
  const members: ClassElement[] = service.operations.map((operation) => {
    const node = compiler.class.method({
      accessLevel: 'public',
      comment: toOperationComment(operation),
      isStatic: config.name === undefined && config.client !== 'angular',
      name: operation.name,
      parameters: toOperationParamType(operation, onImport),
      returnType: toOperationReturnType(operation, onImport),
      statements: toOperationStatements(operation),
    });
    return node;
  });

  // Push to front constructor if needed
  if (config.name) {
    members.unshift(
      compiler.class.constructor({
        multiLine: false,
        parameters: [
          {
            accessLevel: 'public',
            isReadOnly: true,
            name: 'httpRequest',
            type: 'BaseHttpRequest',
          },
        ],
      }),
    );
  } else if (config.client === 'angular') {
    members.unshift(
      compiler.class.constructor({
        multiLine: false,
        parameters: [
          {
            accessLevel: 'public',
            isReadOnly: true,
            name: 'http',
            type: 'HttpClient',
          },
        ],
      }),
    );
  }

  return compiler.class.create({
    decorator:
      config.client === 'angular'
        ? { args: [{ providedIn: 'root' }], name: 'Injectable' }
        : undefined,
    members,
    name: transformServiceName(service.name),
  });
};

export const processServices = async ({
  client,
  files,
}: {
  client: Client;
  files: Record<string, TypeScriptFile>;
}): Promise<void> => {
  const file = files.services;

  if (!file) {
    return;
  }

  const config = getConfig();

  let imports: string[] = [];

  for (const service of client.services) {
    const serviceClass = processService(service, (importedType) => {
      imports = [...imports, importedType];
    });
    file.add(serviceClass);
  }

  // Import required packages and core files.
  if (config.client === 'angular') {
    file.addNamedImport('Injectable', '@angular/core');

    if (!config.name) {
      file.addNamedImport('HttpClient', '@angular/common/http');
    }

    file.addNamedImport({ isTypeOnly: true, name: 'Observable' }, 'rxjs');
  } else {
    if (config.client.startsWith('@hey-api')) {
      file.addNamedImport(
        { isTypeOnly: true, name: 'CancelablePromise' },
        config.client,
      );
    } else {
      file.addNamedImport(
        { isTypeOnly: true, name: 'CancelablePromise' },
        './core/CancelablePromise',
      );
    }
  }

  if (config.services.response === 'response') {
    file.addNamedImport(
      { isTypeOnly: true, name: 'ApiResult' },
      './core/ApiResult',
    );
  }

  if (config.name) {
    file.addNamedImport(
      { isTypeOnly: config.client !== 'angular', name: 'BaseHttpRequest' },
      './core/BaseHttpRequest',
    );
  } else {
    if (config.client.startsWith('@hey-api')) {
      file.addNamedImport('OpenAPI', config.client);
      file.addNamedImport(
        { alias: '__request', name: 'request' },
        config.client,
      );
    } else {
      file.addNamedImport('OpenAPI', './core/OpenAPI');
      file.addNamedImport(
        { alias: '__request', name: 'request' },
        './core/request',
      );
    }
  }

  // Import all models required by the services.
  if (files.types && !files.types.isEmpty()) {
    const models = imports
      .filter(unique)
      .map((name) => ({ isTypeOnly: true, name }));
    file.addNamedImport(models, `./${files.types.getName(false)}`);
  }
};
