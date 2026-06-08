import fs from "fs";

const data = JSON.parse(
    fs.readFileSync(
        "ingredients.json",
        "utf8"
    )
);

function cleanText(str) {
    if (!str) return str;

    return str
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\t/g, " ")
        .replace(/\[more\]/gi, "")
        .replace(/\[less\]/gi, "")
        .replace(/Report Error/gi, "")
        .replace(/Embed/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

for (const item of data) {

    item.productName =
        cleanText(item.productName);

    item.ingredients =
        item.ingredients
            .map(cleanText)
            .filter(Boolean);
}

fs.writeFileSync(
    "ingredients-clean.json",
    JSON.stringify(data, null, 2)
);

console.log(
    `Cleaned ${data.length} products`
);