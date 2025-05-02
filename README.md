# WhatsApp 消息发送机器人
#by：xiaomao
whatsapp：+7 707 217 37 07
！！！感谢chatgpt的意见和代码优化！！！
本项目基于 [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) 实现，通过网页界面批量发送 WhatsApp 消息，支持联系人/群聊多选、头像显示、消息日志、扫码登录等功能。

## 功能特色

- 支持扫码登录 WhatsApp
- 支持批量选择联系人或群成员发送消息
- 支持显示联系人/群成员头像
- 支持消息发送日志、清空日志
- 支持一键退出登录
- 支持多账号、多群聊

## 依赖环境与安装

### 必须依赖

- Node.js 16+
- Chrome 或 Chromium 浏览器（puppeteer 默认使用）

### 主要依赖包

- [express](https://www.npmjs.com/package/express)
- [whatsapp-web.js](https://www.npmjs.com/package/whatsapp-web.js)
- [puppeteer](https://www.npmjs.com/package/puppeteer)
- [qrcode](https://www.npmjs.com/package/qrcode)
- 其它依赖见 `package.json`

### 安装依赖

```bash
npm install
```

## 快速开始

1. 克隆项目

    ```bash
    git clone https://github.com/你的用户名/whatsapp-bot-web.git
    cd whatsapp-bot-web
    ```

2. 安装依赖

    ```bash
    npm install
    ```

3. 启动服务

    ```bash
    node server.js
    ```

4. 打开网页

    浏览器访问 [http://localhost:1451](http://localhost:1451)

5. 扫码登录

    首次启动会自动生成二维码，使用你的 WhatsApp 手机客户端扫码登录。

---

## 清理缓存和无用文件

如遇到二维码无法显示、登录异常、需要重置环境等情况，可按如下方式清理缓存和无用文件：

```bash
# 停止服务后执行
rm -rf .wwebjs_cache .wwebjs_auth logs node_modules
npm install
```

- `.wwebjs_cache/`：whatsapp-web.js 的临时缓存
- `.wwebjs_auth/`：whatsapp-web.js 的本地认证信息
- `logs/`：消息日志（如需保留请勿删除）
- `node_modules/`：依赖包目录（如需重新安装依赖时可删除）

---

## 常见问题

- **二维码不显示？**  
  请检查 Node.js 控制台是否有报错，或尝试清空 `.wwebjs_auth` 和 `.wwebjs_cache` 目录后重启服务。

- **消息发送失败？**  
  请确保 WhatsApp 已登录，且目标号码为国际格式（如：8613800138000）。

- **如何退出登录？**  
  点击网页右上角"退出登录"按钮即可。

---

## 目录结构

```
├── public/           # 前端页面和静态资源
│   ├── index.html
│   ├── main.js
│   └── style.css
├── server.js         # 后端主程序
├── package.json
└── logs/             # 消息日志
```

---

## English Version

### WhatsApp Message Sender Bot

A web-based WhatsApp bulk message sender built with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js). Features include QR login, contact/group multi-select, avatar display, message logs, and more.

**See above for usage instructions.**

---

## License

MIT 