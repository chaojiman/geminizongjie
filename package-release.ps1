# PowerShell 脚本：创建发布用的ZIP包
# 使用方法：在项目根目录运行 .\package-release.ps1

$ErrorActionPreference = "Stop"

Write-Host "开始创建发布包..." -ForegroundColor Green

# 定义要包含的文件和目录
$includeFiles = @(
    "manifest.json",
    "background.js",
    "popup.html",
    "popup.js",
    "popup.css",
    "config.html",
    "config.js",
    "config.css",
    "content-extractor.js",
    "offscreen.html",
    "offscreen.js",
    "icons",
    "README.md"
)

# 定义要排除的文件和目录
$excludePatterns = @(
    "*.git*",
    "node_modules",
    "*.DS_Store",
    "*.md",
    "store-assets",
    "*.ps1",
    "*.sh",
    "BUGFIX*.md",
    "CHANGELOG.md",
    "CODE_REVIEW.md",
    "FINAL_SOLUTION.md",
    "IMPROVEMENTS_SUMMARY.md",
    "INSTALL.md",
    "PROJECT_SUMMARY.md",
    "PROMPT_CONFIG_GUIDE.md",
    "PUBLISH.md",
    "QUICKSTART.md",
    "TEST*.md",
    "UPDATE_NOTES.md",
    "icon-generator.html",
    "RELEASE_CHECKLIST.md",
    "STORE_*.md",
    "STORE_*.txt"
)

# 输出文件名
$outputFile = "gemini-summarizer-v1.3.0.zip"

# 如果输出文件已存在，删除它
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
    Write-Host "已删除旧的发布包" -ForegroundColor Yellow
}

# 创建临时目录
$tempDir = "temp-release"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "复制文件到临时目录..." -ForegroundColor Cyan

# 复制文件
foreach ($item in $includeFiles) {
    if (Test-Path $item) {
        if (Test-Path $item -PathType Container) {
            # 是目录
            Copy-Item -Path $item -Destination $tempDir -Recurse -Force
            Write-Host "  ✓ 复制目录: $item" -ForegroundColor Gray
        } else {
            # 是文件
            Copy-Item -Path $item -Destination $tempDir -Force
            Write-Host "  ✓ 复制文件: $item" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠ 文件不存在: $item" -ForegroundColor Yellow
    }
}

# 创建ZIP文件
Write-Host "创建ZIP包..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputFile -Force

# 清理临时目录
Remove-Item $tempDir -Recurse -Force

# 显示结果
$fileSize = (Get-Item $outputFile).Length / 1MB
Write-Host "`n发布包创建成功！" -ForegroundColor Green
Write-Host "  文件名: $outputFile" -ForegroundColor White
Write-Host "  文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
Write-Host "`n可以上传到 Chrome Web Store 了！" -ForegroundColor Green

