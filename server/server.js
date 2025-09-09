const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const UserManager = require('./UserManager');

const app = express();
const PORT = 80;

// 根据环境选择数据目录
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : path.join(__dirname, '..', 'data');

// 初始化用户管理器
const userManager = new UserManager(DATA_DIR);

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

// 用户认证中间件
function requireAuth(req, res, next) {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(401).json({ error: '请先登录' });
    }
    
    const userInfo = userManager.getUserInfo(phone);
    if (!userInfo) {
        return res.status(401).json({ error: '用户不存在，请重新登录' });
    }
    
    req.user = userInfo;
    next();
}

// 用户注册 API
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
        return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const result = userManager.registerUser(phone, password);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.message });
    }
});

// 用户登录 API
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
        return res.status(400).json({ error: '手机号和密码不能为空' });
    }
    
    const result = userManager.loginUser(phone, password);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.message });
    }
});

// 获取用户信息 API
app.post('/api/user-info', (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ error: '缺少手机号' });
    }
    
    const userInfo = userManager.getUserInfo(phone);
    
    if (userInfo) {
        res.json({ success: true, user: userInfo });
    } else {
        res.status(404).json({ error: '用户不存在' });
    }
});

// 管理员登录 API
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    // 从环境变量获取管理员凭据
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUsername && password === adminPassword) {
        res.json({ success: true, message: '管理员登录成功' });
    } else {
        res.status(401).json({ error: '用户名或密码错误' });
    }
});

// 管理员获取所有用户 API
app.get('/api/admin/users', (req, res) => {
    // 简单的管理员验证，生产环境应该使用更安全的方式
    const adminToken = req.headers['admin-token'];
    
    if (adminToken !== 'admin-secret-token') {
        return res.status(403).json({ error: '权限不足' });
    }
    
    const allUsers = userManager.getAllUsers();
    res.json(allUsers);
});

// 管理员重置用户使用次数 API
app.post('/api/admin/reset-uses', (req, res) => {
    const { phone, newUses } = req.body;
    const adminToken = req.headers['admin-token'];
    
    if (adminToken !== 'admin-secret-token') {
        return res.status(403).json({ error: '权限不足' });
    }
    
    const result = userManager.resetUserUses(phone, newUses);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json({ error: result.message });
    }
});

// 图片保存 API (需要用户认证)
app.post('/api/save-image', requireAuth, async (req, res) => {
    try {
        const { imageUrl, filename, transformationTitle, step = 'single', phone } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Missing imageUrl' });
        }

        // 检查用户剩余使用次数
        const userInfo = userManager.getUserInfo(phone);
        if (userInfo.remainingUses <= 0) {
            return res.status(403).json({ error: '生成次数已用完，请联系管理员' });
        }

        // 扣减使用次数
        const useResult = userManager.useGeneration(phone);
        if (!useResult.success) {
            return res.status(400).json({ error: useResult.message });
        }

        const timestamp = Date.now();
        const safeTitle = transformationTitle ? transformationTitle.replace(/[^a-zA-Z0-9]/g, '-') : 'generated';
        // 文件名格式：手机号-生成类型-标题-时间戳.png
        const finalFilename = filename || `${phone}-${step}-${safeTitle}-${timestamp}.png`;
        
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
        
        console.log(`Image saved by user ${phone}: ${outputPath}`);
        res.json({ 
            success: true, 
            filename: finalFilename,
            path: outputPath,
            size: buffer.length,
            remainingUses: useResult.remainingUses,
            imagesGenerated: useResult.imagesGenerated
        });
        
    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).json({ error: 'Failed to save image', details: error.message });
    }
});

// 获取用户图片历史 API
app.post('/api/user/images', requireAuth, (req, res) => {
    try {
        const { phone } = req.body;
        
        // 读取 data 目录中该用户的所有图片
        const files = fs.readdirSync(DATA_DIR).filter(file => {
            const isImageFile = file.toLowerCase().endsWith('.png') || 
                              file.toLowerCase().endsWith('.jpg') || 
                              file.toLowerCase().endsWith('.jpeg');
            const belongsToUser = file.startsWith(phone + '-');
            return isImageFile && belongsToUser;
        });

        // 按创建时间排序（最新的在前）
        const imageHistory = files.map(filename => {
            const filePath = path.join(DATA_DIR, filename);
            const stats = fs.statSync(filePath);
            
            // 解析文件名格式：手机号-生成类型-标题-时间戳.png
            const parts = filename.replace(/\.(png|jpg|jpeg)$/i, '').split('-');
            const phone_part = parts[0];
            const type = parts[1] || 'unknown';
            const title = parts.slice(2, -1).join('-') || 'generated';
            const timestamp = parts[parts.length - 1];

            // 生成可访问的图片URL - 使用相对路径，让浏览器自动添加域名
            const imageUrl = `/api/images/${filename}`;
            
            // 同时提供下载URL
            const downloadUrl = `/api/download/${filename}`;
            
            return {
                imageUrl,
                downloadUrl,
                filename,
                type,
                title,
                timestamp: parseInt(timestamp) || stats.ctimeMs,
                createdAt: stats.ctime,
                size: stats.size
            };
        }).sort((a, b) => b.timestamp - a.timestamp);

        res.json({
            success: true,
            images: imageHistory,
            count: imageHistory.length
        });
        
    } catch (error) {
        console.error('Error fetching user images:', error);
        res.status(500).json({ error: 'Failed to fetch user images', details: error.message });
    }
});

// 提供图片文件访问
app.get('/api/images/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(DATA_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // 检查文件是否为图片
        if (!filename.match(/\.(png|jpg|jpeg)$/i)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        
        // 设置正确的Content-Type和Content-Disposition头
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        }
        
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filename}"`,
            'Cache-Control': 'public, max-age=31536000', // 1年缓存
        });
        
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// 专门的下载API端点
app.get('/api/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(DATA_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        // 检查文件是否为图片
        if (!filename.match(/\.(png|jpg|jpeg)$/i)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }
        
        // 设置强制下载的Content-Disposition头
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        }
        
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).json({ error: 'Failed to download image' });
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