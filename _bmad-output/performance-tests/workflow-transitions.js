import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration - will be adjusted based on actual API
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Warm up
    { duration: '1m', target: 20 },    // Ramp up
    { duration: '2m', target: 50 },    // Sustained load
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Initial thresholds
    http_req_failed: ['rate<0.05'],   // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Scenario 1: Workflow transition (approve-faculty)
  const transitionPayload = JSON.stringify({
    proposalId: __ENV.PROPOSAL_ID || 'test-proposal-1',
    idempotencyKey: `k6-baseline-${__VU}-${__ITER__}`,
  });

  const transitionParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
    },
    tags: { name: 'ApproveFaculty' },
  };

  const transitionRes = http.post(
    `${BASE_URL}/workflow/approve-faculty`,
    transitionPayload,
    transitionParams
  );

  check(transitionRes, {
    'transition status is 200': (r) => r.status === 200,
    'transition response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Scenario 2: Get proposal details
  const queryRes = http.get(
    `${BASE_URL}/proposals/${__ENV.PROPOSAL_ID || 'test-proposal-1'}`,
    {
      headers: {
        'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'test-token'}`,
      },
      tags: { name: 'GetProposal' },
    }
  );

  check(queryRes, {
    'query status is 200': (r) => r.status === 200,
    'query response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
