const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");

dotenv.config();

let OPENAI_MODEL = "gpt-3.5-turbo";
let OPENAI_MODELS = { default: [{ id: OPENAI_MODEL }] };
let OPENAI_API_TYPE = "chat";
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// create the OpenAI configuration for API access
let configuration;

//create the OpenAI api instance
let openai;

const initModels = () =>
  openai.listModels().then(res => {
    if (200 === res.status) {
      OPENAI_MODELS = {};
      res.data.data.sort((a, b) => (a.id >= b.id ? 1 : a.id < b.id ? -1 : 0));
      res.data.data.forEach(model => {
        const group = model.id.replace(/([^-]+-[^-]+).*/g, "$1");

        if (group.startsWith("gpt") || group.startsWith("text-davinci")) {
          OPENAI_MODELS[group] = OPENAI_MODELS[group] || [];

          OPENAI_MODELS[group].push(model);
          //OPENAI_MODELS[group].sort();
        }
      });
    }

    return res;
  });

const init = () => {
  if (!OPENAI_API_KEY) {
    return Promise.resolve({});
  }

  // create the OpenAI configuration for API access
  configuration = new Configuration({
    apiKey: OPENAI_API_KEY
  });

  //create the OpenAI api instance
  openai = new OpenAIApi(configuration);

  return initModels();
};

// Create an express application
const app = express();

// Use the express.json middleware to parse JSON requests
app.use(express.json());

// store the chat history
const chatHistory = [];

// the route for updating the settings
app.post("/settings", async (req, res) => {
  try {
    const { openai_model, openai_api_key, openai_api_type } = req.body;

    const models = Object.keys(OPENAI_MODELS).reduce(
      (carry, group) => carry.concat(...OPENAI_MODELS[group]),
      []
    );
    if (models.some(({ id }) => id === openai_model)) {
      OPENAI_MODEL = openai_model;
    }
    OPENAI_API_KEY = openai_api_key;
    OPENAI_API_TYPE = openai_api_type;

    await init();

    res.json({ OPENAI_MODEL, OPENAI_API_KEY, OPENAI_API_TYPE });
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
});

// the route for processing the chat message
app.post("/chat", async (req, res) => {
  try {
    // Get the user message from the request body
    const userMessage = req.body.message;

    // Write your chat logic here using the openai object
    // For example, you can use openai.Completion to generate a response
    // See https://github.com/openai/openai-node for more details

    // Call the chat function and get the response
    const response = await chat(userMessage);

    // Send the response back to the client as JSON
    res.json({ response });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// the route for getting the chat message history
app.get("/history", async (req, res) => {
  try {
    // create the chat context by iterating over the history
    const messages = chatHistory.map(([role, content]) => ({
      role,
      content
    }));
    res.send({ messages });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// the route for pruning the chat history
app.delete("/history", async (req, res) => {
  try {
    while (chatHistory.length) {
      chatHistory.pop();
    }

    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// the route for generating an image
app.post("/image", async (req, res) => {
  try {
    // Get the user message from the request body
    const userMessage = req.body.message;

    const response = await image(userMessage);

    res.json(response);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// the home route
app.get("/", async (req, res) => {
  try {
    const openai_models = Object.keys(OPENAI_MODELS)
      .map(
        group =>
          `<optgroup label="${group}">${OPENAI_MODELS[group].map(
            ({ id }) =>
              `<option ${
                id === OPENAI_MODEL ? "selected" : ""
              } value="${id}">${id}</option>`
          )}<optgroup/>`
      )
      .join("");

    const openai_type = ["chat", "image"].map(
      type =>
        `<option ${
          type === OPENAI_API_TYPE ? "selected" : ""
        } value="${type}">${type}</option>`
    );

    const html = fs
      .readFileSync(path.resolve(__dirname, "index.html"))
      .toString();
    const js = fs
      .readFileSync(path.resolve(__dirname, "index.html.js"))
      .toString();

    res
      .setHeader("Content-Type", "text/html")
      .status(200)
      .send(
        html
          .replace("// index.html.js script placeholder", js)
          .replace(/%OPENAI_MODEL%/g, OPENAI_MODEL)
          .replace(
            /%OPENAI_MODEL_GROUP%/g,
            OPENAI_MODEL.replace(/([^-]+-[^-]+).*/g, "$1").replace(/\./g, "-")
          )
          .replace(/%OPENAI_MODELS%/g, openai_models)
          .replace(/%OPENAI_TYPES%/g, openai_type)
          .replace(/%OPENAI_API_KEY%/g, OPENAI_API_KEY)
          .replace(/%OPENAI_API_TYPE%/g, OPENAI_API_TYPE)
      );
  } catch (error) {
    res.status(500).send(error.message);
  }
});

/**
 * @description Push the message to chatGPT
 * @param {string} userMessage The user message
 * @returns {Promise}
 */
async function chat(userMessage) {
  // create the chat context by iterating over the history
  const messages = chatHistory
    .filter(([role, content]) => !content.b64_json)
    .map(([role, content]) => ({
      role,
      content
    }));

  // Add latest user message
  messages.push({ role: "user", content: userMessage });

  // Call the API with user input & history
  const completion = await openai.createChatCompletion({
    model: OPENAI_MODEL,
    messages: messages
  });

  // Get completion text/content
  const completionText = completion.data.choices[0].message.content;

  // Update history with user input and assistant response
  chatHistory.push(["user", userMessage]);
  chatHistory.push(["assistant", completionText]);

  return completionText;
}

/**
 * @description Push the message to chatGPT
 * @param {string} userMessage The user message
 * @returns {Promise}
 */
async function image(userMessage) {
  // create the chat context by iterating over the history
  const messages = chatHistory.map(([role, content]) => ({
    role,
    content
  }));

  // Add latest user message
  messages.push({ role: "user", content: userMessage });

  const res = await openai.createImage({
    n: 1,
    size: "256x256",
    response_format: "b64_json",
    prompt: userMessage
  });

  // Get completion image/content
  const data = res.data.data[0];

  // Update history with user input and assistant response
  chatHistory.push(["user", userMessage]);
  chatHistory.push(["assistant", data]);

  return data;
}

init().catch(error => {
  console.error(error.message);
});

// Start listening on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
