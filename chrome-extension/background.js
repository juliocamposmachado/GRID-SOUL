const API = 'http://127.0.0.1:8765';
let polling = false;

async function poll() {
  if (polling) return;
  polling = true;
  try {
    const response = await fetch(`${API}/api/extension/next`, {
      cache: 'no-store'
    });
    if (!response.ok) return;

    const task = await response.json();
    if (!task?.id || !task?.message) return;

    const tabs = await chrome.tabs.query({
      url: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
    });

    let result;
    if (!tabs.length || !tabs[0].id) {
      result = { error: 'Abra a aba normal do ChatGPT e atualize-a.' };
    } else {
      try {
        result = await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'GRID_SOUL_TASK',
          id: task.id,
          message: task.message
        });
      } catch (_) {
        result = { error: 'Atualize a aba do ChatGPT para ativar a extensão.' };
      }
    }

    await fetch(`${API}/api/extension/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        result: result?.result || '',
        error: result?.error || ''
      })
    });
  } catch (error) {
    console.warn('GRID SOUL poll:', error.message);
  } finally {
    polling = false;
  }
}

chrome.alarms.create('gridsoul-poll', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'gridsoul-poll') poll();
});
chrome.runtime.onStartup.addListener(poll);
chrome.runtime.onInstalled.addListener(poll);
poll();
