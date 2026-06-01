import http from 'k6/http';
import { check, sleep } from 'k6';
import { handleSummary } from './report.js';
export const options = {
    stages: [
        { duration: '30s', target: 200 },
        { duration: '30s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '30s', target: 1500 },
        { duration: '30s', target: 2000 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
    ],

    thresholds: {
        http_req_duration: [
            'avg<1500',
            'med<1000',
            'p(90)<1000',
            'p(95)<2000',
            'max<5000'
        ],

        http_req_failed: [
            'rate<0.01'
        ],

        checks: [
            'rate>0.99'
        ],

    }
};

const BASE_URL = 'http://localhost:8080';

const keywords = [
    'loreal',
    'serum',
    'acnes',
    'tay trang',
    'kem chong nang',
    'son'
    ];

export default function () {
    const keyword =
        keywords[Math.floor(Math.random() * keywords.length)];

    const response = http.get(
        `${BASE_URL}/api/products/search?q=${encodeURIComponent(keyword)}`,
        {
            tags: {
                endpoint: 'product_search'
            }
        }
    );

    check(response, {
        'status=200': r => r.status === 200,
        'response not empty': r => r.body.length > 0,
        'response < 1000ms': r => r.timings.duration < 1000,
    });

    sleep(Math.random() * 3);
}
export {handleSummary}