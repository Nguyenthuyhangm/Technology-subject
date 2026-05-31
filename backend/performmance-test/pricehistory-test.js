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
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

const BASE_URL = 'http://localhost:8080';

const productIds = [
    '5a777a10-8954-4c76-8db7-d7ff051d7212',
    '2f6c1161-9dab-46db-9549-0afc3968d34e',
    '91a1cb93-a39b-4d55-bed2-2a966555821b',
];

export default function () {

    const productId =
        productIds[Math.floor(Math.random() * productIds.length)];

    const response = http.get(
        `${BASE_URL}/api/v1/price-history/${productId}`,
        {
            tags: {
                endpoint: 'price_history'
            }
        }
    );

    check(response, {
        'status=200': r => r.status === 200,
        'body not empty': r => r.body.length > 0,
        'response < 2000ms': r => r.timings.duration < 2000,
    });

    sleep(1);
}