// 从 URL 下载图片并转换为 base64
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert image to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

// 服务器端图片保存功能
export async function saveImageToServer(imageDataUrl: string, filename?: string): Promise<string> {
    // 检查是否在服务器环境中
    if (typeof window !== 'undefined') {
        // 浏览器环境，跳过保存
        console.log('Browser environment detected, skipping server-side image save');
        return '';
    }
    
    try {
        // Node.js/服务器环境
        const fs = await import('fs');
        const path = await import('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = filename || `generated-image-${timestamp}.png`;
        
        // 确保 data 目录存在
        const dataDir = '/app/data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const outputPath = path.join(dataDir, finalFilename);
        
        let buffer: Buffer;
        
        if (imageDataUrl.startsWith('http')) {
            // HTTP URL - 需要下载
            const response = await fetch(imageDataUrl);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else {
            // Base64 格式
            const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
        }
        
        // 保存文件
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`Image saved to server: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('Error saving image to server:', error);
        return '';
    }
}

// 自动保存函数 - 尝试服务器端保存，失败则静默忽略
export async function autoSaveImage(imageUrl: string, transformationTitle: string, step: 'single' | 'two-step' = 'single'): Promise<void> {
    if (!imageUrl) return;
    
    try {
        const timestamp = Date.now();
        const filename = `${step}-${transformationTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.png`;
        await saveImageToServer(imageUrl, filename);
    } catch (error) {
        // 静默忽略保存错误，不影响用户体验
        console.log('Auto-save skipped (normal in browser environment)');
    }
}