# Chrome Web Store 发布检查清单

## ✅ 代码准备

- [x] 删除重复函数（popup.js）
- [x] 清理所有 console.log 调试代码
- [x] 修复 CSS 样式问题
- [x] 验证功能正常
- [x] 无语法错误

## 📝 文案准备

- [x] 简短描述（132字符以内）
  - 文件：`STORE_SHORT_DESC.txt`
- [x] 详细描述（500-1000字）
  - 文件：`STORE_DESCRIPTION.md`
- [ ] 优化 manifest.json 中的 description

## 🎨 素材准备

### 必需素材
- [ ] **小型宣传图** (440x280)
  - 位置：`store-assets/promo-small.png`
- [ ] **功能截图1** (1280x800) - 主界面
  - 位置：`store-assets/screenshot1.png`
- [ ] **功能截图2** (1280x800) - 内容提取
  - 位置：`store-assets/screenshot2.png`
- [ ] **功能截图3** (1280x800) - Gemini效果
  - 位置：`store-assets/screenshot3.png`
- [ ] **功能截图4** (1280x800) - 配置管理（可选）
  - 位置：`store-assets/screenshot4.png`
- [ ] **功能截图5** (1280x800) - 使用场景（可选）
  - 位置：`store-assets/screenshot5.png`

### 可选素材
- [ ] 大型宣传图 (920x680 或 1400x560)
- [ ] 宣传视频（YouTube链接，60秒内）

## 🔒 隐私政策

- [x] 隐私政策文档已准备（PRIVACY.md）
- [ ] **隐私政策托管到可公开访问的URL**
  - 建议：GitHub Pages 或项目网站
  - URL格式：`https://yourusername.github.io/gemini-summarizer/privacy.html`

## 📦 打包准备

- [ ] 创建发布ZIP包
  - 排除文件：`.git/`, `node_modules/`, `*.md`（除README.md）, `.DS_Store`
  - 包含文件：所有必需的扩展文件、图标、manifest.json
- [ ] 验证ZIP包完整性
- [ ] 测试从ZIP包加载扩展

## 🏪 商店信息

### 基本信息
- [ ] 插件名称：`Gemini页面总结助手`
- [ ] 版本号：`1.1.0`
- [ ] 类别：生产力工具 (Productivity)
- [ ] 语言：中文（简体）、English（建议添加）

### 权限说明
- [ ] 准备权限使用说明：
  - `activeTab`: 读取当前标签页内容以提取文字和图片
  - `storage`: 保存用户设置（如打开方式偏好）
  - `scripting`: 注入内容提取脚本到页面
  - `tabs`: 创建和管理Gemini标签页
  - `offscreen`: 用于剪贴板操作

### 隐私实践
- [ ] 数据使用披露：
  - 不收集数据
  - 不出售用户数据
  - 不用于非核心功能

## 📋 上传前检查

- [ ] 所有功能正常工作
- [ ] 在不同网站测试过
- [ ] 错误处理完善
- [ ] 权限说明清晰
- [ ] 图标清晰专业
- [ ] 截图展示到位
- [ ] 描述准确完整
- [ ] 隐私政策合规
- [ ] 代码无混淆
- [ ] 无远程加载脚本

## 🚀 发布步骤

1. **注册开发者账号**
   - 访问 [Chrome Web Store 开发者控制台](https://chrome.google.com/webstore/devconsole/)
   - 支付 $5 一次性注册费
   - 完善开发者资料

2. **上传扩展**
   - 点击「新增项」
   - 上传ZIP文件
   - 填写商店信息

3. **填写商店信息**
   - 产品详情：名称、摘要、详细说明
   - 图形资源：图标、截图、宣传图
   - 类别：选择「生产力」或「实用工具」
   - 语言：选择支持的语言
   - 隐私权政策：填写托管URL

4. **提交审核**
   - 检查所有信息
   - 提交审核
   - 等待审核结果（1-3个工作日）

## 📊 审核后

- [ ] 监控用户评论
- [ ] 及时回复反馈
- [ ] 收集用户建议
- [ ] 准备后续更新

---

**最后更新**: 2024年11月
**版本**: 1.1.0

