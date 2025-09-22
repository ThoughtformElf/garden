// src/devtools/sync-files.js
export class SyncFiles {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.gitClient = null;
  }

  setGitClient(gitClient) {
    this.gitClient = gitClient;
  }

  setupDataChannel(channel) {
    channel.onopen = () => {
      this.sync.isConnected = true;
      this.sync.updateStatus('Connected', this.sync.sessionCode);
      this.sync.ui.showMessages();
      this.sync.addMessage('Data channel opened');
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleSyncMessage(data);
      } catch (error) {
        console.error('Error parsing sync message:', error);
        this.sync.addMessage('Received: ' + event.data);
      }
    };
    
    channel.onclose = () => {
      this.sync.isConnected = false;
      this.sync.updateStatus('Disconnected', this.sync.sessionCode);
      this.sync.ui.hideMessages();
      this.sync.addMessage('Data channel closed');
    };
    
    channel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.sync.updateStatus('Data channel error: ' + error.message);
      this.sync.addMessage('Data channel error: ' + error.message);
    };
  }

  async handleSyncMessage(data) {
    switch (data.type) {
      case 'file_update':
        await this.handleFileUpdate(data);
        break;
      case 'request_all_files':
        await this.handleRequestAllFiles();
        break;
      case 'all_files':
        await this.handleAllFiles(data);
        break;
      default:
        console.log('Unknown sync message type:', data.type);
    }
  }

  async handleFileUpdate(data) {
    if (!this.gitClient) {
      console.warn('Git client not set, cannot handle file update');
      return;
    }
    
    try {
      let currentContent = null;
      let currentTimestamp = 0;
      
      try {
        currentContent = await this.gitClient.readFile(data.path);
        try {
          const parsed = JSON.parse(currentContent);
          currentTimestamp = parsed.lastupdated || 0;
        } catch (e) {
          currentTimestamp = 0;
        }
      } catch (e) {
        currentContent = null;
        currentTimestamp = 0;
      }
      
      if (data.timestamp > currentTimestamp) {
        await this.gitClient.writeFile(data.path, data.content);
        this.sync.addMessage(`Updated file: ${data.path} (remote newer)`);
        console.log(`Sync: Updated ${data.path} from peer (timestamp ${data.timestamp} > ${currentTimestamp})`);
      } else {
        this.sync.addMessage(`Ignored update for: ${data.path} (local newer or same)`);
        console.log(`Sync: Ignored update for ${data.path} (timestamp ${data.timestamp} <= ${currentTimestamp})`);
      }
    } catch (error) {
      console.error('Error handling file update:', error);
      this.sync.addMessage(`Error updating file ${data.path}: ${error.message}`);
    }
  }

  async handleRequestAllFiles() {
    if (!this.gitClient) {
      console.warn('Git client not set, cannot send all files');
      return;
    }
    
    try {
      const files = await this.getAllFiles();
      
      for (const file of files) {
        try {
          const content = await this.gitClient.readFile(file);
          let timestamp = 0;
          
          try {
            const parsed = JSON.parse(content);
            timestamp = parsed.lastupdated || 0;
          } catch (e) {
            timestamp = 0;
          }
          
          this.sync.sendSyncMessage({
            type: 'file_update',
            path: file,
            content: content,
            timestamp: timestamp
          });
        } catch (e) {
          console.warn(`Could not read file ${file} for sync:`, e);
        }
      }
      
      this.sync.addMessage('Sent all files to peer');
    } catch (error) {
      console.error('Error sending all files:', error);
      this.sync.addMessage(`Error sending all files: ${error.message}`);
    }
  }

  async handleAllFiles(data) {
    this.sync.addMessage('Received all files from peer');
  }

  async getAllFiles() {
    if (!this.gitClient) {
      return [];
    }
    
    try {
      const files = await this.gitClient.listFiles(this.gitClient, '/');
      return files.filter(file => file !== '/.git');
    } catch (error) {
      console.error('Error getting file list:', error);
      return [];
    }
  }

  async syncAllFiles() {
    if (!this.sync.isConnected || !this.gitClient) {
      this.sync.addMessage('Not connected or git client not set');
      return;
    }
    
    try {
      this.sync.addMessage('Syncing all files...');
      const files = await this.getAllFiles();
      
      for (const file of files) {
        try {
          const content = await this.gitClient.readFile(file);
          let timestamp = 0;
          
          try {
            const parsed = JSON.parse(content);
            timestamp = parsed.lastupdated || 0;
          } catch (e) {
            timestamp = 0;
          }
          
          this.sync.sendFileUpdate(file, content, timestamp);
        } catch (e) {
          console.warn(`Could not read file ${file} for sync:`, e);
        }
      }
      
      this.sync.addMessage('Synced all files with peer');
    } catch (error) {
      console.error('Error syncing all files:', error);
      this.sync.addMessage(`Error syncing all files: ${error.message}`);
    }
  }

  requestAllFiles() {
    if (!this.sync.isConnected) {
      this.sync.addMessage('Not connected to peer');
      return;
    }
    
    this.sync.sendSyncMessage({
      type: 'request_all_files'
    });
    
    this.sync.addMessage('Requested all files from peer');
  }

  sendFileUpdate(path, content, timestamp) {
    this.sync.sendSyncMessage({
      type: 'file_update',
      path: path,
      content: content,
      timestamp: timestamp
    });
  }

  destroy() {
    // Cleanup if needed
  }
}