// 本地图片存储功能
export async function saveImageLocally(imageDataUrl: string, filename?: string): Promise<string> {
    try {
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = filename || `generated-image-${timestamp}.png`;
        
        // 在浏览器环境中，我们无法直接写入文件系统
        // 但我们可以触发下载
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return finalFilename;
    } catch (error) {
        console.error('Error saving image locally:', error);
        throw new Error('Failed to save image locally');
    }
}

// 如果在 Node.js 环境中（服务端），可以使用以下代码保存到文件系统
export async function saveImageToServer(imageDataUrl: string, filename?: string): Promise<string> {
    if (typeof window !== 'undefined') {
        // 浏览器环境，使用下载
        return saveImageLocally(imageDataUrl, filename);
    }
    
    // 服务端环境
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = filename || `generated-image-${timestamp}.png`;
        const outputPath = path.join('./data', finalFilename);
        
        // 确保 data 目录存在
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // 提取 base64 数据
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 保存文件
        fs.writeFileSync(outputPath, buffer);
        
        return outputPath;
    } catch (error) {
        console.error('Error saving image to server:', error);
        throw new Error('Failed to save image to server');
    }
}