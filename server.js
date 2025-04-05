const express = require("express");
const session = require("express-session");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

const users = JSON.parse(fs.readFileSync("users.json"));
const chatTogglePath = "chatToggle.json";
const historyPath = "chatHistory.json";

function isAuthenticated(req) {
  return req.session && req.session.user;
}

app.get("/", (req, res) => {
  if (!isAuthenticated(req)) return res.redirect("/login");

  const toggle = JSON.parse(fs.readFileSync(chatTogglePath));
  if (toggle.chatEnabled) {
    res.sendFile(path.join(__dirname, "public", "chat.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "blog.html"));
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", async (req, res) => {
  const { username, password, remember } = req.body;
  const user = users.find((u) => u.username === username);
  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.user = username;
    if (remember) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
    res.redirect("/");
  } else {
    res.send("Invalid credentials");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/admin", (req, res) => {
  if (req.session.user === "admin") {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } else {
    res.send("Access Denied");
  }
});

app.post("/toggle-chat", (req, res) => {
  if (req.session.user === "admin") {
    const toggle = JSON.parse(fs.readFileSync(chatTogglePath));
    toggle.chatEnabled = !toggle.chatEnabled;
    fs.writeFileSync(chatTogglePath, JSON.stringify(toggle));
    res.redirect("/admin");
  } else {
    res.status(403).send("Forbidden");
  }
});

app.post("/broadcast", express.urlencoded({ extended: true }), (req, res) => {
  if (req.session.user === "admin") {
    const message = req.body.message;
    const timestamp = new Date().toLocaleString();
    io.emit("admin broadcast", { message, time: timestamp });
    res.redirect("/admin");
  } else {
    res.status(403).send("Forbidden");
  }
});

io.on("connection", (socket) => {
  socket.on("set username", (name) => {
    socket.username = name;
  });

  socket.on("chat message", (data) => {
    const timestamp = new Date().toLocaleString();
    const chatEntry = {
      name: data.name,
      message: data.message,
      time: timestamp,
    };
    io.emit("chat message", chatEntry);

    const history = JSON.parse(fs.readFileSync(historyPath));
    history.push(chatEntry);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));