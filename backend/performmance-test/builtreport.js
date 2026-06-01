
const fs = require("fs");

const REPORT_FILE = "./report.html";
const RESULTS_DIR = "./results";

// Đọc report template
let html = fs.readFileSync(REPORT_FILE, "utf8");

// Đọc tất cả file JSON
const reports = fs
  .readdirSync(RESULTS_DIR)
  .filter(file => file.endsWith(".json"))
  .map(file =>
    JSON.parse(
      fs.readFileSync(`${RESULTS_DIR}/${file}`, "utf8")
)
);

// ===== SUMMARY =====

const totalRequests = reports.reduce(
    (sum, r) => sum + Number(r.summary.totalRequests),
    0
);

const avgFailed =
    (
        reports.reduce(
            (sum, r) =>
                sum +
                Number(r.summary.failedRequests),
            0
        ) / reports.length
    ).toFixed(2);

const maxP95 =
    Math.max(
        ...reports.map(
            r =>
                Number(r.performance.p95)
        )
    );

const status =
    reports.every(
        r =>
            r.summary.thresholds === "PASS"
    )
        ? "PASS"
        : "FAIL";

function replaceFirstFill(value) {
    html = html.replace(
        "[Fill]",
        value
    );
}

replaceFirstFill(totalRequests);
replaceFirstFill(`${avgFailed}%`);
replaceFirstFill(`${maxP95} ms`);
replaceFirstFill(status);

// ===== ĐIỀN CÁC BẢNG =====

reports.forEach(report => {

    const values = [

        report.summary.totalRequests,

        `${report.performance.avg} ms`,

        `${report.performance.p90} ms`,

        `${report.performance.p95} ms`,

        `${report.performance.max} ms`,

        `${report.summary.failedRequests}%`

    ];

    values.forEach(value => {

        html =
            html.replace(
                "<td></td>",
                `<td>${value}</td>`
            );

    });

});

// ===== Comparative Summary =====

const summaryRows = reports
    .map(r => `
<tr>
<td>${r.scenario}</td>
<td>${r.summary.peakUsers}</td>
<td>${r.performance.avg} ms</td>
<td>${r.performance.p95} ms</td>
<td>${r.summary.failedRequests}%</td>
<td>${r.summary.thresholds}</td>
</tr>
`)
    .join("");

html =
    html.replace(
        /<tr>\s*<td>Search[\s\S]*?<\/table>/,
        summaryRows + "</table>"
    );

// ===== GHI ĐÈ =====

fs.writeFileSync(
    REPORT_FILE,
    html
);

console.log(
    "Updated report.html"
);

