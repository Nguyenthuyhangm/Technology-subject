# Hướng dẫn chạy Monitoring Stack — PriceHawk

## Yêu cầu

- Docker Desktop đang chạy
- Port 3000, 9090, 9115 chưa bị dùng

---

## Bước 1 — Tạo file .env

```powershell
cd monitoring
copy .env.example .env
```

---

## Bước 2 — Khởi động stack

```powershell
cd monitoring
docker compose up -d prometheus grafana blackbox-exporter
```

Kiểm tra tất cả đang chạy:

```powershell
docker compose ps
```

---

## Bước 3 — Cài System Metrics (CPU / RAM / Disk)

Chọn theo hệ điều hành của bạn:

---

### Windows

**1. Tải windows_exporter:**

Vào link sau, tải file `windows_exporter-x.x.x-amd64.exe`:

```
https://github.com/prometheus-community/windows_exporter/releases/latest
```

Đổi tên file vừa tải thành `windows_exporter.exe`, lưu vào thư mục bất kỳ, ví dụ `D:\tools\`.

**2. Chạy:**

```powershell
cd D:\tools
.\windows_exporter.exe
```

Terminal sẽ hiện log và giữ nguyên — để mở terminal này.

**3. Kiểm tra:**

Mở browser vào `http://localhost:9182/metrics` — phải thấy hàng nghìn dòng text.

**4. (Tuỳ chọn) Cài như service để tự chạy khi khởi động:**

Mở PowerShell với quyền **Administrator**:

```powershell
cd D:\tools
.\windows_exporter.exe --service install
Start-Service windows_exporter
```

---

### Linux / Ubuntu

Node-exporter đã có trong docker-compose, chạy thêm lệnh sau:

```bash
cd monitoring
docker compose --profile linux up -d node-exporter
```

Kiểm tra:

```bash
curl http://localhost:9100/metrics | head -20
```

---

## Bước 4 — Truy cập và xem Dashboard

| Mục | URL | Tài khoản |
|-----|-----|-----------|
| **Grafana** (dashboard chính) | http://localhost:3000 | admin / admin123 |
| **Prometheus** (xem raw metrics) | http://localhost:9090 | không cần |

**Xem dashboard trong Grafana:**

1. Vào http://localhost:3000
2. Đăng nhập: `admin` / `admin123`
3. Menu trái → **Dashboards** → chọn **PriceHawk Overview**

**Xem targets Prometheus đang scrape:**

Vào http://localhost:9090/targets — kiểm tra các target sau:

| Target | Trạng thái |
|--------|-----------|
| prometheus | UP |
| backend-api | UP (khi Spring Boot đang chạy) |
| blackbox-http | UP |
| windows-exporter | UP (Windows — khi windows_exporter.exe đang chạy) |
| node-exporter | UP (Linux — khi chạy `--profile linux`) |

---

## Lệnh hữu ích

```powershell
# Xem logs một service
docker compose logs grafana --tail=50
docker compose logs prometheus --tail=50

# Restart một service
docker compose restart grafana

# Dừng toàn bộ stack
docker compose down

# Reload Prometheus config không cần restart
curl -X POST http://localhost:9090/-/reload
```
