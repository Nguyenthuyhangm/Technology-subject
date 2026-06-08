import json
import csv

# Đọc file JSON

with open("ingredients-clean.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Ghi CSV
with open("ingredient.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)

    writer.writerow(["id", "productName", "ingredients", "found"])

    for item in data:
        writer.writerow([
            item.get("id"),
            item.get("productName"),
            json.dumps(item.get("ingredients", []), ensure_ascii=False),
            str(item.get("found", False)).lower()
        ])

print("Done!")