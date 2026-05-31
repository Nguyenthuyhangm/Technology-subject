import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
    ],

    thresholds: {
        http_req_duration: ['p(95)<1500'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

const BASE_URL = 'http://localhost:8080';

const products = [
    '003e5836-6906-4e5e-b506-4cddf20a8732',
    '00a38819-2a94-4662-8d6a-0d8ebea744d3',
    '0a4d8bab-210c-42ad-a9d7-2d18148c8823',
];

export default function () {

    const productId =
        products[Math.floor(Math.random() * products.length)];

    const response = http.get(
        `${BASE_URL}/api/compare/${productId}`,
        {
            tags: {
                endpoint: 'price_compare'
            }
        }
    );

    check(response, {
        'status=200': r => r.status === 200,
        'body not empty': r => r.body.length > 0,
        'response < 1500ms': r => r.timings.duration < 1500,
    });

    sleep(1);
}