import camelCase from 'camelcase';

import { getConfig } from '../../../utils/config';
import type { OperationResponse } from '../interfaces/client';
import { reservedWords } from './reservedWords';
import {
  sanitizeNamespaceIdentifier,
  sanitizeOperationParameterName,
} from './sanitize';

/**
 * Convert the input value to a correct operation (method) class name.
 * This will use the operation ID - if available - and otherwise fallback
 * on a generated name from the URL
 */
export const getOperationName = (
  url: string,
  method: string,
  operationId?: string,
): string => {
  const config = getConfig();

  if (config.services.operationId && operationId) {
    return camelCase(sanitizeNamespaceIdentifier(operationId).trim());
  }

  const urlWithoutPlaceholders = url
    .replace(/[^/]*?{api-version}.*?\//g, '')
    .replace(/{(.*?)}/g, 'by-$1')
    .replace(/\//g, '-');

  return camelCase(`${method}-${urlWithoutPlaceholders}`);
};

/**
 * Replaces any invalid characters from a parameter name.
 * For example: 'filter.someProperty' becomes 'filterSomeProperty'.
 */
export const getOperationParameterName = (value: string): string => {
  const clean = sanitizeOperationParameterName(value).trim();
  return camelCase(clean).replace(reservedWords, '_$1');
};

export const getOperationResponseHeader = (
  operationResponses: OperationResponse[],
): string | null => {
  const header = operationResponses.find(
    (operationResponses) => operationResponses.in === 'header',
  );
  if (header) {
    return header.name;
  }
  return null;
};

export const getOperationResponseCode = (
  value: string | 'default',
): number | 'default' | null => {
  if (value === 'default') {
    return 'default';
  }

  // Check if we can parse the code and return of successful.
  if (/[0-9]+/g.test(value)) {
    const code = Number.parseInt(value);
    if (Number.isInteger(code)) {
      return Math.abs(code);
    }
  }

  return null;
};

export const getOperationErrors = (
  operationResponses: OperationResponse[],
): OperationResponse[] =>
  operationResponses.filter(
    ({ code, description }) =>
      typeof code === 'number' && code >= 300 && description,
  );
