const socket = io();
let userName = localStorage.getItem("chatUserName");

if (!userName) {
  userName = prompt("Enter your display name:");
  if (userName) {
    localStorage.setItem("chatUserName", userName);
    socket.emit("set username", userName);
  }
}

const chatForm = document.getElementById("chat-form");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");

socket.on("chat message", (data) => {
  const msgElement = document.createElement("div");
  msgElement.classList.add("message");
  msgElement.innerHTML = `<strong>${data.name}</strong>: ${data.message} <span class="timestamp">[${data.time}]</span>`;
  chatBox.appendChild(msgElement);
  chatBox.scrollTop = chatBox.scrollHeight;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    socket.emit("chat message", { message, name: userName });
    messageInput.value = "";
  }
});

socket.on("admin broadcast", (data) => {
  const notice = document.createElement("div");
  notice.classList.add("admin-broadcast");
  notice.innerHTML = `<em>Admin: ${data.message} <span class="timestamp">[${data.time}]</span></em>`;
  chatBox.appendChild(notice);
  chatBox.scrollTop = chatBox.scrollHeight;
});