import type {
  Model,
  OperationResponse,
} from '../openApi/common/interfaces/client';

const areEqual = (a: Model, b: Model): boolean => {
  const equal =
    a.type === b.type && a.base === b.base && a.template === b.template;
  if (equal && a.link && b.link) {
    return areEqual(a.link, b.link);
  }
  return equal;
};

export const getOperationResults = (
  operationResponses: OperationResponse[],
): OperationResponse[] => {
  const operationResults: OperationResponse[] = [];

  // Filter out success response codes
  operationResponses.forEach((operationResponse) => {
    const { code } = operationResponse;
    if (code && (code === 'default' || (code >= 200 && code < 300))) {
      operationResults.push(operationResponse);
    }
  });

  return operationResults.filter(
    (operationResult, index, arr) =>
      arr.findIndex((item) => areEqual(item, operationResult)) === index,
  );
};
