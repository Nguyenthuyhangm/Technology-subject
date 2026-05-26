/**
 * Chuẩn hóa tên sản phẩm để tìm kiếm fuzzy trên Elasticsearch
 * Dùng cho Shopee & Lazada (không có productId trong DB)
 */
function normalizeName(raw) {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^\w\sàáảãạăắặẵặầấẩẫậâắặêếềệểễôốồổỗộơớờởỡợùúủũụưứừửữựđ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100); // Giới hạn độ dài query
}

function normalizePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || null;
}
