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

// 浏览器端图片下载功能（开发环境使用）
async function downloadImageInBrowser(imageUrl: string, filename: string): Promise<void> {
    try {
        let downloadUrl: string;
        
        if (imageUrl.startsWith('http')) {
            // HTTP URL - 直接使用
            downloadUrl = imageUrl;
        } else if (imageUrl.startsWith('data:')) {
            // Base64 - 直接使用
            downloadUrl = imageUrl;
        } else {
            console.error('Invalid image URL format');
            return;
        }
        
        // 创建下载链接
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Image downloaded to browser: ${filename}`);
    } catch (error) {
        console.error('Error downloading image in browser:', error);
    }
}

// API 服务器端图片保存功能
async function saveImageViaAPI(imageUrl: string, filename?: string, transformationTitle?: string, step?: string): Promise<string> {
    try {
        // 根据环境选择 API 基础 URL
        const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
            ? 'http://localhost:3001'  // 开发环境
            : '';                      // 生产环境通过 nginx 代理
            
        const response = await fetch(`${apiBaseUrl}/api/save-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl,
                filename,
                transformationTitle,
                step
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`Image saved to server via API: ${result.filename}`);
            return result.path;
        } else {
            throw new Error(result.error || 'API save failed');
        }
    } catch (error) {
        console.error('Error saving image via API:', error);
        throw error;
    }
}

// 服务器端图片保存功能
export async function saveImageToServer(imageDataUrl: string, filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = filename || `generated-image-${timestamp}.png`;
    
    try {
        // 优先尝试 API 保存（Docker 环境）
        return await saveImageViaAPI(imageDataUrl, finalFilename);
    } catch (apiError) {
        console.log('API save failed, trying direct save:', apiError);
        
        // API 保存失败，尝试直接保存（Node.js 环境，不太可能成功）
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            const dataDir = '/app/data';
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            const outputPath = path.join(dataDir, finalFilename);
            
            let buffer: Buffer;
            
            if (imageDataUrl.startsWith('http')) {
                const response = await fetch(imageDataUrl);
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else {
                const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
                buffer = Buffer.from(base64Data, 'base64');
            }
            
            fs.writeFileSync(outputPath, buffer);
            console.log(`Image saved to server: ${outputPath}`);
            return outputPath;
        } catch (directError) {
            console.log('Direct save also failed, falling back to browser download');
            
            // 都失败了，回退到浏览器下载（开发环境）
            if (typeof window !== 'undefined') {
                await downloadImageInBrowser(imageDataUrl, finalFilename);
                return finalFilename;
            }
            
            console.error('All save methods failed:', directError);
            return '';
        }
    }
}

// 自动保存函数 - 尝试服务器端保存，失败则静默忽略
export async function autoSaveImage(imageUrl: string, transformationTitle: string, step: 'single' | 'two-step' = 'single'): Promise<void> {
    if (!imageUrl) return;
    
    try {
        const timestamp = Date.now();
        const filename = `${step}-${transformationTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.png`;
        
        // 优先尝试 API 保存
        await saveImageViaAPI(imageUrl, filename, transformationTitle, step);
    } catch (error) {
        // 静默忽略保存错误，不影响用户体验
        console.log('Auto-save failed (this is normal in development environment):', error.message);
    }
}