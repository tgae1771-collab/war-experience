// Shared shell only. App content lives in apps.js and story.js.
const STORAGE_KEY = 'phone-story-starter:v1'; // Change this for each new service.
const screen = document.querySelector('#screen');
const apps = new Map();
let state = load();

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (value?.version === 1 && value.apps && typeof value.apps === 'object' && !Array.isArray(value.apps)) return value;
  } catch { /* Missing, corrupt or blocked storage: start in memory. */ }
  return { version: 1, apps: {} };
}

// Use textContent for all story text, including future user-provided text.
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function getState(id, initialValue) {
  return structuredClone(Object.hasOwn(state.apps, id) ? state.apps[id] : initialValue);
}

export function setState(id, value) {
  // Plain JSON data only. Do not store DOM nodes, callbacks or secrets.
  const plain = JSON.parse(JSON.stringify(value));
  Object.defineProperty(state.apps, id, { value: plain, writable: true, enumerable: true, configurable: true });
  const notice = document.querySelector('#storage-status');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notice.hidden = true;
  } catch {
    notice.textContent = '이 브라우저에서는 진행을 저장할 수 없습니다.';
    notice.hidden = false;
  }
}

export function registerApp({ id, name, icon = '□', render }) {
  if (!/^[a-z][a-z0-9-]*$/.test(id) || apps.has(id) || typeof render !== 'function') {
    throw new Error('앱 ID는 중복되지 않는 영문 소문자·숫자·하이픈이어야 합니다.');
  }
  apps.set(id, { id, name, icon, render });
}


function getAppArtwork(id) {
  const artwork = {
    lock: `
      <defs>
        <linearGradient id="g" x2="1" y2="1">
          <stop stop-color="#5269d9"/>
          <stop offset="1" stop-color="#273c80"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill="url(#g)"/>
      <rect x="32" y="44" width="36" height="29" rx="7" fill="white"/>
      <path d="M39 44V34a11 11 0 0 1 22 0v10" fill="none" stroke="white" stroke-width="7"/>
      <circle cx="50" cy="57" r="3" fill="#5269d9"/>
    `,
    messages: `
      <defs>
        <linearGradient id="g" x2="1" y2="1">
          <stop stop-color="#55df80"/>
          <stop offset="1" stop-color="#12a94e"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill="url(#g)"/>
      <path d="M19 31Q19 23 29 23H72Q82 23 82 33V60Q82 70 72 70H48L29 83V70Q19 70 19 60Z" fill="white"/>
    `,
    sns: `
      <defs>
        <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
          <stop stop-color="#ffbd45"/>
          <stop offset=".45" stop-color="#f13b76"/>
          <stop offset="1" stop-color="#873de1"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill="url(#g)"/>
      <rect x="24" y="24" width="52" height="52" rx="16" fill="none" stroke="white" stroke-width="6"/>
      <circle cx="50" cy="50" r="12" fill="none" stroke="white" stroke-width="6"/>
      <circle cx="68" cy="33" r="4" fill="white"/>
    `,
    news: `
      <rect width="100" height="100" rx="23" fill="#e73542"/>
      <path d="M27 75V25H40L67 55V25H80V75H67L40 45V75Z" fill="white"/>
    `,
    reflect: `
      <rect width="100" height="100" rx="23" fill="#7866d9"/>
      <rect x="27" y="17" width="48" height="66" rx="7" fill="white"/>
      <path d="M38 36H64M38 47H64M38 58H59" stroke="#7866d9" stroke-width="5" stroke-linecap="round"/>
    `
  };

  const svg = artwork[id] || artwork.reflect;

  return 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${svg}</svg>`
    );
}


export function home() {
  const page = element('div', undefined, 'home');

  // 상단 시계
  const top = element('div', undefined, 'home-top');

  top.append(
    element('div', '나의 휴대폰', 'home-greeting'),
    element(
      'div',
      new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date()),
      'home-time'
    )
  );

  page.append(top);

  // 홈 화면 앱 순서 고정
  const appOrder = ['lock', 'messages', 'sns', 'news', 'reflect'];

  const grid = element('div', undefined, 'app-grid');

  for (const id of appOrder) {
    const app = apps.get(id);
    if (!app) continue;

    const button = element('button', undefined, 'app-icon');
    button.type = 'button';

    const img = document.createElement('img');
    img.src = getAppArtwork(id);
    img.alt = app.name;
    img.className = 'app-artwork';

    const name = element('span', app.name, 'app-name');

    button.append(img, name);
    button.addEventListener('click', () => openApp(id));

    grid.append(button);
  }

  page.append(grid);

  // 하단 독에는 자주 사용하는 앱만 배치
  const dock = element('div', undefined, 'home-dock');

  const dockOrder = ['messages', 'sns', 'news'];

  for (const id of dockOrder) {
    const app = apps.get(id);
    if (!app) continue;

    const button = element('button', undefined, 'dock-icon');
    button.type = 'button';

    const img = document.createElement('img');
    img.src = getAppArtwork(id);
    img.alt = app.name;

    button.append(img);
    button.addEventListener('click', () => openApp(id));

    dock.append(button);
  }

  page.append(dock);

  screen.replaceChildren(page);
  paintClock();
}

export function openApp(id) {
  const app = apps.get(id);
  if (!app) return home();
  const header = element('header', undefined, 'app-head');
  const back = element('button', '‹ 홈', 'back');
  back.type = 'button';
  back.addEventListener('click', home);
  header.append(back, element('h1', app.name));
  const body = element('div', undefined, 'app-body');
  screen.replaceChildren(header, body);
  app.render(body);
  paintClock();
}

function paintClock() {
  document.querySelector('#clock').textContent = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
}
document.querySelector('#home').addEventListener('click', home);
