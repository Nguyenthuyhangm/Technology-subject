import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
export const options = {
    stages: [
        { duration: '30s', target: 200 },
        { duration: '30s', target: 500 },
        { duration: '30s', target: 1000 },
        { duration: '30s', target: 1500 },
        { duration: '30s', target: 2000 },
        { duration:'30s', target:2500 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
    ],

    thresholds: {
        http_req_duration: [
            'avg<500',
            'med<300',
            'p(90)<800',
            'p(95)<1000',
            'max<5000'
        ],

        http_req_failed: [
            'rate<0.01'
        ],

        checks: [
            'rate>0.99'
        ],

        http_reqs: [
            'rate>500'
        ]
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

    sleep(0.1);
}
export function handleSummary(data) {
    return {
        "report.html": htmlReport(data),
        stdout: textSummary(data, {
            indent: " ",
            enableColors: true,
        }),
    };
}