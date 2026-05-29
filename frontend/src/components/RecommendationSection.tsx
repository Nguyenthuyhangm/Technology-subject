import { Link } from "react-router-dom";
import { useRecommendations } from "../util/useRecommendations";

interface RecommendationSectionProps {
  userId: string;
}

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) {
    return "Đang cập nhật";
  }

  return price.toLocaleString("vi-VN") + " đ";
};

export default function RecommendationSection({ userId }: RecommendationSectionProps) {
  const { recommendations, loading, error } = useRecommendations(userId, 12);

  if (loading) {
    return (
      <section className="mt-16">
        <p className="text-sm text-gray-500">Đang tải gợi ý dành cho bạn...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-16">
        <p className="text-sm text-red-500">{error}</p>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return (
      <section className="mt-16">
        <div className="rounded-3xl border border-stone-200 bg-white p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
            Recommendation
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-stone-800">
            Chưa có đủ dữ liệu để gợi ý
          </h2>

          <p className="mt-3 text-sm text-stone-500">
            Hãy thêm một vài sản phẩm vào wishlist hoặc tìm kiếm sản phẩm để
            PriceHawk hiểu sở thích của bạn hơn.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
            Recommendation
          </p>

          <h2 className="mt-3 text-3xl font-semibold text-stone-800">
            Gợi ý dành cho bạn
          </h2>

          <p className="mt-2 text-sm text-stone-500">
            Dựa trên wishlist và lịch sử tìm kiếm của bạn.
          </p>
        </div>

        <Link
          to="/search"
          className="text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          Xem tất cả sản phẩm
        </Link>
      </div>

      <div className="-mx-6 overflow-x-auto px-6 pb-5 lg:-mx-12 lg:px-12">
        <div className="flex w-max gap-5">
          {recommendations.map((product) => (
            <article
              key={product.id}
              className="w-[280px] shrink-0 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:w-[300px] lg:w-[320px]"
            >
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-stone-50">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-stone-400">No image</span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  {product.categoryName}
                </p>

                <h3 className="mt-2 line-clamp-2 text-base font-semibold text-stone-800">
                  {product.name}
                </h3>

                <p className="mt-2 text-sm text-stone-500">
                  {product.brandName}
                </p>

                {product.skinType && (
                  <p className="mt-1 text-xs text-stone-400">
                    Loại da: {product.skinType}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-400">Giá tốt nhất</p>

                    <p className="text-base font-semibold text-stone-900">
                      {formatPrice(product.lowestPrice)}
                    </p>
                  </div>

                  <div className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                    Score {product.score}
                  </div>
                </div>

                <Link
                  to={`/product/${product.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
                >
                  Xem sản phẩm
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}