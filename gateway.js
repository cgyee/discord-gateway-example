import "dotenv/config";
import WebSocket from "ws";
import chalk from "chalk";

let ws;
let seq = null;
let sessionId = 0;
let ready = false;
const intialUrl = "wss://gateway.discord.gg/";
let url = intialUrl;
const payload = {
  op: 2,
  d: {
    token: process.env.TOKEN,
    intents: 512,
    properties: {
      os: "macos",
      browser: "chrome",
      device: "macbook air",
    },
  },
};

const heartbeat = (ms) => {
  console.log("🚀 ~ heartbeat ~ heartbeat:", ms);
  return setInterval(() => {
    ws.send(JSON.stringify({ op: 1, d: null }));
  }, ms);
};

const intializeWebsocket = () => {
  if (ws && ws.readyState !== 3) ws.close();
  ready = false;
  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    console.log(chalk.bgYellow("Opening Gateway Connection"));
    if (url !== intialUrl) {
      console.log(chalk.yellow("Resuming Gateway Connection"));
      ws.send(
        JSON.stringify({
          op: 6,
          d: { token: process.env.TOKEN, sessionId, seq },
        })
      );
    }
  });

  ws.addEventListener("close", () => {
    if (!ready) {
      console.log(chalk.bgRed("Connection closed"));
      ready = false;
    }
    setTimeout(() => {
      intializeWebsocket();
    }, 2000);
  });

  ws.addEventListener("error", (e) => {
    console.log(chalk.bgYellow(e));
  });

  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    const { t, op, d, s } = data;
    seq = s;
    console.log("Op code ", op);
    switch (op) {
      case 1:
        ws.send(JSON.stringify({ op: 1, d: seq | null }));
        console.log(
          chalk.yellow("~ Immediate heartbeat response requested ~ ", op)
        );
        break;

      case 10:
        const { heartbeat_interval } = d;
        console.log(
          "🚀 ~ ws.addEventListener ~ heartbeat_interval:",
          heartbeat_interval
        );

        const interval = heartbeat(heartbeat_interval);
        ready = true;
        if (url === intialUrl) ws.send(JSON.stringify(payload));
        break;

      case 11:
        console.log(chalk.green("Heartbeat acknowledged"));
        break;
    }
    switch (t) {
      case "READY":
        console.log(chalk.bgGreen("Gateway Connection Ready!!"));
        [url, sessionId] = [d.resume_gateway_url, d.session_id];
        console.log(
          "🚀 ~ ws.addEventListener ~ url, sessionId:",
          url,
          sessionId
        );
        break;

      case "RESUMED":
        console.log(chalk.bgBlue("Gateway Connection Resumed"));
        break;

      case "MESSAGE_CREATE":
        const { content } = d;
        const { username } = d?.author;
        console.log(chalk.blue(t));
        console.log(chalk.white(`${username} said: ${content}`));
        break;

      case "MESSAGE_UPDATE":
        console.log(chalk.blue(t));
        break;

      case "MESSAGE_DELETE":
        console.log(chalk.blue(t));
        break;
    }
  });
};

intializeWebsocket();
