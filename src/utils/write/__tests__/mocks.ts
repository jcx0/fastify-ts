import { vi } from 'vitest';

import type { Templates } from '../../handlebars';

export const mockTemplates: Templates = {
  client: vi.fn().mockReturnValue('client'),
  core: {
    apiError: vi.fn().mockReturnValue('apiError'),
    apiRequestOptions: vi.fn().mockReturnValue('apiRequestOptions'),
    apiResult: vi.fn().mockReturnValue('apiResult'),
    baseHttpRequest: vi.fn().mockReturnValue('baseHttpRequest'),
    cancelablePromise: vi.fn().mockReturnValue('cancelablePromise'),
    httpRequest: vi.fn().mockReturnValue('httpRequest'),
    request: vi.fn().mockReturnValue('request'),
    settings: vi.fn().mockReturnValue('settings'),
  },
};
