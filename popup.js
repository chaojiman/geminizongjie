// Popup界面交互逻辑

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
    showStatus('正在提取网页内容...', 'info');

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
      func: extractPageContent
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error('内容提取失败');
    }

    const pageContent = results[0].result;

    showStatus('内容提取完成，正在打开Gemini...', 'info');
    btn.querySelector('.btn-text').textContent = '正在打开Gemini...';

    // 发送到background处理
    const response = await chrome.runtime.sendMessage({
      action: 'openGemini',
      data: pageContent
    });

    if (response.success) {
      showStatus('✅ 内容已自动填入并提交！', 'success');
      btn.querySelector('.btn-text').textContent = '已提交 ✓';

      // 3秒后关闭popup
      setTimeout(() => {
        window.close();
      }, 3000);
    } else {
      throw new Error(response.error || '打开Gemini失败');
    }

  } catch (error) {
    console.error('处理失败:', error);
    showStatus('错误: ' + error.message, 'error');
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

// 内容提取函数（会被注入到页面中执行）
function extractPageContent() {
  const result = {
    title: document.title,
    url: window.location.href,
    content: [],
    images: [],
    timestamp: new Date().toISOString()
  };

  // 使用智能算法找到主要内容区域
  const mainContent = findMainContentArea();

  if (mainContent) {
    extractContent(mainContent, result);
  }

  return result;

  // 辅助函数
  function findMainContentArea() {
    const semanticSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content'
    ];

    for (const selector of semanticSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim().length > 200) {
        return element;
      }
    }

    return document.body;
  }

  function extractContent(mainElement, result) {
    const textChunks = [];
    const images = [];

    const walker = document.createTreeWalker(
      mainElement,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }

            // 排除明显的非内容区域
            const classId = (node.className || '') + ' ' + (node.id || '');
            const excludePatterns = ['header', 'footer', 'nav', 'sidebar', 'ad'];
            for (const pattern of excludePatterns) {
              if (classId.toLowerCase().includes(pattern)) {
                return NodeFilter.FILTER_REJECT;
              }
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode;
    let textBuffer = '';
    const processedImages = new Set();

    while (currentNode = walker.nextNode()) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const text = currentNode.textContent.trim();
        if (text.length > 0) {
          textBuffer += text + ' ';
        }
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = currentNode.tagName.toLowerCase();

        if (['p', 'div', 'br'].includes(tagName)) {
          if (textBuffer.trim().length > 20) {
            textChunks.push({
              type: 'text',
              content: textBuffer.trim()
            });
            textBuffer = '';
          }
        }

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const headingText = currentNode.textContent.trim();
          if (headingText && headingText.length < 200) {
            textChunks.push({
              type: 'heading',
              level: parseInt(tagName[1]),
              content: headingText
            });
            textBuffer = '';
          }
        }

        if (tagName === 'img') {
          const src = currentNode.src;
          const alt = currentNode.alt || '';
          const width = currentNode.naturalWidth || currentNode.width || 0;
          const height = currentNode.naturalHeight || currentNode.height || 0;

          if (src && !processedImages.has(src) && width >= 100 && height >= 100) {
            processedImages.add(src);
            images.push({
              src: src,
              alt: alt,
              width: width,
              height: height
            });
          }
        }
      }
    }

    if (textBuffer.trim().length > 20) {
      textChunks.push({
        type: 'text',
        content: textBuffer.trim()
      });
    }

    result.content = textChunks;
    result.images = images;
  }
}
