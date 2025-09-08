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
        
        // 提取 base64 数据
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
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
export async function autoSaveImage(imageDataUrl: string, transformationTitle: string, step: 'single' | 'two-step' = 'single'): Promise<void> {
    if (!imageDataUrl) return;
    
    try {
        const timestamp = Date.now();
        const filename = `${step}-${transformationTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.png`;
        await saveImageToServer(imageDataUrl, filename);
    } catch (error) {
        // 静默忽略保存错误，不影响用户体验
        console.log('Auto-save skipped (normal in browser environment)');
    }
}