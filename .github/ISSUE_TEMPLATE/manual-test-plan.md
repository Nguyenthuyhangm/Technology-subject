---

# A

# 📝 Manual Test Plan - PriceHawk

## 📌 Thông tin chung

* **Tính năng cần test:**
* **Môi trường test:** Local 
* **Vai trò test:** User / Admin
* **Người kiểm thử: Dinh Huyen Trang
* **Ngày test:30/5/2026
* **Trình duyệt / Thiết bị:** Chrome / Desktop
* **Kết quả chung:** Pass 

---

# 👤 USER TEST CASES

## 1. Authentication - Đăng ký / Đăng nhập / Đăng xuất

- [ ] **TC_USER_AUTH_01:** Truy cập trang đăng nhập thành công.
- [ ] **TC_USER_AUTH_02:** Đăng ký tài khoản mới với thông tin hợp lệ.
- [ ] **TC_USER_AUTH_03:** Hệ thống báo lỗi khi đăng ký với email đã tồn tại.
- [ ] **TC_USER_AUTH_04:** Đăng nhập thành công với email và mật khẩu đúng.
- [ ] **TC_USER_AUTH_05:** Hệ thống báo lỗi khi nhập sai mật khẩu.
- [ ] **TC_USER_AUTH_06:** Hệ thống báo lỗi khi nhập email không hợp lệ.
- [ ] **TC_USER_AUTH_07:** Người dùng chưa đăng nhập khi truy cập trang cần auth sẽ bị chuyển về trang đăng nhập.
- [ ] **TC_USER_AUTH_08:** Người dùng đã đăng nhập vẫn duy trì trạng thái sau khi reload trang.
- [ ] **TC_USER_AUTH_09:** Đăng xuất thành công và quay về trạng thái chưa đăng nhập.
- [ ] **TC_USER_AUTH_10:** Kiểm tra giao diện đăng nhập hiển thị đúng trên mobile.

---

## 2. Homepage / Landing Page

- [ ] **TC_USER_HOME_01:** Truy cập Landing Page thành công.
- [ ] **TC_USER_HOME_02:** Header hiển thị đầy đủ logo, menu, Login/Sign in.
- [ ] **TC_USER_HOME_03:** Hero section hiển thị đúng tagline và nút hành động.
- [ ] **TC_USER_HOME_04:** Nút Login/Sign in điều hướng đúng sang trang đăng nhập.
- [ ] **TC_USER_HOME_05:** Khu vực giới thiệu tính năng AI, Price Alert, Wishlist hiển thị đúng.
- [ ] **TC_USER_HOME_06:** Khu vực marketplace như Hasaki, Guardian, Cocolux hiển thị đúng.
- [ ] **TC_USER_HOME_07:** Carousel sản phẩm/deal hiển thị và chuyển động đúng.
- [ ] **TC_USER_HOME_08:** Giao diện Landing Page responsive trên mobile.
- [ ] **TC_USER_HOME_09:** Không có lỗi layout vỡ giao diện khi resize màn hình.

---

## 3. Search Product - Tìm kiếm sản phẩm

- [ ] **TC_USER_SEARCH_01:** Truy cập trang tìm kiếm sản phẩm thành công.
- [ ] **TC_USER_SEARCH_02:** Nhập từ khóa tìm kiếm và nhận được danh sách sản phẩm.
- [ ] **TC_USER_SEARCH_03:** URL cập nhật đúng query param sau khi tìm kiếm.
- [ ] **TC_USER_SEARCH_04:** Hiển thị thông báo phù hợp khi không có kết quả.
- [ ] **TC_USER_SEARCH_05:** Tìm kiếm với từ khóa rỗng không làm hệ thống lỗi.
- [ ] **TC_USER_SEARCH_06:** Tìm kiếm với ký tự đặc biệt không làm hệ thống lỗi.
- [ ] **TC_USER_SEARCH_07:** Loading state hiển thị trong lúc tìm kiếm.
- [ ] **TC_USER_SEARCH_08:** Kết quả tìm kiếm hiển thị tên sản phẩm, giá, ảnh và nền tảng bán.
- [ ] **TC_USER_SEARCH_09:** Click vào sản phẩm điều hướng sang trang chi tiết sản phẩm.
- [ ] **TC_USER_SEARCH_10:** Giao diện trang tìm kiếm responsive trên mobile.

---

## 4. Product Detail - Chi tiết sản phẩm

