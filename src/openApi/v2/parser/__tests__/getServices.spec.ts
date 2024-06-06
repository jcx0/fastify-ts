import { describe, expect, it } from 'vitest';

import { setConfig } from '../../../../utils/config';
import { getServices } from '../getServices';

describe('getServices', () => {
  it('should create a unnamed service if tags are empty', () => {
    setConfig({
      client: 'fetch',
      debug: false,
      dryRun: true,
      exportCore: true,
      format: false,
      input: '',
      lint: false,
      output: '',
      schemas: {},
      services: {
        operationId: false,
      },
      types: {},
      useOptions: true,
    });

    const services = getServices({
      info: {
        title: 'x',
        version: '1',
      },
      paths: {
        '/api/trips': {
          get: {
            responses: {
              200: {
                description: 'x',
              },
              default: {
                description: 'default',
              },
            },
            tags: [],
          },
        },
      },
      swagger: '2.0',
    });

    expect(services).toHaveLength(1);
    expect(services[0].name).toEqual('Default');
  });
});
