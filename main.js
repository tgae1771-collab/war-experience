
import { registerApp, openApp, home } from './core.js';
import { registerApps } from './apps.js';
import { initialStoryState } from './story.js';

const FLOW_ID = 'flow';

function getFlowState() {
  try {
    const raw = localStorage.getItem(FLOW_ID);
    return raw ? JSON.parse(raw) : initialStoryState();
  } catch {
    return initialStoryState();
  }
}

function saveFlowState(state) {
  localStorage.setItem(FLOW_ID, JSON.stringify(state));
}

const core = { registerApp, openApp };
const appList = registerApps(core);

console.log('등록된 앱 목록:', Object.keys(appList));

for (const app of Object.values(appList)) {
  registerApp({
    id: app.id,
    name: app.title,

    render(root) {
      const state = getFlowState();

      const ctx = {
        state,
        openApp,

        setNode(nodeId) {
          state.node = nodeId;
          saveFlowState(state);
        }
      };

      app.render(root, ctx);
    }
  });
}

home();