- [ ] **TC_USER_PRODUCT_01:** Truy cập trang chi tiết sản phẩm thành công.
- [ ] **TC_USER_PRODUCT_02:** Hiển thị đầy đủ tên sản phẩm, ảnh, giá hiện tại.
- [ ] **TC_USER_PRODUCT_03:** Hiển thị thông tin nền tảng bán sản phẩm.
- [ ] **TC_USER_PRODUCT_04:** Hiển thị biểu đồ lịch sử giá nếu có dữ liệu.
- [ ] **TC_USER_PRODUCT_05:** Hiển thị thông báo phù hợp nếu chưa có lịch sử giá.
- [ ] **TC_USER_PRODUCT_06:** Hiển thị khu vực so sánh giá giữa các sàn/nền tảng.
- [ ] **TC_USER_PRODUCT_07:** Click nút đi đến trang mua hàng hoạt động đúng.
- [ ] **TC_USER_PRODUCT_08:** Sản phẩm không tồn tại hiển thị trang lỗi hoặc thông báo phù hợp.
- [ ] **TC_USER_PRODUCT_09:** Giao diện trang chi tiết sản phẩm responsive trên mobile.

---

## 5. Wishlist - Danh sách yêu thích

- [ ] **TC_USER_WISHLIST_01:** Người dùng đã đăng nhập có thể thêm sản phẩm vào Wishlist.
- [ ] **TC_USER_WISHLIST_02:** Hệ thống hiển thị thông báo khi thêm vào Wishlist thành công.
- [ ] **TC_USER_WISHLIST_03:** Sản phẩm đã thêm xuất hiện trong trang Wishlist.
- [ ] **TC_USER_WISHLIST_04:** Không thêm trùng cùng một sản phẩm nhiều lần vào Wishlist.
- [ ] **TC_USER_WISHLIST_05:** Người dùng có thể xóa sản phẩm khỏi Wishlist.
- [ ] **TC_USER_WISHLIST_06:** Sau khi xóa, sản phẩm không còn trong danh sách Wishlist.
- [ ] **TC_USER_WISHLIST_07:** Người dùng chưa đăng nhập khi thêm Wishlist sẽ bị yêu cầu đăng nhập.
- [ ] **TC_USER_WISHLIST_08:** Trang Wishlist hiển thị trạng thái rỗng khi chưa có sản phẩm.
- [ ] **TC_USER_WISHLIST_09:** Click sản phẩm trong Wishlist điều hướng đến trang chi tiết sản phẩm.
- [ ] **TC_USER_WISHLIST_10:** Giao diện Wishlist responsive trên mobile.

---

## 6. Price Alert - Cảnh báo giá

- [ ] **TC_USER_ALERT_01:** Người dùng có thể tạo cảnh báo giá cho sản phẩm.
- [ ] **TC_USER_ALERT_02:** Hệ thống yêu cầu nhập mức giá mục tiêu.
- [ ] **TC_USER_ALERT_03:** Hệ thống báo lỗi khi nhập giá mục tiêu không hợp lệ.
- [ ] **TC_USER_ALERT_04:** Tạo Price Alert thành công với mức giá hợp lệ.
- [ ] **TC_USER_ALERT_05:** Alert mới tạo xuất hiện trong danh sách cảnh báo giá.
- [ ] **TC_USER_ALERT_06:** Người dùng có thể chỉnh sửa mức giá mục tiêu.
- [ ] **TC_USER_ALERT_07:** Người dùng có thể xóa Price Alert.
- [ ] **TC_USER_ALERT_08:** Alert đã xóa không còn hiển thị trong danh sách.
- [ ] **TC_USER_ALERT_09:** Người dùng chưa đăng nhập khi tạo alert sẽ bị yêu cầu đăng nhập.
- [ ] **TC_USER_ALERT_10:** Trang Alerts hiển thị trạng thái rỗng khi chưa có alert nào.

---

## 7. Price History / Chart - Lịch sử giá

- [ ] **TC_USER_CHART_01:** Biểu đồ lịch sử giá hiển thị đúng trên trang chi tiết sản phẩm.
- [ ] **TC_USER_CHART_02:** Biểu đồ có trục thời gian và giá rõ ràng.
- [ ] **TC_USER_CHART_03:** Tooltip hiển thị thông tin giá khi hover.
- [ ] **TC_USER_CHART_04:** Biểu đồ không bị vỡ layout trên desktop.
- [ ] **TC_USER_CHART_05:** Biểu đồ không bị vỡ layout trên mobile.
- [ ] **TC_USER_CHART_06:** Hiển thị thông báo phù hợp khi không có dữ liệu lịch sử giá.

---

## 8. Quick Compare - So sánh giá nhanh

- [ ] **TC_USER_COMPARE_01:** Hiển thị danh sách nền tảng bán sản phẩm.
- [ ] **TC_USER_COMPARE_02:** Hiển thị giá của từng nền tảng.
- [ ] **TC_USER_COMPARE_03:** Nền tảng có giá thấp nhất được thể hiện rõ ràng.
- [ ] **TC_USER_COMPARE_04:** Click vào nền tảng bán điều hướng đúng.
- [ ] **TC_USER_COMPARE_05:** Không có dữ liệu so sánh thì hiển thị thông báo phù hợp.
- [ ] **TC_USER_COMPARE_06:** Khu vực so sánh giá responsive trên mobile.

