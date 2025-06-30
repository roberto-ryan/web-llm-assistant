import {
  action,
  CallerType,
  Scope,
  tool,
  ToolName,
} from "@mlc-ai/web-agent-interface";
import {
  ChatCompletionMessageParam,
  ExtensionServiceWorkerMLCEngine,
} from "@mlc-ai/web-llm";
import { get_system_prompt } from "./prompt";
import showdown from "showdown";
import {
  createElement,
  createIcons,
  Send,
  LoaderCircle,
  RotateCw,
  ChevronRight,
  ChevronDown,
} from "lucide";

const markdownRenderer = new showdown.Converter({
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  openLinksInNewWindow: true,
});

const initContainer = document.getElementById("init-container") as HTMLElement;
const intro = document.getElementById("intro") as HTMLParagraphElement;
const messagesDiv = document.getElementById("messages") as HTMLDivElement;
const textArea = document.getElementById(
  "modalTextarea",
) as HTMLTextAreaElement;
const sendButton = document.getElementById("send") as HTMLButtonElement;
const regenerateButton = document.getElementById(
  "regenerate",
) as HTMLButtonElement;

function createMessageElement(role: "user" | "assistant"): string {
  const message = document.createElement("div");
  const uuid = `message-${crypto.randomUUID()}`;
  message.id = uuid;
  message.className = `message ${role}`;

  if (role === "assistant") {
    // Assistant message: two subsections (scratchpad and action)
    const scratchpadSection = document.createElement("div");
    scratchpadSection.className = "scratchpad hidden";

    const scratchpadHeader = document.createElement("h3");
    scratchpadHeader.textContent = "Thinking";
    scratchpadHeader.appendChild(createElement(ChevronRight));
    scratchpadHeader.className = "scratchpad-header";
    scratchpadHeader.style.cursor = "pointer";

    const scratchpadContent = document.createElement("div");
    scratchpadContent.className = "scratchpad-content hidden";

    // Toggle scratchpad visibility on header click
    scratchpadHeader.addEventListener("click", () => {
      scratchpadHeader.innerHTML = "";
      scratchpadHeader.textContent = "Thinking";
      scratchpadHeader.appendChild(createElement(ChevronDown));
      scratchpadContent.classList.toggle("hidden");
    });

    scratchpadSection.appendChild(scratchpadHeader);
    scratchpadSection.appendChild(scratchpadContent);
    message.appendChild(scratchpadSection);

    const actionSection = document.createElement("div");
    actionSection.className = "action hidden";
    message.appendChild(actionSection);

    const textSection = document.createElement("div");
    textSection.className = "text hidden";
    message.appendChild(textSection);
  }

  messagesDiv!.appendChild(message);
  return uuid;
}

function appendMessage(
  text: string,
  role: "user" | "assistant",
  sections = { scratchpad: "", action: "" },
): string {
  const uuid = createMessageElement(role);
  updateMessage(uuid, text, role, sections);
  return uuid;
}

function updateMessage(
  messageId: string,
  text: string,
  role: "user" | "assistant",
  sections = { scratchpad: "", action: "" },
) {
  const messageElement = document.getElementById(messageId);
  if (messageElement) {
    if (role === "assistant") {
      // Update assistant sections
      const scratchpad = messageElement.querySelector(".scratchpad");
      const actionElement = messageElement.querySelector(".action");
      const textElement = messageElement.querySelector(".text");

      if (scratchpad) {
        scratchpad.querySelector(".scratchpad-content")!.innerHTML =
          markdownRenderer.makeHtml(sections.scratchpad);
        if (sections.scratchpad && sections.scratchpad.length > 0) {
          scratchpad.classList.remove("hidden");
        } else {
          scratchpad.classList.add("hidden");
        }
      }
      if (actionElement) {
        actionElement.textContent = sections.action;
        if (sections.action && sections.action.length > 0) {
          actionElement.classList.remove("hidden");
        } else {
          actionElement.classList.add("hidden");
        }
      }
      if (textElement) {
        textElement.innerHTML = markdownRenderer.makeHtml(text);
        if (text && text.length > 0) {
          textElement.classList.remove("hidden");
        } else {
          textElement.classList.add("hidden");
        }
      }
    } else {
      // Update user message text content
      messageElement.textContent = text;
    }
  }
}

