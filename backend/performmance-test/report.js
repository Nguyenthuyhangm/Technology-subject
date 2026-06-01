import { textSummary }from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export function handleSummary(data) {

const scenario =
__ENV.SCENARIO || "search";

const thresholdPassed =
Object.values(data.metrics)
.every(
metric =>
!metric.thresholds ||
Object.values(metric.thresholds)
.every(t => t.ok)
);

const report = {

scenario,

summary: {

totalRequests:
data.metrics.http_reqs?.values?.count ?? 0,

failedRequests:
(
(
data.metrics.http_req_failed?.values?.rate
?? 0
)
*100
).toFixed(2),

peakUsers:
data.metrics.vus_max?.values?.max ?? 0,

thresholds:
thresholdPassed
? "PASS"
: "FAIL"

},

performance: {

avg:
(
data.metrics.http_req_duration?.values?.avg
?? 0
).toFixed(2),

p90:
(
data.metrics.http_req_duration?.values?.["p(90)"]
?? 0
).toFixed(2),

p95:
(
data.metrics.http_req_duration?.values?.["p(95)"]
?? 0
).toFixed(2),

max:
(
data.metrics.http_req_duration?.values?.max
?? 0
).toFixed(2)

}

};

return {

[
`results/${scenario}.json`
]:

JSON.stringify(
report,
null,
2
),

stdout:
textSummary(
data,
{
indent:" ",
enableColors:true
}
)

};

}

