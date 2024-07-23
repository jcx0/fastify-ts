// This file is auto-generated by @hey-api/openapi-ts
import type { RouteHandler } from "fastify";
export type Error = {
  code: string;
  message?: string;
};
export type User = {
  id: string;
  birthday: string;
  email: string;
};
export type ParameterUserId = string;
export type OperationsT = {
  createUser: {
    Body: {
      requestBody: {
        birthday: string;
        email: string;
      };
    };
    Reply: {
      /**
       * User data
       */
      201: {
        user: User;
      };
      /**
       * Client error
       */
      400: Error;
      /**
       * Access token is missing or invalid
       */
      401: unknown;
      /**
       * Not authorized to access resource
       */
      403: unknown;
      /**
       * Resource already exists
       */
      409: Error;
      /**
       * Internal service error
       */
      500: Error;
    };
  };
  getUser: {
    Params: {
      userId: string;
    };
    Reply: {
      /**
       * User data
       */
      200: {
        user: User;
      };
      /**
       * Client error
       */
      400: Error;
      /**
       * Access token is missing or invalid
       */
      401: unknown;
      /**
       * Not authorized to access resource
       */
      403: unknown;
      /**
       * Resource not found
       */
      404: unknown;
      /**
       * Internal service error
       */
      500: Error;
    };
  };
};
export type Controllers = {
  [OperationId in keyof OperationsT]: RouteHandler<{
    [Param in keyof OperationsT[OperationId]]: OperationsT[OperationId][Param] extends {
      requestBody: infer Body;
    }
      ? Body
      : OperationsT[OperationId][Param];
  }>;
};
