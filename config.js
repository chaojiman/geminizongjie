// 配置管理页面逻辑

// 默认配置
const DEFAULT_CONFIGS = [
  {
    id: 'config-1',
    name: '深度阅读分析',
    prompt: `## 📊 深度分析要求

请使用 **Gemini 2.5 Pro** 模型，基于《如何阅读一本书》的阅读技巧，对上述完整网页内容进行多维度深度分析：

### 1️⃣ 整体理解
(1) 整体来说，这个网页到底在谈些什么？
- 你一定要想办法找出这个网页的主题，作者如何依次发展这个主题，如何逐步从核心主题分解出从属的关键议题来。

### 2️⃣ 细节分析
(2) 作者细部说了什么，怎么说的？
- 你一定要想办法找出主要的想法、声明与论点。这些组合成作者想要传达的特殊讯息。

### 3️⃣ 合理性评估
(3) 这个网页说得有道理吗？是全部有道理，还是部分有道理？
- 在你判断这个网页是否有道理之前，你必须先了解整个内容在说些什么才行。
- 评估要点：
  - 证明作者的知识是否不足
  - 证明作者的知识是否有误
  - 证明作者的逻辑是否错误
  - 证明作者的分析与理由是否不够完整

### 4️⃣ 实用价值
(4) 这个网页跟你有什么关系？
- 如果这个网页给了你一些资讯，你一定要问问这些资讯有什么意义。为什么这位作者会认为知道这件事很重要？你真的有必要去了解吗？
- 如果这个网页不只提供了资讯，还启发了你，就更有必要找出其他相关的、更深的含意或建议，以获得更多的启示。

═══════════════════════════════════════

📝 **请用中文进行全面、深入、结构化的分析，条理清晰，观点明确。**
💡 **重点关注内容的实用价值和对读者的启示。**`,
    active: true
  }
];

let configs = [];
let activeConfigId = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfigs();
  renderConfigs();
  attachEventListeners();
});

// 加载配置
async function loadConfigs() {
  try {
    const result = await chrome.storage.sync.get({
      promptConfigs: DEFAULT_CONFIGS,
      activeConfigId: 'config-1'
    });
    configs = result.promptConfigs;
    activeConfigId = result.activeConfigId;
    console.log('✅ 配置加载成功:', configs);
  } catch (error) {
    console.error('❌ 加载配置失败:', error);
    configs = DEFAULT_CONFIGS;
    activeConfigId = 'config-1';
  }
}

// 渲染配置列表
function renderConfigs() {
  const container = document.getElementById('configList');
  container.innerHTML = '';

  configs.forEach((config, index) => {
    const configItem = createConfigElement(config, index);
    container.appendChild(configItem);
  });

  // 更新添加按钮状态
  const addBtn = document.getElementById('addConfigBtn');
  addBtn.disabled = configs.length >= 5;
  if (configs.length >= 5) {
    addBtn.textContent = '⚠️ 已达到最大配置数（5个）';
  } else {
    addBtn.innerHTML = '<span>➕</span><span>添加新配置</span>';
  }
}