---

## 9. AI Recommendation / AI Assistant

- [ ] **TC_USER_AI_01:** Người dùng truy cập được khu vực AI Recommendation/AI Assistant.
- [ ] **TC_USER_AI_02:** Nhập yêu cầu gợi ý sản phẩm và nhận phản hồi từ AI.
- [ ] **TC_USER_AI_03:** AI trả về gợi ý phù hợp với nội dung người dùng nhập.
- [ ] **TC_USER_AI_04:** Hiển thị loading state khi chờ AI phản hồi.
- [ ] **TC_USER_AI_05:** Hệ thống xử lý khi AI không phản hồi hoặc lỗi API.
- [ ] **TC_USER_AI_06:** Người dùng nhập prompt rỗng thì hệ thống không gửi yêu cầu.
- [ ] **TC_USER_AI_07:** Giao diện AI responsive trên mobile.

---

## 10. User Profile / Account

- [ ] **TC_USER_PROFILE_01:** Người dùng truy cập được trang thông tin cá nhân.
- [ ] **TC_USER_PROFILE_02:** Hiển thị đúng email hoặc thông tin tài khoản.
- [ ] **TC_USER_PROFILE_03:** Người dùng có thể cập nhật thông tin cá nhân nếu hệ thống hỗ trợ.
- [ ] **TC_USER_PROFILE_04:** Hệ thống báo lỗi khi nhập dữ liệu không hợp lệ.
- [ ] **TC_USER_PROFILE_05:** Người dùng chưa đăng nhập không thể truy cập trang profile.
- [ ] **TC_USER_PROFILE_06:** Giao diện profile responsive trên mobile.

---

## 11. Navigation / UI / Responsive

- [ ] **TC_USER_UI_01:** Navbar hiển thị đúng trên desktop.
- [ ] **TC_USER_UI_02:** Navbar hiển thị đúng trên mobile.
- [ ] **TC_USER_UI_03:** Các link điều hướng hoạt động đúng.
- [ ] **TC_USER_UI_04:** Không có lỗi trắng trang khi chuyển route.
- [ ] **TC_USER_UI_05:** Toast/notification hiển thị đúng khi thao tác thành công.
- [ ] **TC_USER_UI_06:** Toast/notification hiển thị đúng khi có lỗi.
- [ ] **TC_USER_UI_07:** Font chữ, màu sắc, khoảng cách hiển thị đồng nhất.
- [ ] **TC_USER_UI_08:** Các nút chính có hover/click state rõ ràng.
- [ ] **TC_USER_UI_09:** Không có lỗi console nghiêm trọng khi thao tác cơ bản.
- [ ] **TC_USER_UI_10:** Giao diện không bị tràn ngang trên mobile.

---

# 🛠️ ADMIN TEST CASES

## 1. Admin Authentication

- [ ] **TC_ADMIN_AUTH_01:** Admin đăng nhập thành công với tài khoản hợp lệ.
- [ ] **TC_ADMIN_AUTH_02:** User thường không thể truy cập trang Admin.
- [ ] **TC_ADMIN_AUTH_03:** Hệ thống báo lỗi khi admin nhập sai thông tin đăng nhập.
- [ ] **TC_ADMIN_AUTH_04:** Admin đăng xuất thành công.
- [ ] **TC_ADMIN_AUTH_05:** Chưa đăng nhập thì không thể truy cập dashboard admin.

---

## 2. Admin Dashboard

- [ ] **TC_ADMIN_DASHBOARD_01:** Admin truy cập dashboard thành công.
- [ ] **TC_ADMIN_DASHBOARD_02:** Dashboard hiển thị thống kê tổng quan.
- [ ] **TC_ADMIN_DASHBOARD_03:** Dashboard hiển thị số lượng user nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_DASHBOARD_04:** Dashboard hiển thị số lượng sản phẩm nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_DASHBOARD_05:** Dashboard hiển thị số lượng alert/wishlist nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_DASHBOARD_06:** Không có lỗi layout trên desktop.
- [ ] **TC_ADMIN_DASHBOARD_07:** Không có lỗi console nghiêm trọng khi mở dashboard.

---

## 3. Product Management

