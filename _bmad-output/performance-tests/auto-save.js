import http from 'k6/http';
import { check, sleep } from 'k6';

// Auto-save endpoint testing
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '2m', target: 30 },    // Sustained concurrent edits
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Auto-save can be slower
    http_req_failed: ['rate<0.02'],    // Auto-save should be very reliable
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const autoSavePayload = JSON.stringify({
    proposalId: __ENV.PROPOSAL_ID || 'test-proposal-1',
    sectionId: 'section-1',
    data: {
      title: `Auto-save test ${__VU}-${__ITER__}`,
      content: 'Performance baseline test data',
    },
    version: 1,
    idempotencyKey: `k6-autosave-${__VU}-${__ITER__}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
    },
    tags: { name: 'AutoSave' },
  };

  const res = http.post(
    `${BASE_URL}/proposals/auto-save`,
    autoSavePayload,
    params
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has data field': (r) => JSON.parse(r.body).success === true,
  });

  // Auto-save happens every 2 seconds with debounce
  sleep(2);
}
