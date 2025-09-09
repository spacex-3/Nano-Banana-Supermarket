const fs = require('fs');
const path = require('path');

class UserManager {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.usersFile = path.join(dataDir, 'users.json');
        this.initUsersFile();
    }

    // 初始化用户文件
    initUsersFile() {
        if (!fs.existsSync(this.usersFile)) {
            const initialData = {
                users: {},
                admin: {
                    totalUsers: 0,
                    totalImages: 0
                }
            };
            fs.writeFileSync(this.usersFile, JSON.stringify(initialData, null, 2));
        }
    }

    // 读取用户数据
    loadUsers() {
        try {
            const data = fs.readFileSync(this.usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading users:', error);
            return { users: {}, admin: { totalUsers: 0, totalImages: 0 } };
        }
    }

    // 保存用户数据
    saveUsers(data) {
        try {
            fs.writeFileSync(this.usersFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }

    // 验证手机号格式
    validatePhone(phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    }

    // 用户注册
    registerUser(phone, username, password) {
        if (!this.validatePhone(phone)) {
            return { success: false, message: '请输入有效的手机号码' };
        }

        if (!username || username.trim().length < 2) {
            return { success: false, message: '用户名至少2个字符' };
        }

        if (!password || password.length < 6) {
            return { success: false, message: '密码至少6位' };
        }

        const data = this.loadUsers();
        
        if (data.users[phone]) {
            return { success: false, message: '手机号已注册' };
        }

        // 检查用户名是否已存在
        const existingUser = Object.values(data.users).find(user => 
            user.username && user.username.toLowerCase() === username.trim().toLowerCase()
        );
        if (existingUser) {
            return { success: false, message: '用户名已存在' };
        }

        // 创建新用户
        data.users[phone] = {
            phone: phone,
            username: username.trim(),
            password: password, // 生产环境中应该加密
            remainingUses: 10,
            createdAt: new Date().toISOString(),
            lastLoginAt: null,
            imagesGenerated: 0
        };

        data.admin.totalUsers++;

        if (this.saveUsers(data)) {
            return { 
                success: true, 
                message: '注册成功',
                user: {
                    phone: phone,
                    username: username.trim(),
                    remainingUses: 10
                }
            };
        } else {
            return { success: false, message: '注册失败，请稍后重试' };
        }
    }

    // 用户登录
    loginUser(phone, password) {
        if (!this.validatePhone(phone)) {
            return { success: false, message: '请输入有效的手机号码' };
        }

        const data = this.loadUsers();
        const user = data.users[phone];

        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        if (user.password !== password) {
            return { success: false, message: '密码错误' };
        }

        // 更新最后登录时间
        user.lastLoginAt = new Date().toISOString();
        this.saveUsers(data);

        return {
            success: true,
            message: '登录成功',
            user: {
                phone: user.phone,
                remainingUses: user.remainingUses,
                imagesGenerated: user.imagesGenerated
            }
        };
    }

    // 获取用户信息
    getUserInfo(phone) {
        const data = this.loadUsers();
        const user = data.users[phone];
        
        if (!user) {
            return null;
        }

        return {
            phone: user.phone,
            remainingUses: user.remainingUses,
            imagesGenerated: user.imagesGenerated,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        };
    }

    // 使用一次生成次数
    useGeneration(phone) {
        const data = this.loadUsers();
        const user = data.users[phone];

        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        if (user.remainingUses <= 0) {
            return { success: false, message: '生成次数已用完' };
        }

        user.remainingUses--;
        user.imagesGenerated++;
        data.admin.totalImages++;

        if (this.saveUsers(data)) {
            return { 
                success: true, 
                remainingUses: user.remainingUses,
                imagesGenerated: user.imagesGenerated
            };
        } else {
            return { success: false, message: '更新失败' };
        }
    }

    // 获取所有用户信息 (管理员功能)
    getAllUsers() {
        const data = this.loadUsers();
        const users = Object.values(data.users).map(user => ({
            phone: user.phone,
            password: user.password, // 管理员可以看到密码
            remainingUses: user.remainingUses,
            imagesGenerated: user.imagesGenerated,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        }));

        return {
            users: users,
            stats: {
                totalUsers: data.admin.totalUsers,
                totalImages: data.admin.totalImages
            }
        };
    }

    // 重置用户使用次数 (管理员功能)
    resetUserUses(phone, newUses = 10) {
        const data = this.loadUsers();
        const user = data.users[phone];

        if (!user) {
            return { success: false, message: '用户不存在' };
        }

        user.remainingUses = newUses;

        if (this.saveUsers(data)) {
            return { success: true, message: `用户 ${phone} 的使用次数已重置为 ${newUses}` };
        } else {
            return { success: false, message: '重置失败' };
        }
    }
}

module.exports = UserManager;