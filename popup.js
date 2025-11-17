// Popup界面交互逻辑 - 纯文本提交版本

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadPromptConfigs();
  document.getElementById('summarizeBtn').addEventListener('click', handleSummarize);
  document.getElementById('openInBackground').addEventListener('change', saveSettings);
  document.getElementById('promptConfig').addEventListener('change', saveActiveConfig);
  document.getElementById('manageConfigBtn').addEventListener('click', openConfigPage);
  document.getElementById('changeShortcut').addEventListener('click', openShortcutSettings);
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      openInBackground: true
    });
    document.getElementById('openInBackground').checked = settings.openInBackground;
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

async function loadPromptConfigs() {
  try {
    const result = await chrome.storage.sync.get({
      promptConfigs: [
        {
          id: 'config-1',
          name: '深度阅读分析',
          prompt: '默认配置',
          active: true
        }
      ],
      activeConfigId: 'config-1'
    });

    const configs = result.promptConfigs;
    const activeConfigId = result.activeConfigId;
    const selectEl = document.getElementById('promptConfig');

    // 清空选项
    selectEl.innerHTML = '';

    // 添加配置选项
    configs.forEach(config => {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = config.name;
      if (config.id === activeConfigId) {
        option.selected = true;
      }
      selectEl.appendChild(option);
    });

    console.log('✅ 配置加载成功，当前配置:', activeConfigId);
  } catch (error) {
    console.error('加载配置失败:', error);
  }
}

async function saveActiveConfig() {
  try {
    const selectedId = document.getElementById('promptConfig').value;
    await chrome.storage.sync.set({ activeConfigId: selectedId });
    showStatus('✅ 配置已切换', 'success');
    console.log('✅ 切换到配置:', selectedId);
  } catch (error) {
    console.error('保存配置失败:', error);
    showStatus('保存配置失败', 'error');
  }
}

function openConfigPage() {
  chrome.tabs.create({ url: 'config.html' });
}

async function saveSettings() {
  try {
    const openInBackground = document.getElementById('openInBackground').checked;
    await chrome.storage.sync.set({ openInBackground });
    showStatus('设置已保存', 'success');
  } catch (error) {
    console.error('保存设置失败:', error);
    showStatus('保存设置失败', 'error');
  }
}

async function handleSummarize() {
  const btn = document.getElementById('summarizeBtn');
  const originalText = btn.querySelector('.btn-text').textContent;

  try {
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = '正在提取内容...';
    showStatus('📋 步骤1/4: 正在提取网页内容...', 'info');

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('无法获取当前标签页');
    }

    // 注入内容提取脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-extractor.js']
    });

    // 执行内容提取
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof extractPageContent === 'function') {
          return extractPageContent();
        } else {
          throw new Error('extractPageContent函数未找到');
        }
      }
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error('内容提取失败');
    }

    const pageContent = results[0].result;

    showStatus('📤 步骤2/4: 正在提交到Gemini...', 'info');
    btn.querySelector('.btn-text').textContent = '正在提交...';

    // 发送到background处理（提交内容到Gemini）
    const response = await chrome.runtime.sendMessage({
      action: 'openGemini',
      data: pageContent
    });

    if (response.success) {
      showStatus('✅ 完整流程成功！内容已提交到Gemini', 'success');
      btn.querySelector('.btn-text').textContent = '已完成 ✓';

      // 3秒后关闭popup
      setTimeout(() => {
        window.close();
      }, 3000);
    } else {
      throw new Error(response.error || '处理失败');
    }

  } catch (error) {
    console.error('处理失败:', error);
    showStatus('❌ 错误: ' + error.message, 'error');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = originalText;
  }
}

function openShortcutSettings() {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status ' + type;
}
