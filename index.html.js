window.OPENAI_API_TYPE = "%OPENAI_API_TYPE%";

const robot =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-robot" viewBox="0 0 16 16"><path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z"/></svg>';

const human =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/></svg>';

let messages = [];

/**
 * @description Hide elements by CSS selector
 * @param {string} selector The CSS selector
 * @param {bool} hidden When true hide elements
 * @param {Element} parent The error parent element
 */
function hideElements(selector, hidden, parent) {
  (parent || document).querySelectorAll(selector).forEach(el => {
    if (hidden) {
      el.classList.add("d-none");
    } else {
      el.classList.remove("d-none");
    }
  });
}

/**
 * @description Toggle the send state
 * @param {bool} sending
 */
function toggleSendState(sending) {
  document.querySelectorAll("form button,form input").forEach(el => {
    if (sending) {
      el.setAttribute("disabled", true);
    } else {
      el.removeAttribute("disabled");
    }
  });

  // toggle button icon visibility by state
  hideElements(".message-sending", !sending);
  hideElements(".message-send", sending);
}

/**
 * @description Render the error message
 * @param {Error|string} error The error
 * @param {Element} parent The error parent element
 */
function renderError(error, parent) {
  hideElements(
    "div.row.error",
    !error,
    parent || document.querySelector("div.main")
  );

  if (error) {
    const el = (parent || document).querySelector(".error-message");

    if (error instanceof Error) {
      el.innerText = error.message;
    } else {
      el.innerText = error;
    }
  }
}

/**
 * @description Render a list of chat messages
 * @param {Array} messages The chat messages
 */
function renderChatMessage(messages) {
  const message_list = document.getElementById("message_list");

  messages
    .filter(m => m.content)
    .forEach(({ role, content }, i) => {
      const str =
        content.b64_json && "user" !== role
          ? `<img src="data:image/png;base64,${content.b64_json}">`
          : content.replace(/\n/g, "<br/>");

      const htmlContent = `<div class="row"><div class="col-1 text-end">${
        "user" === role ? human : robot
      }</div><div class="col-11 ${
        "user" === role ? "fst-italic" : ""
      }">${str}</div></div>`;

      const newListItem = document.createElement("li");
      newListItem.innerHTML = htmlContent;
      newListItem.classList.add("user" === role ? "bg-warning" : "text-dark");
      newListItem.classList.add("list-group-item");
      message_list.appendChild(newListItem);
    });

  setTimeout(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, 100);
}

/**
 * @description Render chat messages
 * @param {Array} messages The chat messages
 */
function renderChatMessages(messages) {
  // clear all rendered messages
  const listItems = document
    .getElementById("message_list")
    .querySelectorAll("li");

  for (var i = 0; i < listItems.length; i++) {
    var listItem = listItems[i];
    listItem.parentNode.removeChild(listItem);
  }

  // render again all messages
  renderChatMessage(messages);
}

/**
 * @description Render a sent message response
 * @param {string} message The message sent
 * @param {Object} response The response object
 */
function renderSendMessageResponse(message, response) {
  if (response instanceof Error) {
    renderError(response);
  } else if (response.error) {
    renderError(response.error);
  } else {
    messages.push(
      { role: "user", content: message },
      {
        role: "assistant",
        content: response.b64_json ? response : response.response
      }
    );

    renderChatMessage(messages.slice(messages.length - 2));
  }
}

/**
 * @description Sends a request to the backend
 * @param {string} url The request url address
 * @param {string} method The request method
 * @param {string} [body] The JSON object, if any
 * @returns {Promise} Returns a promise that resolves the response
 */
async function sendRequest(url, method, obj) {
  const options = {
    method,
    headers: {},
    mode: "cors",
    cache: "no-cache",
    credentials: "omit",
    redirect: "follow",
    referrerPolicy: "no-referrer"
  };

  if (obj) {
    options.body = JSON.stringify(obj);
  }
  if (["GET", "POST"].includes(method)) {
    options.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error("Unexpected fetch response");
  }

  if (["GET", "POST"].includes(method)) {
    return await response.json();
  }

  return true;
}

