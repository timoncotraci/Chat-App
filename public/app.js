// app.js - modern frontend client
const WS_URL = 'ws://localhost:8080'; // change if server runs on other host/port

// DOM
const statusEl = document.getElementById('status');
const userInfoEl = document.getElementById('userInfo');
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');
const nameModal = document.getElementById('nameModal');
const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const setNameBtn = document.getElementById('setNameBtn');
const clearBtn = document.getElementById('clearBtn');

// State
let ws = null;
let username = localStorage.getItem('chat_username') || '';
if (!username) openNameModal();
else setUser(username);

// Color generator (consistent by name)
function colorFor(name){
  let h = 0;
  for (let i=0;i<name.length;i++) h = (h<<5) - h + name.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

function openNameModal(){
  nameModal.classList.add('show');
  nameInput.value = username || '';
  nameInput.focus();
}

function closeNameModal(){
  nameModal.classList.remove('show');
}

// handle name save
nameForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const v = nameInput.value.trim();
  if (!v) return;
  setUser(v);
  closeNameModal();
});

// set user locally and update UI
function setUser(name){
  username = name;
  localStorage.setItem('chat_username', username);
  userInfoEl.textContent = `You: ${username}`;
  if (!ws || ws.readyState !== WebSocket.OPEN) connect();
}

// connect / reconnect
function connect(){
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', ()=> {
    statusEl.textContent = 'Connected';
    statusEl.classList.remove('offline'); statusEl.classList.add('online');
    // Announce presence (optional)
    ws.send(JSON.stringify({ type:'join', user: username, ts: Date.now() }));
  });

  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      // Accept messages shaped: {type?, user, text, ts}
      if (msg.type === 'join') {
        addSystem(`${msg.user} joined`);
        return;
      }
      addMessage(msg);
    } catch (err){
      // not JSON — show raw
      addMessage({ user: 'server', text: ev.data, ts: Date.now() });
    }
  });

  ws.addEventListener('close', ()=> {
    statusEl.textContent = 'Disconnected';
    statusEl.classList.remove('online'); statusEl.classList.add('offline');
    addSystem('Disconnected. Reconnecting in 2s...');
    setTimeout(connect, 2000);
  });

  ws.addEventListener('error', (err)=> {
    console.error('WS error', err);
  });
}

// message rendering
function addMessage(msg){
  // normalize
  const user = msg.user || 'Guest';
  const text = msg.text || '';
  const ts = msg.ts ? new Date(msg.ts) : new Date();
  const time = ts.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  const li = document.createElement('li');
  li.className = 'msg' + (user === username ? ' own' : '');

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.background = colorFor(user);
  avatar.textContent = user.slice(0,1).toUpperCase();

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `<strong>${escapeHtml(user)}</strong><div>${escapeHtml(text)}</div><div class="meta-line">${time}</div>`;

  li.appendChild(avatar);
  li.appendChild(bubble);

  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addSystem(text){
  const li = document.createElement('li');
  li.style.textAlign = 'center';
  li.style.color = 'var(--muted)';
  li.style.fontSize = '0.9rem';
  li.textContent = text;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// send message
function sendMessage(text){
  if (!text) return;
  const payload = { user: username || 'Guest', text: text, ts: Date.now() };
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    // echo locally (server will also broadcast, duplications possible if server also rebroadcasts)
  } else {
    addSystem('Message queued: reconnecting...');
  }
}

// helpers
function escapeHtml(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// UI bindings
document.getElementById('compose').addEventListener('submit', (e)=>{
  e.preventDefault();
  const v = inputEl.value.trim();
  if (!v) return;
  sendMessage(v);
  inputEl.value = '';
});

setNameBtn.addEventListener('click', openNameModal);
clearBtn.addEventListener('click', ()=> messagesEl.innerHTML = '');

// start
if (username) connect();
else openNameModal();
