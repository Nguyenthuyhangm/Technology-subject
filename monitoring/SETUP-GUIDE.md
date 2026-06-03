# Hướng dẫn chạy Monitoring Stack — PriceHawk trên Ubuntu headless

## Kết luận nhanh

Monitoring stack có thể chạy trên Ubuntu server không có giao diện nếu bạn dùng Docker Engine + Docker Compose plugin.

Để đọc đủ số liệu, backend cần có:

- `spring-boot-starter-actuator`
- `micrometer-registry-prometheus`

Sau khi sửa backend, Prometheus sẽ đọc được:

- system metrics từ `node-exporter`
- health check từ `/actuator/health`
- metrics ứng dụng từ `/actuator/prometheus`
- probe availability từ `blackbox-exporter`

## Cần cài gì trên Ubuntu

- Docker Engine
- Docker Compose plugin
- `curl`

Nếu muốn truy cập dashboard từ máy cá nhân, bạn có thể mở port hoặc dùng SSH tunnel. Server không cần GUI.

## Bước 1 — Tạo file `.env`

```bash
cd monitoring
cp .env.example .env
```

Nếu máy bạn chưa có `.env.example`, file mẫu này đã được bổ sung trong thư mục `monitoring/`.

## Bước 2 — Chạy monitoring stack

```bash
cd monitoring
docker compose --profile linux up -d
```

`--profile linux` sẽ bật `node-exporter` cho Ubuntu.

Kiểm tra service:

```bash
docker compose ps
```

## Bước 3 — Kiểm tra backend metrics

Backend phải chạy và publish port `8080` ra host. Sau đó kiểm tra:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus | head -20
```

Nếu hai lệnh trên chưa ra dữ liệu, Prometheus sẽ không có đủ metric để hiển thị dashboard backend.

## Bước 4 — Kiểm tra Prometheus targets

```bash
curl http://localhost:9090/targets
```

Các target nên thấy `UP`:

| Target | Mục đích |
|--------|----------|
| `prometheus` | Tự giám sát |
| `node-exporter` | CPU / RAM / Disk của Ubuntu |
| `backend-api` | Metrics Spring Boot |
| `blackbox-http` | Probe HTTP health |

## Bước 5 — Truy cập Grafana khi server không có GUI

### Cách 1: mở port trực tiếp trên browser của máy cá nhân

```text
http://<server-ip>:3000
http://<server-ip>:9090
```

### Cách 2: dùng SSH tunnel, an toàn hơn

```bash
ssh -L 3000:localhost:3000 -L 9090:localhost:9090 user@<server-ip>
```

Sau đó mở trên máy cá nhân:

- `http://localhost:3000`
- `http://localhost:9090`

Thông tin đăng nhập Grafana mặc định:

- user: `admin`
- password: `admin123` hoặc giá trị `GRAFANA_PASSWORD` trong `.env`

## Ghi chú quan trọng

- `windows_exporter` không cần dùng trên Ubuntu.
- `node-exporter` đã nằm sẵn trong `monitoring/docker-compose.yml`, chỉ cần bật profile `linux`.
- Nếu backend chưa bật Actuator/Micrometer, dashboard sẽ chỉ có phần system metrics và probe, không có số liệu HTTP request/latency của ứng dụng.

## Lệnh hữu ích

```bash
# Xem logs
docker compose logs grafana --tail=50
docker compose logs prometheus --tail=50
docker compose logs blackbox-exporter --tail=50

# Restart một service
docker compose restart grafana

# Dừng toàn bộ stack
docker compose down

# Reload Prometheus config không cần restart
curl -X POST http://localhost:9090/-/reload
```
