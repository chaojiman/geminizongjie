#!/bin/bash
# Bash 脚本：创建发布用的ZIP包
# 使用方法：在项目根目录运行 ./package-release.sh

set -e

echo "开始创建发布包..."

# 输出文件名
OUTPUT_FILE="gemini-summarizer-v1.3.0.zip"

# 如果输出文件已存在，删除它
if [ -f "$OUTPUT_FILE" ]; then
    rm -f "$OUTPUT_FILE"
    echo "已删除旧的发布包"
fi

# 创建临时目录
TEMP_DIR="temp-release"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "复制文件到临时目录..."

# 复制必需文件
cp manifest.json "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
cp config.html "$TEMP_DIR/"
cp config.js "$TEMP_DIR/"
cp config.css "$TEMP_DIR/"
cp content-extractor.js "$TEMP_DIR/"
cp offscreen.html "$TEMP_DIR/"
cp offscreen.js "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"

# 复制图标目录
if [ -d "icons" ]; then
    cp -r icons "$TEMP_DIR/"
fi

echo "创建ZIP包..."
cd "$TEMP_DIR"
zip -r "../$OUTPUT_FILE" . -q
cd ..

# 清理临时目录
rm -rf "$TEMP_DIR"

# 显示结果
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "发布包创建成功！"
echo "  文件名: $OUTPUT_FILE"
echo "  文件大小: $FILE_SIZE"
echo ""
echo "可以上传到 Chrome Web Store 了！"

