# chatgpt-chatbot

This is a web based ChatGPT chatbot written in Node.js

## Usage

Get your OpenAI API key at https://platform.openai.com/account/api-keys

Create a file named `.env` and add the following:

```
OPENAI_API_KEY=YOURKEY
```

Install dependencies:

```bash
npm Install
```

Run the chatbot:

```bash
npm start
```

Run the chatbot as a Docker container:

```bash
docker compose up
```

Run the chatbot as a Docker container from its public Docker image:

```bash
docker run -p 3000:3000 -it docker.pkg.github.com/eugenmihailescu/chatgpt-chatbot/chatgpt-chatbot:v1
```
