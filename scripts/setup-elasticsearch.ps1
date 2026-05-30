# Quick Elasticsearch Setup Script
# Chạy script này để cài và chạy Elasticsearch nhanh nhất

param(
    [string]$InstallPath = "$env:USERPROFILE\elasticsearch"
)

Write-Host "=== PriceHawk: Elasticsearch Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check if Elasticsearch is already running
Write-Host "1. Checking if Elasticsearch is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9200" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ Elasticsearch is already running!" -ForegroundColor Green
    Write-Host "   Backend có thể khởi động được rồi!" -ForegroundColor Green
    return
} catch {
    Write-Host "   Elasticsearch chưa chạy" -ForegroundColor Gray
}

# 2. Check if Elasticsearch is installed
$esBat = Join-Path $InstallPath "bin\elasticsearch.bat"
if (Test-Path $esBat) {
    Write-Host "2. Elasticsearch found at: $InstallPath" -ForegroundColor Yellow
} else {
    Write-Host "2. Elasticsearch not found. Need to download..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== TẢI ELASTICSEARCH ===" -ForegroundColor Cyan
    Write-Host "Vui lòng làm theo các bước sau:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Tải Elasticsearch 8.13.4:" -ForegroundColor White
    Write-Host "   https://www.elastic.co/downloads/past-releases/elasticsearch-8-13-4" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Giải nén vào: $InstallPath" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Chạy lại script này" -ForegroundColor White
    Write-Host ""
    Write-Host "HOẶC chạy trực tiếp:" -ForegroundColor Yellow
    Write-Host "   cd $InstallPath\bin" -ForegroundColor Gray
    Write-Host "   .\elasticsearch.bat" -ForegroundColor Gray
    
    # Offer to open download page
    $choice = Read-Host "`nMở trang tải Elasticsearch? (y/n)"
    if ($choice -eq 'y') {
        Start-Process "https://www.elastic.co/downloads/past-releases/elasticsearch-8-13-4"
    }
    return
}

# 3. Start Elasticsearch
Write-Host "3. Starting Elasticsearch..." -ForegroundColor Yellow
Write-Host "   (Có thể mất 1-2 phút để khởi động)" -ForegroundColor Gray

$proc = Start-Process -FilePath $esBat -NoNewWindow -PassThru

# 4. Wait for Elasticsearch to be ready
Write-Host "4. Waiting for Elasticsearch to be ready..." -ForegroundColor Yellow
$maxWait = 120
$waited = 0

while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 5
    $waited += 5
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9200" -TimeoutSec 3 -ErrorAction Stop
        Write-Host ""
        Write-Host "✓ Elasticsearch is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "=== TIẾP THEO ===" -ForegroundColor Cyan
        Write-Host "1. Khởi động Backend: cd backend; .\mvnw.cmd spring-boot:run" -ForegroundColor White
        Write-Host "2. Khởi động Frontend: cd frontend; npm run dev" -ForegroundColor White
        Write-Host "3. Mở trình duyệt: http://localhost:5173" -ForegroundColor White
        return
    } catch {
        Write-Host "   Đang chờ... ($waited/$maxWait giây)" -ForegroundColor Gray -NoNewline
    }
}

Write-Host ""
Write-Host "⚠ Elasticsearch khởi động chậm. Có thể mất 2-3 phút." -ForegroundColor Yellow
Write-Host "Kiểm tra cửa sổ Elasticsearch đang chạy." -ForegroundColor Yellow
