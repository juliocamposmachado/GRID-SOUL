let running = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getComposer() {
  return document.querySelector(
    '#prompt-textarea, [data-testid="prompt-textarea"], textarea'
  ) || document.querySelector('[contenteditable="true"][role="textbox"]');
}

function getAssistantMessages() {
  return [...document.querySelectorAll('[data-message-author-role="assistant"]')];
}

function getSendButton() {
  return document.querySelector(
    'button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]'
  );
}

function isGenerating() {
  return Boolean(document.querySelector(
    'button[data-testid="stop-button"], button[aria-label*="Stop generating"], button[aria-label*="Parar"]'
  ));
}

function setComposerValue(element, value) {
  element.focus();

  if (element.isContentEditable) {
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: value
    }));
    return;
  }

  const setter = Object.getOwnPropertyDescriptor(
    element.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    'value'
  )?.set;

  if (setter) setter.call(element, value);
  else element.value = value;

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function handleTask(message) {
  if (running) return { error: 'Já existe um comando em andamento.' };
  running = true;

  try {
    const composer = getComposer();
    if (!composer) throw new Error('Campo de mensagem não encontrado. Atualize a aba do ChatGPT.');

    const before = getAssistantMessages();
    const oldLast = before.length ? before[before.length - 1].innerText.trim() : '';

    const prompt = String(message.message || '');
    if (!prompt || prompt.length > 7000) throw new Error('Tarefa do servidor inválida ou longa demais.');

    setComposerValue(composer, prompt);
    await sleep(300);

    const send = getSendButton();
    if (!send || send.disabled) throw new Error('Botão Enviar indisponível. Verifique a página do ChatGPT.');
    send.click();

    const deadline = Date.now() + 180000;
    let sawNewResponse = false;
    let stableText = '';
    let stableSince = Date.now();

    while (Date.now() < deadline) {
      await sleep(500);
      const messages = getAssistantMessages();
      const last = messages.length ? messages[messages.length - 1].innerText.trim() : '';

      if (last && (last !== oldLast || messages.length > before.length)) {
        sawNewResponse = true;
        if (!isGenerating() && last === stableText) {
          if (Date.now() - stableSince > 1800) {
            return { result: last };
          }
        } else {
          stableText = last;
          stableSince = Date.now();
        }
      } else if (isGenerating()) {
        sawNewResponse = true;
      }

      if (sawNewResponse && !isGenerating() && stableText) {
        if (Date.now() - stableSince > 1800) return { result: stableText };
      }
    }

    throw new Error('Tempo esgotado aguardando a resposta do ChatGPT.');
  } catch (error) {
    return { error: String(error.message || error) };
  } finally {
    running = false;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GRID_SOUL_TASK') {
    handleTask(message).then(sendResponse);
    return true;
  }
});
