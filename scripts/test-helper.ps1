# PriceHawk Testing Helper Script
# Chạy script này để setup môi trường test

# ====== CÀI ĐẶT MÔI TRƯỜNG ======

# 1. Kiểm tra và cài GitHub CLI nếu chưa có
Write-Host "=== 1. Kiểm tra GitHub CLI ===" -ForegroundColor Cyan
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "GitHub CLI chưa được cài. Vui lòng cài đặt:" -ForegroundColor Yellow
    Write-Host "winget install GitHub.cli" -ForegroundColor White
    Write-Host "Sau đó chạy: gh auth login" -ForegroundColor White
} else {
    Write-Host "GitHub CLI: OK" -ForegroundColor Green
}

# 2. Kiểm tra Elasticsearch
Write-Host "`n=== 2. Kiểm tra Elasticsearch ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9200" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "Elasticsearch: OK (Running on port 9200)" -ForegroundColor Green
} catch {
    Write-Host "Elasticsearch: CHƯA CHẠY" -ForegroundColor Yellow
    Write-Host "Cần cài Elasticsearch: https://www.elastic.co/downloads/elasticsearch" -ForegroundColor White
}

# 3. Kiểm tra Docker (thay thế cho Elasticsearch local)
Write-Host "`n=== 3. Kiểm tra Docker ===" -ForegroundColor Cyan
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerInstalled) {
    Write-Host "Docker: Available" -ForegroundColor Green
    Write-Host "Có thể chạy Elasticsearch qua Docker:" -ForegroundColor White
    Write-Host "docker run -p 9200:9200 -e discovery.type=single-node elasticsearch:8.13.4" -ForegroundColor White
} else {
    Write-Host "Docker: Không tìm thấy" -ForegroundColor Yellow
}

# ====== KHỞI ĐỘNG ỨNG DỤNG ======

Write-Host "`n=== Khởi động Backend ===" -ForegroundColor Cyan
Write-Host "1. Mở terminal mới" -ForegroundColor White
Write-Host "2. cd backend" -ForegroundColor White
Write-Host "3. .\mvnw.cmd spring-boot:run" -ForegroundColor White

Write-Host "`n=== Khởi động Frontend ===" -ForegroundColor Cyan
Write-Host "1. Mở terminal mới" -ForegroundColor White
Write-Host "2. cd frontend" -ForegroundColor White
Write-Host "3. npm run dev" -ForegroundColor White

Write-Host "`n=== Truy cập ứng dụng ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://localhost:8080" -ForegroundColor White
Write-Host "Swagger UI: http://localhost:8080/swagger-ui.html" -ForegroundColor White

# ====== TẠO GITHUB ISSUE ======

Write-Host "`n=== Tạo GitHub Issue ===" -ForegroundColor Cyan
Write-Host "Sau khi test và phát hiện bug, chạy lệnh sau:" -ForegroundColor White
Write-Host ""
Write-Host 'gh issue create --title "[BUG] Mo ta loi" --body "Mo ta chi tiet..." --label bug' -ForegroundColor Yellow
Write-Host ""
Write-Host "Hoặc sử dụng file .github/ISSUE_TEMPLATE/bug_report.yml đã được tạo sẵn" -ForegroundColor White
