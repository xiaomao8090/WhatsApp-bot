const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');

const app = express();
const port = 1451;

// 设置静态文件目录
app.use(express.static('public'));
app.use(express.json());

// 创建日志目录
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// 创建日志文件路径
const logFile = path.join(logDir, 'message_logs.txt');

// 日志记录函数
function logMessage(data) {
    try {
        const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        let logEntry = `[${timestamp}] `;
        
        // 格式化不同类型的日志
        if (data.action === '发送消息') {
            logEntry += `发送消息到${data.target.type} `;
            if (data.target.type === '群聊') {
                logEntry += `"${data.target.name}" (${data.target.participants}人)`;
            } else {
                logEntry += `"${data.target.phoneNumber}"`;
            }
            logEntry += `\n消息内容: ${data.message}\n`;
        } else if (data.action === '发送消息失败') {
            logEntry += `发送消息失败: ${data.error}\n`;
        } else if (data.action === 'WhatsApp状态') {
            logEntry += `WhatsApp状态: ${data.status}`;
            if (data.message) logEntry += ` - ${data.message}`;
            if (data.reason) logEntry += ` - ${data.reason}`;
            logEntry += '\n';
        } else if (data.action === '生成二维码') {
            logEntry += `二维码生成${data.status}`;
            if (data.error) logEntry += `: ${data.error}`;
            logEntry += '\n';
        }
        
        // 写入日志文件
        fs.appendFileSync(logFile, logEntry);
        console.log(logEntry.trim());
    } catch (error) {
        console.error('记录日志时出错:', error);
    }
}

// 创建WhatsApp客户端
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
});

// 客户端就绪
client.on('ready', () => {
    console.log('WhatsApp客户端已就绪！');
    logMessage({ action: 'WhatsApp状态', status: '已登录' });
});

// 客户端断开连接
client.on('disconnected', (reason) => {
    console.log('WhatsApp客户端已断开连接:', reason);
    logMessage({ action: 'WhatsApp状态', status: '已断开', reason: reason });
});

// 客户端认证失败
client.on('auth_failure', (msg) => {
    console.log('WhatsApp认证失败:', msg);
    logMessage({ action: 'WhatsApp状态', status: '认证失败', message: msg });
});

// 生成二维码
client.on('qr', async (qr) => {
    try {
        // 生成二维码图片
        const qrCodePath = path.join(__dirname, 'public', 'qr.png');
        console.log('正在生成二维码...');
        await qrcode.toFile(qrCodePath, qr, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300
        });
        console.log('二维码已生成，请扫描登录');
        logMessage({ action: '生成二维码', status: '成功' });
    } catch (error) {
        console.error('生成二维码时出错:', error);
        logMessage({ action: '生成二维码', status: '失败', error: error.message });
    }
});

// 初始化WhatsApp客户端
client.initialize();

// 获取二维码状态的路由
app.get('/qr-status', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    const qrExists = fs.existsSync(qrPath);
    res.json({ qrExists });
});

// 获取群聊列表的路由
app.get('/get-groups', async (req, res) => {
    try {
        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                participants: chat.participants.length
            }));
        
        res.json({ success: true, groups });
    } catch (error) {
        console.error('获取群聊列表时出错:', error);
        res.status(500).json({ success: false, message: '获取群聊列表失败' });
    }
});

// 获取所有群聊及成员（带头像）
app.get('/get-groups-users', async (req, res) => {
    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        const result = [];
        for (const group of groups) {
            const members = [];
            for (const p of group.participants) {
                let avatar = '';
                try {
                    avatar = await client.getProfilePicUrl(p.id._serialized);
                } catch (e) {}
                members.push({
                    id: p.id._serialized,
                    name: p.id.user,
                    avatar
                });
            }
            result.push({
                id: group.id._serialized,
                name: group.name,
                members
            });
        }
        res.json({ success: true, groups: result });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取群聊及成员失败', error: error.message });
    }
});

// 获取所有联系人（带头像）
app.get('/get-contacts', async (req, res) => {
    try {
        const contacts = await client.getContacts();
        const result = [];
        for (const c of contacts) {
            let avatar = '';
            try {
                avatar = await client.getProfilePicUrl(c.id._serialized);
            } catch (e) {}
            result.push({
                id: c.id._serialized,
                name: c.name || c.pushname || c.number || c.id.user,
                avatar
            });
        }
        res.json({ success: true, contacts: result });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取联系人失败', error: error.message });
    }
});

