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

  async getYDoc(garden, path) {
    const yDocKey = `${garden}#${path}`;
    if (this.yDocs.has(yDocKey)) {
      return this.yDocs.get(yDocKey);
    }

    const isHost = this.manager.state === 'host';

    console.log(`[YDocManager] Creating new Y.Doc for ${yDocKey}. Is Host: ${isHost}`);
    const yDoc = new Y.Doc();
    this.yDocs.set(yDocKey, yDoc);

    const debouncedSave = debounce(async () => {
      try {
        const content = yDoc.getText('codemirror').toString();
        const gitClient = await this.sync.workspace.getGitClient(garden);
        
        console.log(`[YDocManager/debouncedSave] Saving content for ${yDocKey} to IndexedDB.`);
        await gitClient.writeFile(path, content);
        
        this.sync.workspace.notifyFileUpdate(garden, path, 'live-sync');

      } catch (e) {
          console.error(`[YDocManager/debouncedSave] FAILED to save content for ${yDocKey}:`, e);
      }
    }, 1000);
    this.debouncedSavers.set(yDocKey, debouncedSave);

    yDoc.on('update', (update, origin) => {
      console.log(`[YDocManager/onUpdate] EVENT FIRED FOR ${yDocKey}. Origin: "${origin}"`);
      if (origin !== 'remote-sync') {
        const payload = {
          type: 'MSG_LIVESYNC_YJS_UPDATE',
          garden: garden, 
          path: path, 
          update: Array.from(update)
        };
        console.log(`[YDocManager/onUpdate] LOCAL CHANGE DETECTED. CALLING sync.sendSyncMessage.`);
        
        // --- THIS IS THE FUCKING FIX ---
        // Calling the correct, simplified function signature. This WILL send the message.
        this.sync.sendSyncMessage(payload, null, false); 
        // --- END OF FIX ---
      }
      debouncedSave();
    });

    if (!isHost) {
      console.log(`[YDocManager] FOLLOWER requesting initial state for ${yDocKey} from host.`);
      this.sync.sendSyncMessage({ type: 'MSG_LIVESYNC_REQUEST_DOC_STATE', file: { garden, path } }, this.manager.hostId, false);
    } else {
      console.log(`[YDocManager] HOST is populating initial Y.Doc content for ${yDocKey} from its file system.`);
      try {
        const git = await this.sync.workspace.getGitClient(garden);
        const content = await git.readFile(path);
        if (this.yDocs.has(yDocKey)) {
          yDoc.getText('codemirror').insert(0, content);
        }
      } catch (err) {
        console.error(`[YDocManager] Host FAILED to load initial content for ${yDocKey}:`, err);
      }
    }
    
    return yDoc;
  }

  destroyAll() {
    this.yDocs.forEach(doc => doc.destroy());
    this.yDocs.clear();
    this.debouncedSavers.clear();
  }
}