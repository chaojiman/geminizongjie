// Background Service Worker - 简化版本

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openGemini') {
    handleOpenGemini(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 处理打开Gemini
async function handleOpenGemini(pageContent) {
  try {
    const settings = await chrome.storage.sync.get({
      openInBackground: true
    });

    // 构建提示词（异步）
    const prompt = await buildPrompt(pageContent);

    // 获取当前标签页
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 获取当前窗口信息
    const currentWindow = await chrome.windows.get(currentTab.windowId);

    // 计算右侧位置（当前窗口宽度的50%）
    const newWidth = Math.floor(currentWindow.width / 2);
    const newLeft = currentWindow.left + newWidth;

    // Gemini URL
    const geminiUrl = `https://gemini.google.com/app`;

    // 在右侧创建新窗口打开Gemini
    const newWindow = await chrome.windows.create({
      url: geminiUrl,
      type: 'normal',
      width: newWidth,
      height: currentWindow.height,
      left: newLeft,
      top: currentWindow.top,
      focused: !settings.openInBackground  // 反转逻辑：勾选后台=留在原页面
    });

    // 调整原窗口大小到左侧
    await chrome.windows.update(currentWindow.id, {
      width: newWidth,
      left: currentWindow.left
    });

    // 等待Gemini页面加载完成后自动填充内容
    const geminiTab = newWindow.tabs[0];

    // 等待页面加载
    await waitForTabLoad(geminiTab.id);

    // 注入填充和自动提交脚本
    await chrome.scripting.executeScript({
      target: { tabId: geminiTab.id },
      func: fillGeminiInputAndSubmit,
      args: [prompt]
    });

    // 如果勾选了后台打开，回到原窗口
    if (settings.openInBackground) {
      await chrome.windows.update(currentWindow.id, {
        focused: true
      });
    }

    return {
      success: true,
      message: '✅ 内容已自动填入并提交到Gemini！'
    };
  } catch (error) {
    console.error('打开Gemini失败:', error);
    throw error;
  }
}

// 等待标签页加载完成
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const checkTab = async () => {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        // 额外等待3秒确保Gemini的JavaScript完全初始化
        setTimeout(resolve, 3000);
      } else {
        setTimeout(checkTab, 100);
      }
    };
    checkTab();
  });
}

// 填充Gemini输入框并自动提交（注入到页面执行）
function fillGeminiInputAndSubmit(text) {
  console.log('🚀 开始填充Gemini输入框并自动提交...');
  console.log('📝 内容长度:', text.length);

  // 尝试多种选择器找到输入框
  const selectors = [
    '[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea',
    '[aria-label*="prompt"]',
    '[placeholder*="Enter"]'
  ];

  let inputBox = null;
  for (const selector of selectors) {
    inputBox = document.querySelector(selector);
    if (inputBox) {
      console.log('✅ 找到输入框:', selector);
      break;
    }
  }

  if (!inputBox) {
    console.error('❌ 未找到Gemini输入框');
    return;
  }

  try {
    // 方法1: 设置textContent
    inputBox.textContent = text;
    console.log('✅ 方法1：textContent 设置完成');

    // 方法2: 触发input事件
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    inputBox.dispatchEvent(inputEvent);
    console.log('✅ 方法2：触发 input 事件');

    // 方法3: 触发change事件
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    inputBox.dispatchEvent(changeEvent);
    console.log('✅ 方法3：触发 change 事件');

    // 方法4: 聚焦输入框
    inputBox.focus();
    console.log('✅ 方法4：输入框已聚焦');

    console.log('✅ 内容已成功填入Gemini输入框！');

    // 等待一小段时间确保内容已填充
    setTimeout(() => {
      console.log('🔍 开始查找发送按钮...');

      // 内联查找按钮函数
      function findSubmitButton() {
        console.log('🔍 开始查找发送按钮（多种策略）...');

        // 首先找到输入框的位置
        const inputBox = document.querySelector('[contenteditable="true"]');
        if (!inputBox) {
          console.error('❌ 无法找到输入框，无法定位发送按钮');
          return null;
        }

        const inputRect = inputBox.getBoundingClientRect();
        console.log(`📍 输入框位置: (${inputRect.left.toFixed(0)}, ${inputRect.top.toFixed(0)}), 大小: ${inputRect.width.toFixed(0)}x${inputRect.height.toFixed(0)}`);

        // 方法1: 查找输入框右侧附近的圆形按钮
        const buttons = document.querySelectorAll('button');
        let candidates = [];

        for (const btn of buttons) {
          if (btn.disabled) continue;

          const svg = btn.querySelector('svg');
          if (!svg) continue;

          const rect = btn.getBoundingClientRect();

          // 检查按钮是否在输入框附近
          const isNearInput = Math.abs(rect.top - inputRect.top) < 100;  // 垂直距离小于100px
          const isRightOfInput = rect.left > inputRect.right - 50;  // 在输入框右侧（或稍微重叠）
          const isNotFarRight = rect.right < inputRect.right + 200;  // 不要太远

          // 检查按钮特征
          const styles = window.getComputedStyle(btn);
          const hasRoundShape = styles.borderRadius !== '0px';
          const isVisible = rect.width > 0 && rect.height > 0;
          const isSmallButton = rect.width < 80 && rect.height < 80;  // 发送按钮通常是小圆按钮

          // 计算分数
          let score = 0;
          if (isNearInput) score += 10;  // 最重要：在输入框附近
          if (isRightOfInput) score += 8;  // 在输入框右侧
          if (hasRoundShape) score += 5;
          if (isSmallButton) score += 3;
          if (isVisible) score += 2;
          if (isNotFarRight) score += 2;

          if (score > 15) {  // 只考虑得分较高的按钮
            candidates.push({ btn, score, rect });
            console.log(`📊 候选按钮 - 得分: ${score}, 位置: (${rect.left.toFixed(0)}, ${rect.top.toFixed(0)}), 大小: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`);
          }
        }

        // 按分数排序，返回得分最高的
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score);
          console.log(`✅ 找到${candidates.length}个候选按钮，选择得分最高的: ${candidates[0].score}分`);
          return candidates[0].btn;
        }

        // 方法2: 查找输入框父容器中最右侧的按钮
        console.log('⚠️ 方法1失败，尝试方法2: 父容器中最右侧的按钮');
        let parent = inputBox.parentElement;
        for (let i = 0; i < 5 && parent; i++) {  // 向上查找最多5层
          const parentButtons = parent.querySelectorAll('button:not([disabled])');
          if (parentButtons.length > 0) {
            // 找到最右侧的按钮
            let rightmostBtn = null;
            let maxRight = -1;

            for (const btn of parentButtons) {
              const svg = btn.querySelector('svg');
              if (!svg) continue;

              const btnRect = btn.getBoundingClientRect();
              if (btnRect.right > maxRight && Math.abs(btnRect.top - inputRect.top) < 100) {
                maxRight = btnRect.right;
                rightmostBtn = btn;
              }
            }

            if (rightmostBtn) {
              console.log(`✅ 在第${i}层父容器找到最右侧按钮`);
              return rightmostBtn;
            }
          }
          parent = parent.parentElement;
        }

        // 方法3: 查找带有特定aria-label的按钮
        console.log('⚠️ 方法2失败，尝试方法3: aria-label');
        const ariaLabels = ['Send message', '发送消息', 'Submit', '提交', 'Send', '发送'];

        for (const label of ariaLabels) {
          const btn = document.querySelector(`button[aria-label="${label}"]`);
          if (btn && !btn.disabled) {
            console.log('✅ 通过aria-label找到按钮:', label);
            return btn;
          }
        }

        console.error('❌ 所有方法都失败，未找到发送按钮');
        return null;
      }

      // 查找并点击发送按钮
      const submitButton = findSubmitButton();

      if (submitButton) {
        console.log('✅ 找到发送按钮，准备点击...');
        submitButton.click();
        console.log('✅ 已点击发送按钮！');
      } else {
        console.error('❌ 未找到发送按钮');
      }
    }, 500);

  } catch (error) {
    console.error('❌ 填充或提交失败:', error);
  }
}


