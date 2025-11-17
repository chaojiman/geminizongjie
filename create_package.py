import zipfile
import os

print("开始创建发布包...")

# 输出文件名
output_file = "gemini-summarizer-v1.3.0.zip"

# 如果输出文件已存在，删除它
if os.path.exists(output_file):
    os.remove(output_file)
    print("已删除旧的发布包")

# 创建ZIP文件
with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # 必需文件
    files_to_include = [
        'manifest.json',
        'background.js',
        'popup.html',
        'popup.js',
        'popup.css',
        'config.html',
        'config.js',
        'config.css',
        'content-extractor.js',
        'offscreen.html',
        'offscreen.js',
        'README.md'
    ]

    # 添加文件
    for file in files_to_include:
        if os.path.exists(file):
            zipf.write(file)
            print(f"  ✓ 添加文件: {file}")

    # 添加icons目录
    if os.path.exists('icons'):
        for root, dirs, files in os.walk('icons'):
            for file in files:
                if file.endswith(('.png', '.svg')):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path)
                    zipf.write(file_path, arcname)
                    print(f"  ✓ 添加图标: {arcname}")

# 显示结果
file_size = os.path.getsize(output_file) / 1024  # KB
print("\n发布包创建成功！")
print(f"  文件名: {output_file}")
print(f"  文件大小: {file_size:.2f} KB")
print("\n可以上传到 Chrome Web Store 了！")
