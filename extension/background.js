chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-panel" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
  }
});
