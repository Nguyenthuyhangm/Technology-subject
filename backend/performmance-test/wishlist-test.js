import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 10},
        { duration: '1m', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
    ],

    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.05'],
    },
};

const BASE_URL = 'http://localhost:8080';

// Token Supabase lấy từ Network tab
const TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjM5ZmEzMzFiLTllOGItNGM5MS04ZjdmLTU1MTQ1ODY1N2UzYSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FzdGthbmZzYWN4cml3cHJzcHFyLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2OGRiOWY5Ny0wZmZiLTQyZGItOGUyMS0wODFmNDJmZGUzYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgwMTQwMDY3LCJpYXQiOjE3ODAxMzY0NjcsImVtYWlsIjoiZG1pbmhhbmgyODEwQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSklGSlZUOWNWRU9zZGQzaEllVGVaSlBSLTllYUdMWDhfSy1ZOVAtWHRPMHVqTmNnPXM5Ni1jIiwiZW1haWwiOiJkbWluaGFuaDI4MTBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkRNaW5oIEFuaCBOZ3V54buFbiIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJETWluaCBBbmggTmd1eeG7hW4iLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKSUZKVlQ5Y1ZFT3NkZDNoSWVUZVpKUFItOWVhR0xYOF9LLVk5UC1YdE8wdWpOY2c9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwNTM4OTE3MTYwOTAxMjI0NDI5MCIsInN1YiI6IjEwNTM4OTE3MTYwOTAxMjI0NDI5MCJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzc5NjMzMjE0fV0sInNlc3Npb25faWQiOiI1NmQ0ZDM1Ni03ZGZjLTQwNjAtOTBhOC04ZDQyMTZlNGQ1OWEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.xgmuWpmnz-25EWl3JrNPkOa5pTlu4KG38zCiXMahUuGLenGZl3qnVmuwIULSCboPocLsSVzPT2uzrPNx3HoGgQ';

const USERS = [
    '0f28c675-f8e6-4044-9958-ff0708270a9a',

];

const PRODUCTS = [
    '144edba8-ea91-4625-b2bc-bac672ae0811',

];

const params = {
    headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    },
};

export default function () {

    const userId =
        USERS[Math.floor(Math.random() * USERS.length)];

    const productId =
        PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];

    // ==========================
    // 1. GET Wishlist
    // ==========================
    let res = http.get(
        `${BASE_URL}/api/wishlist/${userId}`,
        params
    );

    console.log(`GET STATUS=${res.status}`);

    check(res, {
        'GET wishlist status=200':
            r => r.status === 200,
    });

    sleep(1);

    // ==========================
    // 2. ADD Wishlist
    // ==========================
    const payload = JSON.stringify({
        userId,
        productId,
    });
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    export const options = {
        stages: [
            { duration: '1m', target: 20 },
            { duration: '1m', target: 50 },
            { duration: '1m', target: 100 },
            { duration: '1m', target: 200 },
            { duration: '1m', target: 0 },
        ],

        thresholds: {
            http_req_duration: [
                'avg<500',
                'p(95)<1000'
            ],

            http_req_failed: [
                'rate<0.01'
            ],

            checks: [
                'rate>0.99'
            ]
        }
    };

    const BASE_URL = 'http://localhost:8080';

    const TOKEN = __ENV.TOKEN;

    const USERS = [
        '0f28c675-f8e6-4044-9958-ff0708270a9a',
    ];

    function auth() {
        return {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            }
        };
    }

    export default function () {

        const userId =
            USERS[Math.floor(Math.random() * USERS.length)];

        const res = http.get(
            `${BASE_URL}/api/wishlist/${userId}`,
            {
                ...auth(),
                tags: {
                    endpoint: 'wishlist_get'
                }
            }
        );

        check(res, {
            'status=200':
                r => r.status === 200,

            'response not empty':
                r => r.body && r.body.length > 0,

            'response < 1000ms':
                r => r.timings.duration < 1000,
        });

        sleep(1);
    }
    res = http.post(
        `${BASE_URL}/api/wishlist/add`,
        payload,
        params
    );

    console.log(`POST STATUS=${res.status}`);

    if (res.status !== 200 && res.status !== 409) {
        console.log(res.body);
    }

    check(res, {
        'POST wishlist':
            r => r.status === 200 || r.status === 409,
    });

    sleep(1);

    // ==========================
    // 3. DELETE Wishlist
    // ==========================
    res = http.del(
        `${BASE_URL}/api/wishlist/${productId}?userId=${userId}`,
        null,
        params
    );

    console.log(`DELETE STATUS=${res.status}`);

    if (res.status !== 204 && res.status !== 404) {
        console.log(res.body);
    }

    check(res, {
        'DELETE wishlist':
            r => r.status === 204 || r.status === 404,
    });

    sleep(1);
}