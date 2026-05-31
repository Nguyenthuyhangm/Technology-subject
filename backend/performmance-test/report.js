import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
export function handleSummary(data) {

    const total =
        data.metrics.http_reqs.values.count;

    const failed =
        (data.metrics.http_req_failed.values.rate*100)
            .toFixed(2);

    const avg =
        data.metrics.http_req_duration.values.avg
            .toFixed(2);

    const p90 =
        data.metrics.http_req_duration.values["p(90)"]
            .toFixed(2);

    const p95 =
        data.metrics.http_req_duration.values["p(95)"]
            .toFixed(2);

    const max =
        data.metrics.http_req_duration.values.max
            .toFixed(2);

    const peak =
        data.metrics.vus_max.values.max;

    const html = `

<div class="summary">

<div class="card">
<h3>Total Requests</h3>
<div class="value">${total}</div>
</div>

<div class="card">
<h3>Failed Requests</h3>
<div class="value">${failed}%</div>
</div>

<div class="card">
<h3>P95</h3>
<div class="value">${p95} ms</div>
</div>

<div class="card">
<h3>Thresholds</h3>
<div class="value">
${
        data.root_group.checks
            ? "PASS"
            : "FAIL"
    }
</div>
</div>

</div>

<table>

<tr>
<td>Total Requests</td>
<td>${total}</td>
</tr>

<tr>
<td>Average Response</td>
<td>${avg} ms</td>
</tr>

<tr>
<td>P90</td>
<td>${p90} ms</td>
</tr>

<tr>
<td>P95</td>
<td>${p95} ms</td>
</tr>

<tr>
<td>Max Duration</td>
<td>${max} ms</td>
</tr>

<tr>
<td>Error Rate</td>
<td>${failed}%</td>
</tr>

<tr>
<td>Peak Users</td>
<td>${peak}</td>
</tr>

</table>

`;

    return {
        "report.html": html,
        stdout: textSummary(data)
    };

}