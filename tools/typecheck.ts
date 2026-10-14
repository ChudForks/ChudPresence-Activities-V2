import type { ActivityV2Configuration, ActivityV2Metadata } from '@chudpresence/activity-sdk-v2/types';

export const metadata: ActivityV2Metadata = {
  id: 'typecheck-sample',
  name: 'Typecheck sample',
  description: 'Checks the generated V2 metadata declarations.',
  version: '1.0.0',
  apiVersion: 2,
  matches: ['https://example.com/*'],
  entry: 'activity.json',
};

export const configuration: ActivityV2Configuration = {
  schemaVersion: 1,
  kind: 'video',
  scope: '#player',
  fields: { title: { source: 'dom.text', selectors: ['.media-title'] } },
  player: { adapter: 'html-media', selectors: ['video'] },
};

// V1 packages and executable sources cannot be represented by the V2 types.
// @ts-expect-error V2 metadata requires apiVersion 2.
const executableApi: ActivityV2Metadata['apiVersion'] = 1;
// @ts-expect-error V2 has a fixed JSON entry point.
const executableEntry: ActivityV2Metadata['entry'] = 'activity.js';
// @ts-expect-error Only bundled player adapters are supported.
const customAdapter: ActivityV2Configuration['player']['adapter'] = 'custom-script';
void [executableApi, executableEntry, customAdapter];
