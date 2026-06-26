#!/bin/bash
# 下载 waifu2x AI 模型文件
# 运行方式: bash download_model.sh

MODEL_DIR="public/models"
mkdir -p "$MODEL_DIR"

echo "正在下载 waifu2x ONNX 模型..."
echo ""

# 目标路径
TARGET="$MODEL_DIR/waifu2x_v3.onnx"

# 尝试多个源下载模型文件
SOURCES=(
    "https://github.com/deepghs/waifu2x_onnx/releases/latest/download/waifu2x_v3.onnx"
    "https://huggingface.co/nagiwaifu/waifu2x/resolve/main/waifu2x_v3.onnx"
)

for url in "${SOURCES[@]}"; do
    echo "尝试: $url"
    if command -v curl &>/dev/null; then
        curl -sL -o "$TARGET" "$url" && {
            SIZE=$(stat -f%z "$TARGET" 2>/dev/null || stat -c%s "$TARGET" 2>/dev/null)
            echo "下载成功! 文件大小: $(echo "scale=1; $SIZE/1024/1024" | bc) MB"
            exit 0
        }
    elif command -v wget &>/dev/null; then
        wget -q -O "$TARGET" "$url" && {
            SIZE=$(stat -f%z "$TARGET" 2>/dev/null || stat -c%s "$TARGET" 2>/dev/null)
            echo "下载成功! 文件大小: $(echo "scale=1; $SIZE/1024/1024" | bc) MB"
            exit 0
        }
    fi
    echo "  失败"
done

echo ""
echo "所有源都下载失败。请手动下载模型文件:"
echo "1. 打开 https://github.com/deepghs/waifu2x_onnx/releases"
echo "2. 下载 waifu2x_v3.onnx 文件"
echo "3. 放到 $MODEL_DIR/ 目录下"
echo ""
echo "或者用 Python 下载:"
echo "  pip install huggingface-hub"
echo "  huggingface-cli download nagiwaifu/waifu2x waifu2x_v3.onnx --local-dir $MODEL_DIR"
