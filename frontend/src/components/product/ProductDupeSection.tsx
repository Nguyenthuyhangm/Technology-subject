import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import apiClient from "../../api/apiClient";
import type { ProductDupe } from "../../types/productDupe";

const FONT_STACK = { serif: '"Times New Roman", Georgia, serif' } as const;

interface Props {
    productId: string;
}

const formatPrice = (price: number | null) => {
    if (!price) return "Đang cập nhật";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(price);
};

export default function ProductDupeSection({ productId }: Props) {
    const [products, setProducts] =useState<ProductDupe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        setProducts([]);
        apiClient
            .get<ProductDupe[]>(`/products/${productId}/dupes`)
            .then((res) => setProducts(res.data))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading) {
        return (
            <div className="mt-16 flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-stone-400" />
            </div>
        );
    }

    if (products.length === 0) return null;

    return (
        <section className="mt-16">
            <div className="mb-8">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">Có thể bạn cũng thích</p>
                <h2
                    className="mt-2 text-3xl tracking-[-0.02em] text-stone-900 dark:text-stone-100 md:text-4xl"
                    style={{ fontFamily: FONT_STACK.serif }}
                >
                    Bản dupe hoàn hảo
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => {
                    console.log(product);
                    const pid = product.productId;
                    const displayName = product.name;
                    return (
                        <Link key={pid} to={`/product/${pid}`} className="group block">
                            <article className="glass relative overflow-hidden rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
                                <div className="relative overflow-hidden rounded-[26px] bg-[#F6F1EB] dark:bg-stone-800">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={displayName}
                                            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                                        />
                                    ) : (
                                        <div className="aspect-[4/5] w-full flex items-center justify-center text-xs text-stone-400">
                                            Không có ảnh
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-white/10" />
                                </div>

                                <div className="mt-5">
                                    <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8E6A72]">
                      {product.brandName}
                    </span>
                                        <span className="text-[10px] text-stone-400">{product.categoryName}</span>
                                    </div>
                                    <h3
                                        className="mt-2 line-clamp-2 text-[1.2rem] leading-[1.25] tracking-[-0.02em] text-stone-900 dark:text-stone-100 transition-colors group-hover:text-[#8E6A72]"
                                        style={{ fontFamily: FONT_STACK.serif }}
                                    >
                                        {displayName}
                                    </h3>
                                    <p className="mt-3 text-[1.1rem] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                                        {formatPrice(product.lowestPrice ?? null)}
                                    </p>
                                </div>
                            </article>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
