import { describe, expect, it } from 'vitest';

import { reservedWords } from '../../../common/parser/reservedWords';
import { getType } from '../../../common/parser/type';
import { getModel } from '../getModel';

const openApi = {
  components: {
    schemas: {
      CompositionWithAny: {
        description:
          "This is a model with one property with a 'any of' relationship where the options are not $ref",
        properties: {
          propA: {
            anyOf: [
              {
                $ref: '#/components/schemas/Enum1',
              },
              {
                $ref: '#/components/schemas/ConstValue',
              },
              {
                type: 'null',
              },
            ],
          },
        },
        type: 'object',
      },
      CompositionWithAnyOfAndNull: {
        description:
          "This is a model with one property with a 'any of' relationship where the options are not $ref",
        properties: {
          propA: {
            anyOf: [
              {
                items: {
                  anyOf: [
                    {
                      $ref: '#/components/schemas/Enum1',
                    },
                    {
                      $ref: '#/components/schemas/ConstValue',
                    },
                  ],
                },
                type: 'array',
              },
              {
                type: 'null',
              },
            ],
          },
        },
        type: 'object',
      },
      ConstValue: {
        const: 'ConstValue',
        type: 'string',
      },
      Enum1: {
        enum: ['Bird', 'Dog'],
        type: 'string',
      },
    },
  },
  info: {
    title: 'dummy',
    version: '1.0',
  },
  openapi: '3.0',
  paths: {},
  servers: [
    {
      url: 'https://localhost:8080/api',
    },
  ],
};

describe('getModel', () => {
  it('Parses any of', () => {
    const definition = openApi.components.schemas.CompositionWithAnyOfAndNull;
    const definitionType = getType('CompositionWithAnyOfAndNull');
    const model = getModel(
      openApi,
      definition,
      true,
      definitionType.base.replace(reservedWords, '_$1'),
    );
    expect(model.properties[0].properties.length).toBe(2);
  });

  it('Parses any of 2', () => {
    const definition = openApi.components.schemas.CompositionWithAny;
    const definitionType = getType('CompositionWithAny');
    const model = getModel(
      openApi,
      definition,
      true,
      definitionType.base.replace(reservedWords, '_$1'),
    );
    expect(model.properties[0].properties.length).toBe(3);
  });
});