- [ ] **TC_ADMIN_PRODUCT_01:** Admin xem được danh sách sản phẩm.
- [ ] **TC_ADMIN_PRODUCT_02:** Admin tìm kiếm sản phẩm trong trang quản lý.
- [ ] **TC_ADMIN_PRODUCT_03:** Admin xem chi tiết sản phẩm.
- [ ] **TC_ADMIN_PRODUCT_04:** Admin thêm sản phẩm mới nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_PRODUCT_05:** Admin chỉnh sửa thông tin sản phẩm nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_PRODUCT_06:** Admin xóa sản phẩm nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_PRODUCT_07:** Hệ thống báo lỗi khi nhập thiếu thông tin bắt buộc.
- [ ] **TC_ADMIN_PRODUCT_08:** Hệ thống báo lỗi khi nhập giá không hợp lệ.
- [ ] **TC_ADMIN_PRODUCT_09:** Danh sách sản phẩm cập nhật sau khi thêm/sửa/xóa.
- [ ] **TC_ADMIN_PRODUCT_10:** Không admin thì không thể thao tác quản lý sản phẩm.

---

## 4. User Management

- [ ] **TC_ADMIN_USER_01:** Admin xem được danh sách người dùng.
- [ ] **TC_ADMIN_USER_02:** Admin tìm kiếm người dùng theo email/tên nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_USER_03:** Admin xem chi tiết thông tin người dùng.
- [ ] **TC_ADMIN_USER_04:** Admin khóa/mở khóa tài khoản nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_USER_05:** Admin cập nhật vai trò người dùng nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_USER_06:** User thường không thể xem danh sách người dùng.
- [ ] **TC_ADMIN_USER_07:** Danh sách người dùng cập nhật sau khi thay đổi trạng thái.
- [ ] **TC_ADMIN_USER_08:** Hệ thống hiển thị thông báo khi thao tác thành công hoặc thất bại.

---

## 5. Price Alert Management

- [ ] **TC_ADMIN_ALERT_01:** Admin xem được danh sách price alerts.
- [ ] **TC_ADMIN_ALERT_02:** Admin lọc/tìm kiếm alert theo user hoặc sản phẩm nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_ALERT_03:** Admin xem chi tiết alert.
- [ ] **TC_ADMIN_ALERT_04:** Admin xóa alert nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_ALERT_05:** Danh sách alert cập nhật sau khi xóa.
- [ ] **TC_ADMIN_ALERT_06:** User thường không thể truy cập trang quản lý alert của admin.

---

## 6. Wishlist Management

- [ ] **TC_ADMIN_WISHLIST_01:** Admin xem được thống kê hoặc danh sách wishlist nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_WISHLIST_02:** Admin lọc wishlist theo user hoặc sản phẩm nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_WISHLIST_03:** Admin xem được sản phẩm được yêu thích nhiều.
- [ ] **TC_ADMIN_WISHLIST_04:** User thường không thể truy cập trang quản lý wishlist của admin.

---

## 7. Marketplace / Source Management

- [ ] **TC_ADMIN_MARKET_01:** Admin xem được danh sách marketplace/source.
- [ ] **TC_ADMIN_MARKET_02:** Admin thêm marketplace/source mới nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_MARKET_03:** Admin chỉnh sửa thông tin marketplace/source nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_MARKET_04:** Admin xóa marketplace/source nếu hệ thống hỗ trợ.
- [ ] **TC_ADMIN_MARKET_05:** Hệ thống báo lỗi khi nhập thiếu thông tin bắt buộc.
- [ ] **TC_ADMIN_MARKET_06:** Danh sách marketplace/source cập nhật sau khi thao tác.

---

## 8. System / Logs / Error Handling

- [ ] **TC_ADMIN_SYSTEM_01:** Admin xem được log hoặc trạng thái hệ thống nếu có.
- [ ] **TC_ADMIN_SYSTEM_02:** Hệ thống hiển thị lỗi phù hợp khi API lỗi.
- [ ] **TC_ADMIN_SYSTEM_03:** Hệ thống không bị crash khi backend không phản hồi.
- [ ] **TC_ADMIN_SYSTEM_04:** Các thao tác admin có thông báo thành công/thất bại rõ ràng.
- [ ] **TC_ADMIN_SYSTEM_05:** Không có lỗi console nghiêm trọng khi thao tác trong admin panel.

---

# 🐛 Kết quả & Ghi chú lỗi

## Lỗi phát hiện

| STT | Test Case ID | Mô tả lỗi | Mức độ                         | Ảnh/Log | Trạng thái                     |
| --- | ------------ | --------- | ------------------------------ | ------- | ------------------------------ |
| 1   |              |           | Low / Medium / High / Critical |         | Open / Fixed / Retest / Closed |
| 2   |              |           | Low / Medium / High / Critical |         | Open / Fixed / Retest / Closed |
| 3   |              |           | Low / Medium / High / Critical |         | Open / Fixed / Retest / Closed |

## Kết luận

- [ ] Tất cả test case User đã pass.
- [ ] Tất cả test case Admin đã pass.
- [ ] Có lỗi nhưng không ảnh hưởng nghiêm trọng đến luồng chính.
- [ ] Có lỗi nghiêm trọng cần sửa trước khi release.

**Kết quả cuối cùng:** Pass / Fail / Pending
