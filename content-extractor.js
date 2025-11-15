// 智能网页内容提取器 - 自动识别正文区域

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

  if (!mainContent) {
    console.warn('未找到主要内容区域，使用body');
    return result;
  }

  // 提取内容
  extractContent(mainContent, result);

  return result;
}

// 智能识别主要内容区域
function findMainContentArea() {
  // 策略1: 尝试语义化标签
  const semanticSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content-body',
    '.story-body',
    '#article',
    '#content',
    '.article'
  ];

  for (const selector of semanticSelectors) {
    const element = document.querySelector(selector);
    if (element && isValidContentArea(element)) {
      console.log('✅ 找到主要内容区域:', selector);
      return element;
    }
  }

  // 策略2: 基于内容密度算法
  const candidate = findByContentDensity();
  if (candidate) {
    console.log('✅ 通过内容密度找到主要区域');
    return candidate;
  }

  // 策略3: 回退到body，但会过滤掉明显的非内容区域
  console.log('⚠️ 使用body作为内容区域');
  return document.body;
}

// 验证是否是有效的内容区域
function isValidContentArea(element) {
  const text = element.innerText || element.textContent || '';
  const textLength = text.trim().length;

  // 内容长度检查
  if (textLength < 200) {
    return false;
  }

  // 检查是否包含太多链接（可能是导航）
  const links = element.querySelectorAll('a');
  const linkTextLength = Array.from(links).reduce((sum, link) => {
    return sum + (link.innerText || '').length;
  }, 0);

  const linkRatio = linkTextLength / textLength;
  if (linkRatio > 0.5) {
    return false; // 链接文字占比超过50%，可能是导航
  }

  return true;
}

// 基于内容密度的算法
function findByContentDensity() {
  const candidates = [];

  // 查找所有可能的容器元素
  const containers = document.querySelectorAll('div, section, article');

  for (const container of containers) {
    // 跳过明显的非内容区域
    if (isExcludedElement(container)) {
      continue;
    }

    const density = calculateContentDensity(container);
    const text = (container.innerText || '').trim();

    if (text.length > 500 && density > 0.3) {
      candidates.push({
        element: container,
        density: density,
        length: text.length,
        score: density * Math.log(text.length)
      });
    }
  }

  // 按分数排序
  candidates.sort((a, b) => b.score - a.score);

  return candidates[0]?.element || null;
}

// 计算内容密度
function calculateContentDensity(element) {
  const text = (element.innerText || element.textContent || '').trim();
  const textLength = text.length;

  if (textLength === 0) return 0;

  // 计算标签数量
  const tagCount = element.getElementsByTagName('*').length;

  // 内容密度 = 文字长度 / 标签数量
  return textLength / (tagCount + 1);
}

// 检查是否是应排除的元素
function isExcludedElement(element) {
  // 检查class和id
  const classId = (element.className || '') + ' ' + (element.id || '');
  const excludePatterns = [
    'header', 'footer', 'nav', 'sidebar', 'menu',
    'advertisement', 'ads', 'ad-', 'widget',
    'comment', 'related', 'share', 'social',
    'popup', 'modal', 'dialog', 'banner',
    'cookie', 'subscribe', 'newsletter'
  ];

  for (const pattern of excludePatterns) {
    if (classId.toLowerCase().includes(pattern)) {
      return true;
    }
  }

  // 检查元素标签
  const tagName = element.tagName.toLowerCase();
  if (['header', 'footer', 'nav', 'aside'].includes(tagName)) {
    return true;
  }

  // 检查是否隐藏
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }

  return false;
}

// 提取内容
function extractContent(mainElement, result) {
  const textChunks = [];
  const images = [];

  // 遍历主要内容区域
  const walker = document.createTreeWalker(
    mainElement,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 过滤掉不需要的元素
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (isExcludedElement(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          const style = window.getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
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

      // 处理段落分隔
      if (['p', 'div', 'br', 'hr'].includes(tagName)) {
        if (textBuffer.trim().length > 20) {
          textChunks.push({
            type: 'text',
            content: textBuffer.trim()
          });
          textBuffer = '';
        }
      }

      // 提取标题
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const headingText = currentNode.textContent.trim();
        if (headingText && headingText.length > 0 && headingText.length < 200) {
          textChunks.push({
            type: 'heading',
            level: parseInt(tagName[1]),
            content: headingText
          });
          textBuffer = '';
        }
      }

      // 提取图片
      if (tagName === 'img') {
        const src = currentNode.src;
        const alt = currentNode.alt || '';

        if (src && !processedImages.has(src) && isValidImage(currentNode)) {
          processedImages.add(src);
          images.push({
            src: src,
            alt: alt,
            width: currentNode.naturalWidth || currentNode.width || 0,
            height: currentNode.naturalHeight || currentNode.height || 0
          });
        }
      }
    }
  }

  // 添加剩余文本
  if (textBuffer.trim().length > 20) {
    textChunks.push({
      type: 'text',
      content: textBuffer.trim()
    });
  }

  result.content = textChunks;
  result.images = images;
}

// 验证图片是否有效
function isValidImage(img) {
  const src = img.src;

  // 过滤追踪像素和小图标
  if (src.includes('track') || src.includes('pixel') || src.includes('beacon')) {
    return false;
  }

  // 检查图片尺寸
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;

  // 过滤太小的图片（可能是图标）
  if (width < 100 && height < 100) {
    return false;
  }

  // 检查是否是图片格式
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const hasImageExtension = imageExtensions.some(ext => src.toLowerCase().includes(ext));

  return hasImageExtension || src.startsWith('data:image/');
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractPageContent };
}
