import http from 'k6/http';
import { check, sleep } from 'k6';

// Performance Thresholds for Local-Pilot Workload
export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '15s', target: 50 }, // Sustained load at 50 VUs (simulating busy factory morning)
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<350', 'p(99)<500'], // P95 under 350ms budget
    http_req_failed: ['rate<0.01'],                 // Error rate strictly < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // 1. Health Check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response is fast': (r) => r.timings.duration < 100,
  });

  sleep(0.5);

  // 2. Paginated Worker Search & Multi-Filter (Simulating table load)
  const searchParams = {
    page: 1,
    limit: 25,
    search: 'Operator',
    status: 'ACTIVE',
  };
  const searchRes = http.get(
    `${BASE_URL}/api/people?page=${searchParams.page}&limit=${searchParams.limit}&search=${searchParams.search}&status=${searchParams.status}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  check(searchRes, {
    'search status is 200 or 401 (auth check)': (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.5);

  // 3. Diagnostics & Memory Check
  const diagRes = http.get(`${BASE_URL}/api/system/status`);
  check(diagRes, {
    'system status returns valid status': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
