// WhatsApp状态映射
const whatsappStateMap = {
    CONNECTED: { text: '已连接', color: 'connected' },
    OPENING: { text: '正在连接', color: 'pending' },
    TIMEOUT: { text: '超时', color: 'error' },
    UNPAIRED: { text: '未配对', color: 'warning' },
    UNLAUNCHED: { text: '未启动', color: 'warning' },
    UNKNOWN: { text: '未知', color: 'error' }
};

// 检查登录状态
async function checkLoginStatus() {
    try {
        const response = await fetch('/login-status');
        const data = await response.json();
        
        // 更新WhatsApp连接状态
        const whatsappStatus = document.getElementById('whatsappStatus');
        let stateInfo = whatsappStateMap[data.state] || { text: data.state, color: 'error' };
        whatsappStatus.textContent = stateInfo.text;
        whatsappStatus.className = `status-value ${stateInfo.color}`;
        
        // 更新登录状态
        const loginStatus = document.getElementById('loginStatus');
        loginStatus.textContent = data.isLoggedIn ? '已登录' : '未登录';
        loginStatus.className = `status-value ${data.isLoggedIn ? 'logged-in' : 'logged-out'}`;
        
        // 控制二维码显示和退出按钮
        const qrContainer = document.getElementById('qrContainer');
        const logoutBtn = document.getElementById('logoutBtn');
        if (!data.isLoggedIn && data.qrExists) {
            qrContainer.style.display = 'block';
            logoutBtn.style.display = 'none';
        } else {
            qrContainer.style.display = 'none';
            logoutBtn.style.display = data.isLoggedIn ? 'inline-block' : 'none';
        }
        
        // 如果已登录，停止检查二维码状态
        if (data.isLoggedIn) {
            clearInterval(qrCheckInterval);
        }
    } catch (error) {
        console.error('检查登录状态时出错:', error);
    }
}

// 检查二维码状态
async function checkQRStatus() {
    try {
        const response = await fetch('/qr-status');
        const data = await response.json();
        
        if (data.qrExists) {
            const qrImage = document.getElementById('qrImage');
            qrImage.src = 'qr.png?' + new Date().getTime();
            qrImage.onerror = function() {
                console.error('加载二维码图片失败');
                document.getElementById('qrStatus').textContent = '加载二维码失败，请刷新页面重试';
            };
            qrImage.onload = function() {
                document.getElementById('qrStatus').textContent = '请使用WhatsApp扫描二维码登录';
            };
        } else {
            document.getElementById('qrStatus').textContent = '正在生成二维码...';
        }
    } catch (error) {
        console.error('检查二维码状态时出错:', error);
        document.getElementById('qrStatus').textContent = '检查二维码状态失败，请刷新页面重试';
    }
}

// 格式化手机号（移除所有空格）
function formatPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/\s+/g, '');
}

// 退出登录
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('已退出登录');
            location.reload();
        } else {
            alert('退出登录失败: ' + data.message);
        }
    } catch (error) {
        console.error('退出登录时出错:', error);
        alert('退出登录时出错，请重试');
    }
}

// 清空日志
async function clearLogs() {
    if (!confirm('确定要清空所有日志吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/clear-logs', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            loadLogs();
            alert('日志已清空');
        } else {
            alert('清空日志失败: ' + data.message);
        }
    } catch (error) {
        console.error('清空日志时出错:', error);
        alert('清空日志时出错，请重试');
    }
}

// 多选渲染工具
function renderMultiSelect(list, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    list.forEach(item => {
        const label = document.createElement('label');
        label.className = 'multi-select-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item.id;
        checkbox.dataset.name = item.name;
        checkbox.dataset.avatar = item.avatar || '';
        label.appendChild(checkbox);
        if (item.avatar) {
            const img = document.createElement('img');
            img.src = item.avatar;
            img.className = 'avatar';
            img.alt = '头像';
            label.appendChild(img);
        }
        const span = document.createElement('span');
        span.textContent = item.name;
        label.appendChild(span);
        container.appendChild(label);
    });
}

// 加载联系人
async function loadContacts() {
    const res = await fetch('/get-contacts');
    const data = await res.json();
    if (data.success) {
        renderMultiSelect(data.contacts, 'contactsMultiSelect');
    }
}

// 加载群聊和群成员
let allGroups = [];
async function loadGroups() {
    const res = await fetch('/get-groups-users');
    const data = await res.json();
    if (data.success) {
        allGroups = data.groups;
        const groupSelect = document.getElementById('groupSelect');
        groupSelect.innerHTML = '<option value="">-- 请选择群聊 --</option>';
        data.groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            groupSelect.appendChild(opt);
        });
    }
}