// 创建配置元素
function createConfigElement(config, index) {
  const div = document.createElement('div');
  div.className = `config-item ${config.id === activeConfigId ? 'active' : ''}`;
  div.dataset.configId = config.id;

  const isActive = config.id === activeConfigId;
  const canDelete = configs.length > 1;

  div.innerHTML = `
    <div class="config-header">
      <div class="config-title-wrapper">
        <input
          type="text"
          class="config-title-input"
          value="${escapeHtml(config.name)}"
          placeholder="配置名称"
          data-config-id="${config.id}"
        />
        ${isActive ? '<span class="active-badge">当前使用</span>' : ''}
      </div>
      <div class="config-actions">
        ${!isActive ? `<button class="icon-btn set-active-btn" data-action="set-active" data-config-id="${config.id}">✓ 设为当前</button>` : ''}
        ${canDelete ? `<button class="icon-btn delete-btn" data-action="delete" data-config-id="${config.id}">🗑️ 删除</button>` : ''}
      </div>
    </div>
    <div class="config-body">
      <div class="form-group">
        <label class="form-label">自定义提示词：</label>
        <textarea
          class="form-textarea"
          placeholder="输入您的分析要求...\n\n💡 提示：这部分内容会添加在网页内容和图片列表之后"
          data-config-id="${config.id}"
        >${escapeHtml(config.prompt)}</textarea>
        <div class="char-count">
          <span class="current-count">${config.prompt.length}</span> 字符
        </div>
      </div>
    </div>
  `;

  return div;
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 绑定事件监听器
function attachEventListeners() {
  // 添加配置
  document.getElementById('addConfigBtn').addEventListener('click', addConfig);

  // 保存配置
  document.getElementById('saveBtn').addEventListener('click', saveConfigs);

  // 恢复默认
  document.getElementById('resetBtn').addEventListener('click', resetConfigs);

  // 关闭页面
  document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
  });

  // 委托事件：配置操作
  document.getElementById('configList').addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    const configId = e.target.dataset.configId;

    if (action === 'set-active') {
      setActiveConfig(configId);
    } else if (action === 'delete') {
      deleteConfig(configId);
    }
  });

  // 委托事件：输入变化
  document.getElementById('configList').addEventListener('input', (e) => {
    const configId = e.target.dataset.configId;
    if (!configId) return;

    const config = configs.find(c => c.id === configId);
    if (!config) return;

    if (e.target.classList.contains('config-title-input')) {
      config.name = e.target.value;
    } else if (e.target.classList.contains('form-textarea')) {
      config.prompt = e.target.value;
      // 更新字符计数
      const countElement = e.target.parentElement.querySelector('.current-count');
      if (countElement) {
        countElement.textContent = e.target.value.length;
      }
    }
  });
}

// 添加新配置
function addConfig() {
  if (configs.length >= 5) {
    showStatus('最多只能添加5个配置', 'error');
    return;
  }

  const newConfig = {
    id: `config-${Date.now()}`,
    name: `配置 ${configs.length + 1}`,
    prompt: '## 📊 分析要求\n\n请对上述网页内容进行分析...\n\n',
    active: false
  };

  configs.push(newConfig);
  renderConfigs();
  showStatus('✅ 新配置已添加', 'success');

  // 滚动到新配置
  setTimeout(() => {
    const newElement = document.querySelector(`[data-config-id="${newConfig.id}"]`);
    if (newElement) {
      newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// 设置活动配置
function setActiveConfig(configId) {
  activeConfigId = configId;
  renderConfigs();
  showStatus('✅ 已设置为当前使用的配置', 'success');
}

// 删除配置
function deleteConfig(configId) {
  if (configs.length <= 1) {
    showStatus('❌ 至少需要保留一个配置', 'error');
    return;
  }

  const configName = configs.find(c => c.id === configId)?.name || '配置';

  if (!confirm(`确定要删除「${configName}」吗？`)) {
    return;
  }

  configs = configs.filter(c => c.id !== configId);

  // 如果删除的是活动配置，设置第一个为活动
  if (activeConfigId === configId) {
    activeConfigId = configs[0].id;
  }

  renderConfigs();
  showStatus('✅ 配置已删除', 'success');
}

// 保存配置
async function saveConfigs() {
  try {
    // 验证配置
    if (configs.length === 0) {
      showStatus('❌ 至少需要一个配置', 'error');
      return;
    }

    // 验证每个配置都有名称
    for (const config of configs) {
      if (!config.name.trim()) {
        showStatus('❌ 配置名称不能为空', 'error');
        return;
      }
    }

    // 保存到storage
    await chrome.storage.sync.set({
      promptConfigs: configs,
      activeConfigId: activeConfigId
    });

    showStatus('✅ 配置已保存', 'success');
    console.log('💾 配置保存成功:', configs);

    // 3秒后关闭页面
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('❌ 保存配置失败:', error);
    showStatus('❌ 保存失败: ' + error.message, 'error');
  }
}

// 恢复默认配置
function resetConfigs() {
  if (!confirm('确定要恢复默认配置吗？这将清除所有自定义配置。')) {
    return;
  }

  configs = JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
  activeConfigId = 'config-1';
  renderConfigs();
  showStatus('✅ 已恢复默认配置', 'success');
}

// 显示状态提示
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type} show`;

  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}