// 发送消息的路由
app.post('/send-message', async (req, res) => {
    try {
        const { phoneNumber, message, isGroup, groupName, selectedGroupId } = req.body;
        
        let chatId;
        let targetInfo = {};
        
        if (isGroup) {
            if (selectedGroupId) {
                // 使用选择的群聊ID
                chatId = selectedGroupId;
                const chats = await client.getChats();
                const group = chats.find(chat => chat.id._serialized === selectedGroupId);
                if (group) {
                    targetInfo = {
                        type: '群聊',
                        name: group.name,
                        id: selectedGroupId,
                        participants: group.participants.length
                    };
                }
            } else if (groupName) {
                // 通过群名称查找群聊
                const chats = await client.getChats();
                const group = chats.find(chat => 
                    chat.isGroup && chat.name.toLowerCase().includes(groupName.toLowerCase())
                );
                
                if (!group) {
                    return res.status(404).json({ 
                        success: false, 
                        message: '未找到匹配的群聊' 
                    });
                }
                
                chatId = group.id._serialized;
                targetInfo = {
                    type: '群聊',
                    name: group.name,
                    id: chatId,
                    participants: group.participants.length
                };
            } else {
                // 使用群聊ID
                chatId = phoneNumber.includes('@g.us') ? phoneNumber : `${phoneNumber}@g.us`;
                targetInfo = {
                    type: '群聊',
                    id: chatId
                };
            }
        } else {
            // 个人聊天ID格式
            chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
            targetInfo = {
                type: '私聊',
                phoneNumber: phoneNumber
            };
        }
        
        // 发送消息
        await client.sendMessage(chatId, message);
        
        // 记录发送日志
        const logData = {
            action: '发送消息',
            target: targetInfo,
            message: message,
            timestamp: new Date().toISOString()
        };
        logMessage(logData);
        
        res.json({ success: true, message: '消息发送成功！' });
    } catch (error) {
        console.error('发送消息时出错:', error);
        // 记录错误日志
        const logData = {
            action: '发送消息失败',
            error: error.message,
            timestamp: new Date().toISOString()
        };
        logMessage(logData);
        res.status(500).json({ success: false, message: '发送消息失败' });
    }
});

// 获取日志的路由
app.get('/get-logs', (req, res) => {
    try {
        if (fs.existsSync(logFile)) {
            const logs = fs.readFileSync(logFile, 'utf8');
            res.json({ success: true, logs: logs });
        } else {
            res.json({ success: true, logs: '暂无日志记录' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '获取日志失败' });
    }
});

// 获取登录状态的路由
app.get('/login-status', async (req, res) => {
    let isLoggedIn = false;
    let isConnected = false;
    let state = 'unknown';
    try {
        // 判断是否已登录
        isLoggedIn = !!client.info;
        // 获取连接状态
        if (client.getState) {
            state = await client.getState();
            isConnected = state === 'CONNECTED';
        }
    } catch (e) {
        isLoggedIn = false;
        isConnected = false;
        state = 'unknown';
    }
    res.json({
        isLoggedIn,
        isConnected,
        state,
        qrExists: fs.existsSync(path.join(__dirname, 'public', 'qr.png'))
    });
});

// 退出登录的路由
app.post('/logout', async (req, res) => {
    try {
        await client.logout();
        // 删除认证缓存
        const authDir = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authDir)) {
            fs.rmdirSync(authDir, { recursive: true });
        }
        res.json({ success: true, message: '已退出登录' });
    } catch (error) {
        console.error('退出登录时出错:', error);
        res.status(500).json({ success: false, message: '退出登录失败' });
    }
});

// 删除所有日志的路由
app.post('/clear-logs', (req, res) => {
    try {
        if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
            res.json({ success: true, message: '日志已清空' });
        } else {
            res.json({ success: true, message: '暂无日志记录' });
        }
    } catch (error) {
        console.error('清空日志时出错:', error);
        res.status(500).json({ success: false, message: '清空日志失败' });
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 