// Offscreen document for clipboard operations

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'copy-to-clipboard') {
    copyToClipboard(message.text);
    sendResponse({ success: true });
  }
  return true;
});

function copyToClipboard(text) {
  // 创建textarea元素
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  // 选择并复制
  textarea.select();
  document.execCommand('copy');

  // 清理
  document.body.removeChild(textarea);

  console.log('✅ 内容已复制到剪贴板');
}