// 复制到剪贴板
async function copyToClipboard(text) {
  // 使用offscreen document来复制
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: '复制网页内容到剪贴板'
    });
  } catch (error) {
    // 文档可能已存在
  }

  // 发送消息到offscreen document
  await chrome.runtime.sendMessage({
    type: 'copy-to-clipboard',
    text: text
  });
}

// 构建提示词
async function buildPrompt(pageContent) {
  const { title, url, content, images } = pageContent;

  let prompt = '';

  // 页面基本信息（固定部分）
  prompt += `📄 网页内容完整分析\n\n`;
  prompt += `**标题**: ${title}\n`;
  prompt += `**网址**: ${url}\n`;
  prompt += `**提取时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
  prompt += `═══════════════════════════════════════\n\n`;

  // 网页内容（固定部分）
  prompt += `## 📋 网页完整内容\n\n`;

  for (const item of content) {
    if (item.type === 'heading') {
      const prefix = '\n' + '#'.repeat(item.level + 2) + ' ';
      prompt += prefix + item.content + '\n\n';
    } else if (item.type === 'text') {
      prompt += item.content + '\n\n';
    }
  }

  // 图片信息（固定部分）
  if (images && images.length > 0) {
    prompt += `\n\n═══════════════════════════════════════\n\n`;
    prompt += `## 🖼️ 页面图片 (共${images.length}张)\n\n`;
    images.slice(0, 10).forEach((img, i) => {
      prompt += `${i + 1}. ${img.alt || '图片'} \n   ${img.src}\n\n`;
    });
  }

  prompt += `\n═══════════════════════════════════════\n\n`;

  // 获取当前活动的配置（自定义部分）
  try {
    const result = await chrome.storage.sync.get({
      promptConfigs: [
        {
          id: 'config-1',
          name: '深度阅读分析',
          prompt: getDefaultPrompt(),
          active: true
        }
      ],
      activeConfigId: 'config-1'
    });

    const activeConfig = result.promptConfigs.find(c => c.id === result.activeConfigId);
    if (activeConfig && activeConfig.prompt) {
      prompt += activeConfig.prompt;
      console.log('✅ 使用配置:', activeConfig.name);
    } else {
      // 如果没有找到配置，使用默认提示词
      prompt += getDefaultPrompt();
      console.log('⚠️ 未找到配置，使用默认提示词');
    }
  } catch (error) {
    console.error('❌ 获取配置失败，使用默认提示词:', error);
    prompt += getDefaultPrompt();
  }

  return prompt;
}

// 获取默认提示词
function getDefaultPrompt() {
  return `## 📊 深度分析要求

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
💡 **重点关注内容的实用价值和对读者的启示。**`;
}

// 监听快捷键
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-extractor.js']
        });

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (typeof extractPageContent === 'function') {
              return extractPageContent();
            }
          }
        });

        if (results && results[0] && results[0].result) {
          await handleOpenGemini(results[0].result);
        }
      } catch (error) {
        console.error('快捷键执行失败:', error);
      }
    }
  }
});