function loadGroupMembers() {
    const groupId = document.getElementById('groupSelect').value;
    const group = allGroups.find(g => g.id === groupId);
    if (group) {
        renderMultiSelect(group.members, 'groupMembersMultiSelect');
        document.getElementById('groupMembersMultiSelectContainer').style.display = 'block';
    } else {
        document.getElementById('groupMembersMultiSelectContainer').style.display = 'none';
    }
}

// 切换显示逻辑
function updateInputFields() {
    const chatType = document.getElementById('chatType').value;
    if (chatType === 'private') {
        document.getElementById('contactsMultiSelectContainer').style.display = 'block';
        document.getElementById('groupSelectionContainer').style.display = 'none';
        document.getElementById('groupMembersMultiSelectContainer').style.display = 'none';
        document.getElementById('phoneNumberContainer').style.display = 'block';
        loadContacts();
    } else {
        document.getElementById('contactsMultiSelectContainer').style.display = 'none';
        document.getElementById('groupSelectionContainer').style.display = 'block';
        document.getElementById('groupMembersMultiSelectContainer').style.display = 'none';
        document.getElementById('phoneNumberContainer').style.display = 'none';
        loadGroups();
    }
}

// 发送消息（批量）
async function sendMessage() {
    const chatType = document.getElementById('chatType').value;
    const message = document.getElementById('message').value;
    let targets = [];
    if (chatType === 'private') {
        // 联系人多选
        const checked = document.querySelectorAll('#contactsMultiSelect input[type=checkbox]:checked');
        checked.forEach(cb => targets.push(cb.value));
        // 也允许手动输入手机号
        const phoneNumber = formatPhoneNumber(document.getElementById('phoneNumber').value);
        if (phoneNumber) targets.push(phoneNumber);
    } else {
        // 群成员多选
        const checked = document.querySelectorAll('#groupMembersMultiSelect input[type=checkbox]:checked');
        checked.forEach(cb => targets.push(cb.value));
    }
    if (!message) {
        alert('请输入消息内容');
        return;
    }
    if (targets.length === 0) {
        alert('请选择至少一个用户或输入手机号');
        return;
    }
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = '正在批量发送消息...';
    statusDiv.className = 'status-pending';
    let successCount = 0;
    let failCount = 0;
    for (const target of targets) {
        try {
            const response = await fetch('/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: target,
                    message,
                    isGroup: false
                })
            });
            const data = await response.json();
            if (data.success) successCount++;
            else failCount++;
        } catch (e) {
            failCount++;
        }
    }
    statusDiv.textContent = `发送完成，成功：${successCount}，失败：${failCount}`;
    statusDiv.className = failCount === 0 ? 'status-success' : 'status-error';
    document.getElementById('message').value = '';
}

// 加载日志
async function loadLogs() {
    try {
        const response = await fetch('/get-logs');
        const data = await response.json();
        
        if (data.success) {
            const logsDiv = document.getElementById('logs');
            if (data.logs) {
                // 将日志按行分割并反转顺序（最新的在最上面）
                const logLines = data.logs.split('\n').filter(line => line.trim()).reverse();
                
                // 清空现有日志
                logsDiv.innerHTML = '';
                
                // 添加每条日志
                logLines.forEach(line => {
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    
                    // 解析时间戳和内容
                    const timestampMatch = line.match(/^\[(.*?)\]/);
                    if (timestampMatch) {
                        const timestamp = timestampMatch[1];
                        const content = line.slice(timestampMatch[0].length).trim();
                        
                        const timeSpan = document.createElement('span');
                        timeSpan.className = 'log-time';
                        timeSpan.textContent = timestamp;
                        
                        const contentSpan = document.createElement('div');
                        contentSpan.className = 'log-content';
                        contentSpan.textContent = content;
                        
                        logEntry.appendChild(timeSpan);
                        logEntry.appendChild(contentSpan);
                    } else {
                        logEntry.textContent = line;
                    }
                    
                    logsDiv.appendChild(logEntry);
                });
            } else {
                logsDiv.textContent = '暂无日志记录';
            }
        } else {
            console.error('获取日志失败:', data.message);
        }
    } catch (error) {
        console.error('加载日志时出错:', error);
    }
}

// 定期检查登录状态
setInterval(checkLoginStatus, 2000);

// 定期检查二维码状态
const qrCheckInterval = setInterval(checkQRStatus, 2000);

// 定期刷新日志
setInterval(loadLogs, 5000);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    checkQRStatus();
    loadLogs();
    updateInputFields();
}); 