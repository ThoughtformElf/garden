import { Modal } from '../../../util/modal.js';

export class ModalHandler {
  constructor(syncInstance) {
    this.sync = syncInstance;
    this.modal = null;
    this.logArea = null;
    this.finalMessageArea = null;
    this.actionButton = null;
  }

  show() {
    if (this.modal) this.modal.destroy();
    this.modal = new Modal({ title: 'File Sync Progress' });
    const content = `
      <div id="sync-progress-log" style="height: 300px; overflow-y: auto; border: 1px solid var(--color-border-primary); padding: 1rem; background-color: var(--base-dark); margin-bottom: 1rem;"></div>
      <div id="sync-progress-final-message" style="font-weight: bold; padding: 5px; min-height: 20px;"></div>
    `;
    this.modal.updateContent(content);
    this.logArea = this.modal.content.querySelector('#sync-progress-log');
    this.finalMessageArea = this.modal.content.querySelector('#sync-progress-final-message');
    this.actionButton = this.modal.addFooterButton('Cancel', () => this.sync.fileSync.cancelSync());
    this.modal.show();
  }

  hide() {
    if (this.modal) {
      this.sync.fileSync.resetFullSyncState();
      this.modal.destroy();
      this.modal = null;
    }
  }

  update(event) {
    const { message = 'No message', type = 'info' } = event.detail;

    if (!this.modal) this.show();
    if (!this.logArea) return;

    const logEntry = document.createElement('div');
    logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`; // Use innerHTML for potential styling
    logEntry.style.marginBottom = '5px';
    
    switch (type) {
      case 'error': logEntry.style.color = 'var(--base-accent-destructive)'; break;
      case 'complete': logEntry.style.color = 'var(--base-accent-action)'; break;
      case 'cancelled': logEntry.style.color = 'var(--base-accent-warning)'; break;
      default: logEntry.style.color = 'var(--color-text-primary)'; break;
    }
    this.logArea.appendChild(logEntry);
    this.logArea.scrollTop = this.logArea.scrollHeight;

    if (type === 'complete' || type === 'error' || type === 'cancelled') {
        if (this.finalMessageArea) {
            this.finalMessageArea.textContent = message;
            this.finalMessageArea.style.color = logEntry.style.color;
        }
        if (this.actionButton) this.actionButton.remove();
        
        if (type === 'complete') {
            setTimeout(() => this.hide(), 3000);
        } else {
            this.actionButton = this.modal.addFooterButton('Close', () => this.hide());
            if (type === 'error') this.actionButton.classList.add('destructive');
        }
    }
  }
}