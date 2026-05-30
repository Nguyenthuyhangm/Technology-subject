# Script tạo GitHub Issue cho Bug Report
# Sử dụng: .\scripts\create-issue.ps1 -Title "Bug title" -Description "Desc" ...

param(
    [Parameter(Mandatory=$true)]
    [string]$Title,
    
    [Parameter(Mandatory=$true)]
    [string]$Description,
    
    [Parameter(Mandatory=$true)]
    [string]$Steps,
    
    [Parameter(Mandatory=$true)]
    [string]$Expected,
    
    [Parameter(Mandatory=$true)]
    [string]$Actual,
    
    [string]$Screenshot = "",
    
    [ValidateSet("Low", "Medium", "High", "Critical")]
    [string]$Priority = "Medium",
    
    [ValidateSet("Local Development", "Production", "Staging")]
    [string]$Environment = "Local Development",
    
    [string]$Browser = ""
)

# Build the issue body
$body = @"
## Mô tả
$Description

## Bước tái hiện
$Steps

## Kết quả mong đợi
$Expected

## Kết quả thực tế
$Actual
"@

if ($Screenshot) {
    $body += "`n`n## Screenshots`n$Screenshot"
}

$body += @"

---

## Môi trường
- **Mức ưu tiên:** $Priority
- **Môi trường:** $Environment
- **Browser:** $($Browser ? $Browser : 'Không xác định')
- **Ngày test:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

# Create the issue
$titleWithPrefix = "[BUG] $Title"

Write-Host "Creating issue: $titleWithPrefix" -ForegroundColor Cyan

$result = gh issue create `
    --title $titleWithPrefix `
    --body $body `
    --label bug `
    --repo Nguyenthuyhangm/Technology-subject 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Issue created successfully!" -ForegroundColor Green
    Write-Host "URL: $result" -ForegroundColor White
} else {
    Write-Host "Failed to create issue: $result" -ForegroundColor Red
}
