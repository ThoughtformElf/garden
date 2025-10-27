import * as Y from 'yjs';
import { Git } from '../../../util/git-integration.js';

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class YDocManager {
  constructor(manager) {
    this.manager = manager;
    this.sync = manager.sync;
    this.yDocs = new Map();
    this.debouncedSavers = new Map();
  }

  async getYDoc(garden, path, isHost) {
    const yDocKey = `${garden}#${path}`;
    if (this.yDocs.has(yDocKey)) {
      return this.yDocs.get(yDocKey);
    }

    console.log(`[LiveSync-YDoc] Creating new Y.Doc for ${yDocKey}`);
    const yDoc = new Y.Doc();
    this.yDocs.set(yDocKey, yDoc);

    const debouncedSave = debounce(async () => {
      try {
        const content = yDoc.getText('codemirror').toString();
        const gitClient = await this.sync.workspace.getGitClient(garden);
        
        console.log(`[LiveSync-YDoc] Debounced save triggered for ${yDocKey}. Writing to IndexedDB.`);
        await gitClient.writeFile(path, content);
        
        this.sync.workspace.notifyFileUpdate(garden, path, 'live-sync');

      } catch (e) {
          console.error(`[LiveSync-YDoc] Failed to save debounced content for ${yDocKey}:`, e);
      }
    }, 1000);
    this.debouncedSavers.set(yDocKey, debouncedSave);

    yDoc.on('update', (update, origin) => {
      if (origin !== 'remote-sync') {
        this.sync.sendSyncMessage({
          type: 'MSG_LIVESYNC_YJS_UPDATE',
          garden: garden, path: path, update: Array.from(update)
        }, null, false); // useGossip = false
      }
      debouncedSave();
    });

    if (isHost) {
      console.log(`[LiveSync-YDoc] Host is populating initial Y.Doc content for ${yDocKey}`);
      try {
        const git = await this.sync.workspace.getGitClient(garden);
        const content = await git.readFile(path);
        if (this.yDocs.has(yDocKey)) {
          yDoc.getText('codemirror').insert(0, content);
        }
      } catch (err) {
        console.error(`[LiveSync-YDoc] Host failed to load initial content for ${yDocKey}:`, err);
      }
    } else {
      console.log(`[LiveSync] Follower requesting initial state for ${yDocKey} from host.`);
      this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_REQUEST_DOC_STATE', file: { garden, path } }, this.manager.hostId, false); // useGossip = false
    }
    
    return yDoc;
  }

  destroyAll() {
    this.yDocs.forEach(doc => doc.destroy());
    this.yDocs.clear();
    this.debouncedSavers.clear();
  }
}