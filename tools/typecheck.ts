import type { ActivityV2API, ActivityV2Metadata, ActivityReport } from '@chudpresence/activity-sdk-v2/types';

export const metadata: ActivityV2Metadata = {
  id: 'sdk-sample', name: 'SDK sample', description: 'Checks V2 declarations.',
  version: '1.0.0', apiVersion: 2, entry: 'activity.js', matches: ['https://example.com/*'],
  pageAccess: { media: true, selectors: { title: { selector: 'h1', read: 'text' } } }
};
export function register(api: ActivityV2API) {
  return api.onUpdate(async () => {
    const title = api.page.read('title');
    if (typeof title !== 'string') { await api.clear(); return; }
    const report: ActivityReport = { kind: 'video', media: { title } };
    await api.report(report);
  });
}