/**
 * @description Fetch the chat messages history list
 * @returns Promise Returns a promise that resolves to the chat message history list
 * @throws {Error}
 */
function getHistory() {
  return sendRequest("/history", "GET");
}

/**
 * @description Send the user chat message
 * @param {string} message The user message
 * @returns {Promise} Returns a promise that resolves to the ChatGPT response
 * @throws {Error}
 */
async function sendMessage(message) {
  if (!message) {
    throw new Error("Invalid message");
  }

  return sendRequest("/chat", "POST", { message });
}

/**
 * @description Send the image create request
 * @param {string} message The user message
 * @returns {Promise} Returns a promise that resolves to the image response
 * @throws {Error}
 */
async function generateImage(message) {
  if (!message) {
    throw new Error("Invalid message");
  }

  return sendRequest("/image", "POST", { message });
}

/**
 * @description Clear chat message history
 * @returns {Promise} Returns a promise that resolves the clearing of chat history
 * @throws {Error}
 */
async function clearHistory() {
  return sendRequest("/history", "DELETE");
}

/**
 * @description Set the clear history button state
 */
function setClearHistoryState() {
  const clear_history = document.getElementById("clear_history");

  if (messages.length) {
    clear_history.removeAttribute("disabled");
  } else {
    clear_history.setAttribute("disabled", true);
  }
}

function saveSettings() {
  const form = document.querySelector("#modal_settings form");

  const settings = Array.from(form.querySelectorAll("input,select")).reduce(
    (carry, el) => Object.assign(carry, { [el.id]: el.value }),
    {}
  );

  return sendRequest("/settings", "POST", settings);
}

/**
 * @description Initialize the UI
 */
async function initUI() {
  setClearHistoryState();

  // handle send message form submit
  document.querySelector("form.chat").onsubmit = async e => {
    e.preventDefault();
    e.stopPropagation();

    const input = document.querySelector("form.chat input");

    toggleSendState(true);

    // hide error
    renderError();

    try {
      if ("chat" === window.OPENAI_API_TYPE) {
        const response = await sendMessage(input.value);
        renderSendMessageResponse(input.value, response);
      } else if ("image" === window.OPENAI_API_TYPE) {
        const response = await generateImage(input.value);

        renderSendMessageResponse(input.value, response);
      }

      setClearHistoryState();

      input.value = "";
    } catch (error) {
      renderError(error);
    }

    toggleSendState(false);
  };

  // handle clear history click
  document.getElementById("clear_history").onclick = async e => {
    // hide error
    renderError();

    try {
      const response = await clearHistory();

      messages = [];
      renderChatMessages(messages);
      setClearHistoryState();
    } catch (e) {
      console.error(e);
    }
  };

  // handle settings close error click
  document.querySelector("#modal_settings div.error button").onclick = e => {
    document.querySelector("#modal_settings div.error").classList.add("d-none");
  };

  // handle settings save click
  document.querySelector(
    "#modal_settings div.modal-footer button.btn-primary"
  ).onclick = async e => {
    // reset settings alert box
    renderError(null, document.getElementById("modal_settings"));

    const form = document.querySelector("form.needs-validation");

    // validate settings before save
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
    } else {
      try {
        const { OPENAI_MODEL, OPENAI_API_TYPE } = await saveSettings();

        window.location.reload();
      } catch (error) {
        renderError(error, document.getElementById("modal_settings"));
      }
    }
  };

  // hide error
  renderError();

  // if runtime API KEY not set
  if (["", "undefined"].includes("%OPENAI_API_KEY%")) {
    setTimeout(() => {
      document.querySelector('div[data-bs-target="#modal_settings"]').click();
    }, 500);
  }

  // fetch message history
  try {
    response = await getHistory();

    if (response.messages) {
      renderChatMessages(response.messages);
      setClearHistoryState();
    } else {
      renderError(response);
    }
  } catch (error) {
    renderError(error);
  }
}

initUI()
  .then(() => {})
  .catch(e => {
    console.error(e);
  });