async function updateAssistantMessage(
  messageId: string | null,
  response: string,
  completed: boolean,
) {
  if (!messageId || !document.getElementById(messageId)) {
    messageId = createMessageElement("assistant");
  }

  // Initialize variables for subsections
  let scratchpadContent = "";
  let actionContent = "";

  // Extract and handle <scratchpad> content
  const scratchpadStart = response.indexOf("<scratchpad>");
  const scratchpadEnd = response.indexOf("</scratchpad>");
  if (scratchpadStart >= 0 && scratchpadEnd > scratchpadStart) {
    scratchpadContent = response.substring(
      scratchpadStart + "<scratchpad>".length,
      scratchpadEnd,
    );
    response =
      response.substring(0, scratchpadStart) +
      response.substring(scratchpadEnd + "</scratchpad>".length);
  }

  // Extract and handle <action> content
  const actionStart = response.indexOf("<action>");
  if (actionStart >= 0) {
    let actionEnd = response.indexOf("</action>");
    if (actionEnd < 0) {
      actionContent = response.substring(actionStart + "<action>".length);
      response = response.substring(0, actionStart);
    } else {
      actionContent = response.substring(
        actionStart + "<action>".length,
        actionEnd,
      );
      response =
        response.substring(0, actionStart) +
        response.substring(actionEnd + "</action>".length);
    }
  }
  if (actionContent) {
    try {
      const actionJson = JSON.parse(actionContent);
      if (actionJson.name) {
        const actionName = tool[actionJson.name].displayName;
        actionContent = `WebLLM Assistant takes action "${actionName}".`;
      }
    } catch (e) {}
  }

  updateMessage(messageId, response, "assistant", {
    scratchpad: scratchpadContent,
    action: actionContent,
  });

  if (completed) {
    // Executing action
    let actionJson: null | { name: string; arguments: any } = null;
    try {
      actionJson = JSON.parse(actionContent);
    } catch (e) {}
    if (actionJson) {
      const observation = await callToolFunction(actionJson);

      let curMessage = "";
      messages = [
        ...messages,
        { role: "tool", tool_call_id: "", content: observation },
      ];
      console.log("messages", messages);
      let messageId: string | null = null;
      try {
        const completion = await engine.chat.completions.create({
          stream: true,
          messages,
          temperature: 0,
          stop: "</action>",
        });

        for await (const chunk of completion) {
          const curDelta = chunk.choices[0].delta.content;
          if (curDelta) {
            curMessage += curDelta;
          }
          messageId = await updateAssistantMessage(
            messageId,
            curMessage,
            false,
          );
        }

        const finalMessage = await engine.getMessage();
        messages = [...messages, { role: "assistant", content: finalMessage }];
        console.log(`Updating message ${messageId}:`, finalMessage);
        console.log(messages);
        messageId = await updateAssistantMessage(messageId, finalMessage, true);
      } catch (e) {
        console.error("Error while generating.", e);
        messageId = await updateAssistantMessage(messageId, e, true);
      }
    }
  }

  return messageId;
}

function disableSubmit() {
  sendButton.disabled = true;
  sendButton.innerHTML = "";
  const icon = createElement(LoaderCircle);
  icon.classList.add("spin");
  sendButton.appendChild(icon);
  sendButton.append("Send");
  regenerateButton.classList.add("hidden");
  regenerateButton.disabled = true;
}

function enableSubmit() {
  sendButton.disabled = false;
  sendButton.innerHTML = "";
  sendButton.appendChild(createElement(Send));
  sendButton.append("Send");
  if (messages.length > 1) {
    regenerateButton.classList.remove("hidden");
    regenerateButton.disabled = false;
  }
}

function focusInput() {
  if (textArea && !textArea.classList.contains("hidden")) {
    textArea.focus();
  }
}
const engine = new ExtensionServiceWorkerMLCEngine({
  initProgressCallback: (progress) => {
    console.log(progress.text);
    const match = progress.text.match(/\[(\d+)\/(\d+)]/);
    if (match) {
      const progress = parseInt(match[1], 10);
      const totalProgress = parseInt(match[2], 10);
      updateInitProgressBar(progress / totalProgress);
    } else {
      updateInitProgressBar(progress.progress);
    }
  },
});
window.addEventListener("load", () => {
  createIcons({
    icons: {
      Send,
      LoaderCircle,
      RotateCw,
    },
  });
  loadWebllmEngine();
});

const getScopeForPage = (url: string | undefined): Scope => {
  if (!url) {
    return Scope.Any;
  }
  if (/^https:\/\/www\.overleaf\.com\/project\/.+$/.test(url)) {
    /* Overleaf document */
    return Scope.Overleaf;
  }
  return Scope.Any;
};

const getCurrentActiveTabUrl: () => Promise<string | undefined> = async () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      resolve(activeTab.url);
    });
  });

const sendMessageToContentScript = async (
  message: Object,
): Promise<string | Object> => {
  const [tab] = await chrome.tabs.query({
    currentWindow: true,
    active: true,
  });
  if (tab.id) {
    return chrome.tabs.sendMessage(tab.id, message);
  }
  throw new Error("Error: no active tab found");
};

