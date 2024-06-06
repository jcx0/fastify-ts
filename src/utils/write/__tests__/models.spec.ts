import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { TypeScriptFile } from '../../../compiler';
import { setConfig } from '../../config';
import { processTypes } from '../types';

vi.mock('node:fs');

describe('processTypes', () => {
  it('writes to filesystem', async () => {
    setConfig({
      client: 'fetch',
      debug: false,
      dryRun: false,
      exportCore: true,
      format: false,
      input: '',
      lint: false,
      name: 'AppClient',
      output: '',
      schemas: {},
      services: {},
      types: {
        enums: 'javascript',
      },
      useOptions: true,
    });

    const client: Parameters<typeof processTypes>[0]['client'] = {
      enumNames: [],
      models: [
        {
          $refs: [],
          base: 'User',
          description: null,
          enum: [],
          enums: [],
          export: 'interface',
          imports: [],
          isDefinition: true,
          isNullable: false,
          isReadOnly: false,
          isRequired: false,
          link: null,
          name: 'User',
          properties: [],
          template: null,
          type: 'User',
        },
      ],
      server: 'http://localhost:8080',
      services: [],
      version: 'v1',
    };

    const files = {
      types: new TypeScriptFile({
        dir: '/',
        name: 'models.ts',
      }),
    };

    await processTypes({
      client,
      files,
    });

    files.types.write();

    expect(writeFileSync).toHaveBeenCalledWith(
      path.resolve('/models.gen.ts'),
      expect.anything(),
    );
  });
});
