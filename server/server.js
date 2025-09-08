const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 80;

// 根据环境选择数据目录
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '..', 'data');

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 服务静态文件 (前端)
const publicDir = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '..', 'dist');

if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}

// 图片保存 API
app.post('/api/save-image', async (req, res) => {
    try {
        const { imageUrl, filename, transformationTitle, step = 'single' } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Missing imageUrl' });
        }
        
        const timestamp = Date.now();
        const safeTitle = transformationTitle ? transformationTitle.replace(/[^a-zA-Z0-9]/g, '-') : 'generated';
        const finalFilename = filename || `${step}-${safeTitle}-${timestamp}.png`;
        
        let buffer;
        
        if (imageUrl.startsWith('http')) {
            // HTTP URL - 下载图片
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else if (imageUrl.startsWith('data:image')) {
            // Base64 格式
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            return res.status(400).json({ error: 'Invalid image format' });
        }
        
        const outputPath = path.join(DATA_DIR, finalFilename);
        fs.writeFileSync(outputPath, buffer);
        
        console.log(`Image saved to server: ${outputPath}`);
        res.json({ 
            success: true, 
            filename: finalFilename,
            path: outputPath,
            size: buffer.length
        });
        
    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).json({ error: 'Failed to save image', details: error.message });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dataDir: DATA_DIR });
});

// 列出已保存的图片
app.get('/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR).filter(file => 
            file.toLowerCase().endsWith('.png') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.jpeg')
        );
        res.json({ images: files });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ error: 'Failed to list images' });
    }
});

// SPA fallback - 将所有非 API 路由指向 index.html
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend not built');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Static files: ${publicDir}`);
});