const callToolFunction = async (functionCall: {
  name: ToolName;
  parameters?: Object;
}): Promise<string> => {
  const { name: function_name, parameters = {} } = functionCall;
  const caller = tool[function_name].caller;
  console.log("Call tool", function_name, parameters);
  let observation;
  try {
    if (caller === CallerType.ContentScript) {
      observation = await sendMessageToContentScript({
        action: "function_call",
        function_name,
        parameters,
      });
    } else {
      observation = tool[function_name].implementation(parameters);
    }
    return `<observation>{"name":"${function_name}","observation":${JSON.stringify(observation)}}</observation>`;
  } catch (e) {
    return `<observation>{"name":"${function_name}","observation":{"status":"error","message":${JSON.stringify(e.message || e.toString())}}}</observation>`;
  }
};

let scope = Scope.Any;
let availableTools = Object.values(tool).filter(
  (t) => t.type === "action" && t.scope === Scope.Any,
);
const MAX_MESSAGES = 8;
let messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: get_system_prompt(availableTools),
  },
];
let lastQuery = "";
let isGenerating = false;

const updateScopeForPage = async () => {
  const url = await getCurrentActiveTabUrl();
  scope = getScopeForPage(url);
  availableTools = Object.values(tool).filter(
    (t) =>
      t.type === "action" &&
      (t.scope === Scope.Any || t.scope?.includes(scope)),
  );
  console.log("Updated page scope to " + scope);
  console.log("Updated available tools: " + availableTools.map((t) => t.name));
};
updateScopeForPage();

async function loadWebllmEngine() {
  const options = await chrome.storage.sync.get({
    temperature: 0.5,
    contextLength: 4096,
    model: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  });
  await engine.reload(options["model"], {
    context_window_size: options["contextLength"],
    temperature: options["temperature"],
  });
  console.log("Engine loaded.");

  document.getElementById("loading-warn")?.classList.add("hidden");
  intro.classList.remove("hidden");
  enableSubmit();
  messagesDiv.classList.remove("hidden");
  focusInput();
  document.addEventListener("keydown", function (event) {
    const key = event.key;
    if (key == "Enter" && textArea === document.activeElement) {
      handleSubmit(false);
    }
  });
}

async function handleSubmit(regenerate) {
  if (isGenerating) {
    return;
  }
  isGenerating = true;
  initContainer.classList.add("hidden");
  disableSubmit();

  if ((regenerate && !lastQuery) || (!regenerate && !textArea.value)) {
    enableSubmit();
    return;
  }
  let query: string = "";
  if (regenerate) {
    query = lastQuery;
    if (messages[messages.length - 1].role === "assistant") {
      messages.pop();
    }
  } else {
    let pageContext: string | null = null;
    try {
      pageContext = await callToolFunction({
        name: "getPageContext",
      });
    } catch (e) {
      console.error(e);
      pageContext = `Error: Failed to retrieve page context. Error message: ${e.message || e || ""}.`;
    }
    let context = "# Context:\n\n`";
    if (pageContext) {
      context += `### Current Page:\n${pageContext}}`;
    }
    context += `### User's timezone:\n${Intl.DateTimeFormat().resolvedOptions().timeZone}\n\n`;
    context += `### Current Date and Time:\n${new Date().toISOString()}\n\n`;
    query = context + "\n\n# User Query:\n" + textArea.value;
    textArea.value = "";
    messages = [...messages, { role: "user", content: query }];
    lastQuery = query;
  }

  while (messages.length > MAX_MESSAGES) {
    messages.splice(1, 2); // Remove the message at index 1 (second element)
  }

  appendMessage(
    query.substring(
      query.lastIndexOf("# User Query:\n") + "# User Query:\n".length,
    ),
    "user",
  );

  let curMessage = "";
  console.log("messages", messages);
  let messageId: string | null = null;
  try {
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      temperature: 0,
      stop: "</action>",
    });

    for await (const chunk of completion) {
      const curDelta = chunk.choices[0].delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      messageId = await updateAssistantMessage(messageId, curMessage, false);
    }

    const finalMessage = await engine.getMessage();
    messages = [...messages, { role: "assistant", content: finalMessage }];
    console.log(`Updating message ${messageId}:`, finalMessage);
    console.log(messages);
    messageId = await updateAssistantMessage(messageId, finalMessage, true);
  } catch (e) {
    console.error("Error while generating.", e);
    messageId = await updateAssistantMessage(messageId, e, true);
  } finally {
    isGenerating = false;
    enableSubmit();
  }
}

function updateInitProgressBar(percentage) {
  if (percentage < 0) percentage = 0;
  if (percentage > 1) percentage = 1;

  document.getElementById("progress-bar")!.style.width = percentage * 100 + "%";

  if (percentage >= 1) {
    document.getElementById("progress-bar-container")?.classList.add("hidden");
    intro?.classList.remove("hidden");
    textArea?.classList.remove("hidden");
    document.getElementById("button-container")?.classList.remove("hidden");

    enableSubmit();
    textArea.focus();
  }
}

sendButton.addEventListener("click", () => {
  handleSubmit(false);
});
regenerateButton.addEventListener("click", () => {
  handleSubmit(true);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // Match the command name in manifest.json
    focusInput();
  }
});
