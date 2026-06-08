import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  analyzeOrGetSkinAdvice,
  downloadSkinAdvicePdf,
  type SkinAdviceResponse,
  type SkinRoutineStepProduct,
} from '../api/skinAdviceApi';
import { useAuth } from '../context/AuthContext';

function RoutineProductCard({ item }: { item: SkinRoutineStepProduct }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-[#EEE4E1] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#B7848C]">
            {item.routineTime === 'morning' ? 'AM Routine' : 'PM Routine'}
          </p>

          <h4 className="mt-1 text-lg font-semibold text-stone-900">
            {item.stepLabel}
          </h4>
        </div>

        <span className="rounded-full bg-[#FCF0F2] px-3 py-1 text-xs text-[#8E6A72]">
          {item.routineTime === 'morning' ? 'Sáng' : 'Tối'}
        </span>
      </div>

      <div className="flex gap-4">
        <img
          src={item.imageUrl || '/placeholder.png'}
          alt={item.productName}
          onError={(event) => {
            event.currentTarget.src = '/placeholder.png';
          }}
          className="h-28 w-28 shrink-0 rounded-2xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <h5 className="line-clamp-2 text-sm font-semibold leading-6 text-stone-800">
            {item.productName}
          </h5>

          <p className="mt-1 text-xs text-stone-500">
            {item.brandName} • {item.categoryName}
          </p>

          <p className="mt-2 text-sm font-bold text-[#B7848C]">
            {item.lowestPrice
              ? `${item.lowestPrice.toLocaleString('vi-VN')}đ`
              : 'Chưa có giá'}
          </p>

          <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">
            {item.reason}
          </p>

          {item.productId && (
            <button
              type="button"
              onClick={() => navigate(`/product/${item.productId}`)}
              className="mt-3 rounded-full bg-[#1F1A17] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90"
            >
              Xem sản phẩm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SkinAdvicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkinAdviceResponse | null>(null);

  const [form, setForm] = useState({
    skinType: 'Da khô',
    sensitivityLevel: 'Trung bình',
    acneLevel: 'Nhẹ',
    mainConcerns: '',
    skinGoals: '',
    allergies: '',
    currentProducts: '',
    budgetMin: 200000,
    budgetMax: 700000,
  });

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'budgetMin' || name === 'budgetMax'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      alert('Bạn cần đăng nhập để dùng tính năng này.');
      return;
    }

    setLoading(true);

    try {
      const data = await analyzeOrGetSkinAdvice({
        userId: user.id,
        ...form,
      });

      setResult(data);
    } catch (error) {
      console.error(error);
      alert('Không thể phân tích tình trạng da. Bạn thử lại sau nhé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="text-4xl font-semibold text-stone-900">
        Tư vấn tình trạng da bằng AI
      </h1>

      <p className="mt-3 text-sm leading-7 text-stone-500">
        Nhập tình trạng da của bạn để PriceHawk AI tạo routine cá nhân hóa.
        Nếu tình trạng này đã từng được phân tích, hệ thống sẽ lấy kết quả cũ
        để trả lời nhanh hơn.
      </p>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-5 rounded-full border border-[#E9D8DE] bg-white px-5 py-3 text-sm font-medium text-[#8E6A72] shadow-sm transition hover:bg-[#FFF7F9]"
      >
        ← Trở về Home
      </button>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-5 rounded-[28px] bg-white p-6 shadow"
      >
        <select
          name="skinType"
          value={form.skinType}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3"
        >
          <option>Da khô</option>
          <option>Da dầu</option>
          <option>Da hỗn hợp</option>
          <option>Da nhạy cảm</option>
          <option>Da thường</option>
        </select>

        <select
          name="sensitivityLevel"
          value={form.sensitivityLevel}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3"
        >
          <option>Thấp</option>
          <option>Trung bình</option>
          <option>Cao</option>
        </select>

        <select
          name="acneLevel"
          value={form.acneLevel}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3"
        >
          <option>Không có</option>
          <option>Nhẹ</option>
          <option>Vừa</option>
          <option>Nặng</option>
        </select>

        <textarea
          name="mainConcerns"
          value={form.mainConcerns}
          onChange={handleChange}
          placeholder="Vấn đề chính: mụn ẩn, bong tróc, đỏ rát..."
          className="min-h-[100px] rounded-xl border px-4 py-3"
        />

        <textarea
          name="skinGoals"
          value={form.skinGoals}
          onChange={handleChange}
          placeholder="Mục tiêu: phục hồi, giảm mụn, cấp ẩm..."
          className="min-h-[100px] rounded-xl border px-4 py-3"
        />

        <textarea
          name="allergies"
          value={form.allergies}
          onChange={handleChange}
          placeholder="Dị ứng hoặc thành phần cần tránh"
          className="min-h-[80px] rounded-xl border px-4 py-3"
        />

        <textarea
          name="currentProducts"
          value={form.currentProducts}
          onChange={handleChange}
          placeholder="Sản phẩm đang dùng"
          className="min-h-[80px] rounded-xl border px-4 py-3"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="budgetMin"
            type="number"
            value={form.budgetMin}
            onChange={handleChange}
            className="rounded-xl border px-4 py-3"
            placeholder="Ngân sách tối thiểu"
          />

          <input
            name="budgetMax"
            type="number"
            value={form.budgetMax}
            onChange={handleChange}
            className="rounded-xl border px-4 py-3"
            placeholder="Ngân sách tối đa"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#1F1A17] px-6 py-4 text-white disabled:opacity-60"
        >
          {loading ? 'Đang phân tích...' : 'Phân tích tình trạng da'}
        </button>
      </form>

      {result && (
        <section className="mt-8 rounded-[28px] bg-[#FCF8F4] p-6">
          <p className="mb-4 text-xs uppercase tracking-wider text-[#8E6A72]">
            {result.cached ? 'Lấy từ kết quả đã có' : 'Kết quả mới từ AI'}
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-stone-900">
                Tóm tắt routine
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
                {result.summary}
              </p>
            </div>

            <button
              type="button"
              onClick={() => downloadSkinAdvicePdf(result.reportId)}
              className="rounded-full bg-[#B7848C] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Tải PDF báo cáo chi tiết
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold text-stone-900">
              Routine sáng
            </h3>

            <p className="mt-1 text-sm text-stone-500">
              Làm sạch nhẹ, cấp ẩm và bảo vệ da ban ngày.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {result.morningProducts && result.morningProducts.length > 0 ? (
                result.morningProducts.map((item) => (
                  <RoutineProductCard
                    key={`${item.routineTime}-${item.stepKey}-${item.productId}`}
                    item={item}
                  />
                ))
              ) : (
                <p className="text-sm text-stone-500">
                  Chưa tìm thấy sản phẩm phù hợp cho routine sáng.
                </p>
              )}
            </div>
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-stone-900">
              Routine tối
            </h3>

            <p className="mt-1 text-sm text-stone-500">
              Làm sạch kỹ hơn, treatment nhẹ nếu cần và phục hồi da.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {result.nightProducts && result.nightProducts.length > 0 ? (
                result.nightProducts.map((item) => (
                  <RoutineProductCard
                    key={`${item.routineTime}-${item.stepKey}-${item.productId}`}
                    item={item}
                  />
                ))
              ) : (
                <p className="text-sm text-stone-500">
                  Chưa tìm thấy sản phẩm phù hợp cho routine tối.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-white p-5">
            <h3 className="font-semibold text-stone-900">Lưu ý chính</h3>

            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-600">
              {result.warningNotes}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}