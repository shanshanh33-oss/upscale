#!/usr/bin/env python3
"""
将 waifu2x PyTorch 模型转换为 ONNX 格式
用法: python3 convert_waifu2x.py
"""

import os, sys, json, urllib.request

# 配置
ONNX_PATH = os.path.join(os.path.dirname(__file__), "public", "models", "waifu2x.onnx")
MODEL_URL = "https://github.com/nagadomi/waifu2x/raw/master/pytorch_models/upconv_7_photo.pth"

def download_file(url, path):
    """下载文件"""
    print(f"正在下载: {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        total = int(r.headers.get('content-length', 0))
        downloaded = 0
        with open(path, 'wb') as f:
            while True:
                chunk = r.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = downloaded * 100 / total
                    sys.stdout.write(f"\r  {downloaded//1024//1024}MB/{total//1024//1024}MB ({pct:.0f}%)")
                    sys.stdout.flush()
        print(f"\n  下载完成: {downloaded/1024/1024:.1f}MB")

def main():
    # 1. 确保 PyTorch 已安装
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        print("第一步: 安装 PyTorch（约 800MB，只需安装一次）")
        print("正在安装...")
        os.system("pip3 install torch --index-url https://download.pytorch.org/whl/cpu 2>&1 | tail -5")
        import torch
        import torch.nn as nn
        print("PyTorch 安装完成")

    # 2. 检查输出目录
    os.makedirs(os.path.dirname(ONNX_PATH), exist_ok=True)

    # 3. 定义 waifu2x 模型结构
    class Waifu2xUpconv7(nn.Module):
        """Waifu2x UpConv_7 照片放大模型（2x 放大）"""
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(3, 16, 3, stride=2, padding=1)
            self.conv2 = nn.Conv2d(16, 32, 3, stride=2, padding=1)
            self.conv3 = nn.Conv2d(32, 64, 3, dilation=2, padding=2)
            self.conv4 = nn.Conv2d(64, 128, 3, dilation=2, padding=2)
            self.conv5 = nn.Conv2d(128, 128, 3, dilation=2, padding=2)
            self.conv6 = nn.Conv2d(128, 256, 3, padding=1)
            self.conv7 = nn.ConvTranspose2d(256, 3, 4, stride=2, padding=1)
            self.relu = nn.LeakyReLU(0.1, inplace=True)

        def forward(self, x):
            x = self.relu(self.conv1(x))
            x = self.relu(self.conv2(x))
            x = self.relu(self.conv3(x))
            x = self.relu(self.conv4(x))
            x = self.relu(self.conv5(x))
            x = self.relu(self.conv6(x))
            x = self.conv7(x)
            return x

    model = Waifu2xUpconv7()
    model.eval()

    # 4. 下载预训练权重
    weights_path = "/tmp/upconv_7_photo.pth"
    if not os.path.exists(weights_path):
        download_file(MODEL_URL, weights_path)

    # 5. 加载权重
    print("加载权重...")
    state_dict = torch.load(weights_path, map_location='cpu', weights_only=True)

    # 打印权重键名，看看是否匹配
    print(f"模型权重数: {len(state_dict)}")
    for k, v in list(state_dict.items())[:10]:
        print(f"  {k}: {v.shape}")

    # 尝试加载
    try:
        model.load_state_dict(state_dict)
        print("权重加载成功!")
    except Exception as e:
        print(f"直接加载失败: {e}")
        print("尝试映射键名...")
        # 可能键名不匹配，尝试修复
        new_state = {}
        model_keys = list(model.state_dict().keys())
        state_keys = list(state_dict.keys())
        print(f"模型键: {model_keys}")
        print(f"权重键: {state_keys}")
        # 如果数量匹配且顺序匹配，直接赋值
        if len(model_keys) == len(state_keys):
            for mk, sk in zip(model_keys, state_keys):
                if model.state_dict()[mk].shape == state_dict[sk].shape:
                    new_state[mk] = state_dict[sk]
                else:
                    print(f"  形状不匹配: {mk} {model.state_dict()[mk].shape} vs {sk} {state_dict[sk].shape}")
            model.load_state_dict(new_state)
            print("权重映射加载成功!")

    # 6. 导出 ONNX
    print("导出 ONNX...")
    dummy_input = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model, dummy_input, ONNX_PATH,
        input_names=['input'],
        output_names=['output'],
        opset_version=11,
        do_constant_folding=True,
    )

    file_size = os.path.getsize(ONNX_PATH)
    print(f"\nONNX 导出成功!")
    print(f"位置: {ONNX_PATH}")
    print(f"大小: {file_size/1024/1024:.1f} MB")
    print(f"\n现在可以测试了:")
    print(f"1. 将 waifu2x.onnx 放到项目 public/models/ 目录")
    print(f"2. 启动 Vite: npm run dev")
    print(f"3. 打开页面使用 AI 放大")

if __name__ == '__main__':
    main()
