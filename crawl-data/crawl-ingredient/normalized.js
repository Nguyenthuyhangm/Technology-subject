
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const INPUT_FILE = "product.json";
const OUTPUT_FILE = "canonical-products.json";

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractJson(text) {
    const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start === -1 || end === -1) {
        throw new Error(
            `Cannot find JSON array in response:\n${cleaned}`
        );
    }

    return JSON.parse(
        cleaned.slice(start, end + 1)
    );
}

async function normalizeBatch(category, products) {
    const prompt = `
Convert Vietnamese cosmetic product names into official international cosmetic product names.

Return ONLY a JSON array.

Output format:

[
  {
    "id":"uuid",
    "canonical_name":"official name"
  }
]

Category:
${category}

IMPORTANT RULES:

- Keep id unchanged.
- Return exactly one output item for every input item.
- Preserve input order.
- Never create new ids.
- Never remove ids.
- Never merge products.
- English only.
- Remove volume/weight.
- Remove marketing text.
- Remove promotional text.
- Use official international cosmetic product names whenever possible.
- If uncertain, return the most recognizable international product name.

Input:
${JSON.stringify(products, null, 2)}
`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response =
                await client.responses.create({
                    model: "gpt-5",
                    input: prompt
                });

            return extractJson(
                response.output_text
            );
        } catch (error) {
            console.error(
                `Attempt ${attempt}/${MAX_RETRIES} failed`,
                error.message
            );

            if (attempt === MAX_RETRIES) {
                throw error;
            }

            await sleep(RETRY_DELAY);
        }
    }
}

async function processCategory(
    category,
    products
) {
    const normalizedProducts = [];

    for (
        let i = 0;
        i < products.length;
        i += BATCH_SIZE
    ) {
        const batch = products.slice(
            i,
            i + BATCH_SIZE
        );

        console.log(
            `[${category}] Processing ${i + 1}-${Math.min(
                i + BATCH_SIZE,
                products.length
            )}/${products.length}`
        );

        const normalized =
            await normalizeBatch(
                category,
                batch
            );

        normalizedProducts.push(
            ...normalized
        );

        await sleep(1000);
    }

    return normalizedProducts;
}

async function main() {
    const data = JSON.parse(
        fs.readFileSync(
            INPUT_FILE,
            "utf8"
        )
    );

    const result = {};

    const categories =
        Object.entries(data);

    console.log(
        `Found ${categories.length} categories`
    );

    for (const [category, products] of categories) {
        try {
            console.log(
                `\n====================================`
            );
            console.log(
                `Processing category: ${category}`
            );
            console.log(
                `Products: ${products.length}`
            );
            console.log(
                `====================================`
            );

            result[category] =
                await processCategory(
                    category,
                    products
                );

            fs.writeFileSync(
                OUTPUT_FILE,
                JSON.stringify(
                    result,
                    null,
                    2
                ),
                "utf8"
            );

            console.log(
                `Saved progress -> ${OUTPUT_FILE}`
            );
        } catch (error) {
            console.error(
                `Category failed: ${category}`
            );

            console.error(error);

            fs.writeFileSync(
                OUTPUT_FILE,
                JSON.stringify(
                    result,
                    null,
                    2
                ),
                "utf8"
            );
        }
    }

    console.log(
        "\nCompleted successfully."
    );
}

main().catch(error => {
    console.error(
        "Fatal error:",
        error
    );
    process.exit(1);
});

