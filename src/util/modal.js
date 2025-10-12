// src/util/modal.js
export class Modal {
  constructor({ title = 'Notice' } = {}) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';

    this.container = document.createElement('div');
    this.container.className = 'modal-container';

    this.header = document.createElement('div');
    this.header.className = 'modal-header';
    this.header.textContent = title;

    this.content = document.createElement('div');
    this.content.className = 'modal-content';
    this.content.innerHTML = 'Loading...'; // Default content
    
    this.footer = document.createElement('div');
    this.footer.className = 'modal-footer';
    this.footer.style.display = 'none';

    this.container.appendChild(this.header);
    this.container.appendChild(this.content);
    this.container.appendChild(this.footer);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  show() {
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  destroy() {
    if (this.overlay.parentNode) {
      this.overlay.remove();
    }
  }

  updateContent(html) {
    this.content.innerHTML = html;
  }
  
  addFooterButton(text, onClick) {
    this.footer.style.display = 'flex';
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    this.footer.appendChild(button);
    return button;
  }
  
  clearFooter() {
      this.footer.innerHTML = '';
      this.footer.style.display = 'none';
  }

  static prompt({ title, label, defaultValue = '' }) {
    return new Promise((resolve) => {
      const modal = new Modal({ title });

      const inputId = `modal-input-${Date.now()}`;
      const content = `
        <div class="modal-prompt">
          <label for="${inputId}">${label}</label>
          <input type="text" id="${inputId}" value="${defaultValue}">
        </div>
      `;
      modal.updateContent(content);

      const input = modal.content.querySelector(`#${inputId}`);
      
      const submit = () => {
        resolve(input.value);
        modal.destroy();
      };
      
      const cancel = () => {
        resolve(null);
        modal.destroy();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') {
          cancel();
        }
      });
      
      modal.addFooterButton('OK', submit);
      modal.addFooterButton('Cancel', cancel);

      modal.show();
      input.focus();
      input.select();
    });
  }

  static confirm({ title, message, okText = 'OK', cancelText = 'Cancel', destructive = false }) {
    return new Promise((resolve) => {
      const modal = new Modal({ title });
      modal.updateContent(`<p>${message}</p>`);

      const submit = () => {
        resolve(true);
        modal.destroy();
      };
      
      const cancel = () => {
        resolve(false);
        modal.destroy();
      };

      const okButton = modal.addFooterButton(okText, submit);
      if (destructive) {
        okButton.classList.add('destructive');
      }
      modal.addFooterButton(cancelText, cancel);
      
      modal.show();
    });
  }

  static choice({ title, message, choices }) {
    return new Promise((resolve) => {
      const modal = new Modal({ title });
      modal.updateContent(message);

      choices.forEach(choice => {
        const button = modal.addFooterButton(choice.text, () => {
          resolve(choice.id);
          modal.destroy();
        });
        if (choice.class) {
          button.classList.add(choice.class);
        }
      });
      
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          resolve(null);
          modal.destroy();
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      modal.show();
    });
  }

  /**
   * Shows a modal for selecting items grouped by a category (e.g., peers).
   * @param {Object} options
   * @param {string} options.title - The title for the modal.
   * @param {Map<string, {id: string, gardens: string[]}>} options.peerData - A map of peers and their data.
   * @param {string} options.okText - The text for the confirmation button.
   * @returns {Promise<Object|null>} A promise that resolves with the selection object or null if cancelled.
   *                                 Example selection: { 'peerId-123': ['gardenA'], 'peerId-456': ['gardenB'] }
   */
  static selection({ title, peerData, okText = 'Request' }) {
    return new Promise((resolve) => {
      if (peerData.size === 0) {
        // Show a simple info modal if there are no peers.
        const infoModal = new Modal({ title: 'No Peers Found' });
        infoModal.updateContent('<p>There are no other peers currently connected to this sync session.</p>');
        infoModal.addFooterButton('OK', () => {
            infoModal.destroy();
            resolve(null); // Resolve with null as there's nothing to select
        });
        infoModal.show();
        return;
      }
        
      const modal = new Modal({ title });
      let contentHTML = '<div class="peer-selection-container">';
      
      peerData.forEach((data, peerId) => {
        contentHTML += `
          <div class="peer-group" data-peer-id="${peerId}">
            <strong class="peer-title">Peer: ${data.id}</strong>
            <div class="garden-checkbox-list">
              ${data.gardens.map(garden => `
                <label>
                  <input type="checkbox" class="garden-select-checkbox" value="${garden}">
                  <span>${garden}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      });
      contentHTML += '</div>';

      modal.updateContent(contentHTML);

      const submit = () => {
        const selection = {};
        modal.content.querySelectorAll('.peer-group').forEach(group => {
          const peerId = group.dataset.peerId;
          const selectedGardens = Array.from(group.querySelectorAll('.garden-select-checkbox:checked')).map(cb => cb.value);
          if (selectedGardens.length > 0) {
            selection[peerId] = selectedGardens;
          }
        });
        resolve(Object.keys(selection).length > 0 ? selection : null);
        modal.destroy();
      };

      const cancel = () => {
        resolve(null);
        modal.destroy();
      };
      
      modal.addFooterButton(okText, submit);
      modal.addFooterButton('Cancel', cancel);
      modal.show();
    });
  }
  
  static sendSelection({ title, peerData, gardenData, okText = 'Send' }) {
    return new Promise((resolve) => {
      if (peerData.size === 0) {
        const infoModal = new Modal({ title: 'No Peers Found' });
        infoModal.updateContent('<p>There are no other peers currently connected to this sync session.</p>');
        infoModal.addFooterButton('OK', () => {
          infoModal.destroy();
          resolve(null);
        });
        infoModal.show();
        return;
      }

      const modal = new Modal({ title });

      const createChecklistUI = (groupTitle, items, isPeers = false) => {
        const groupIdentifier = groupTitle.replace(/\s/g, '');
        const itemCheckboxes = items.map(item => {
          const value = isPeers ? item.id : item;
          const label = isPeers ? item.id : item;
          return `
            <label>
              <input type="checkbox" class="modal-select-checkbox" data-group="${groupIdentifier}" value="${value}">
              <span>${label}</span>
            </label>
          `;
        }).join('');

        return `
          <div class="modal-selection-group" id="group-${groupIdentifier}">
            <strong>${groupTitle}</strong>
            <div class="modal-selection-controls">
              <button type="button" class="select-all-btn">Select All</button>
              <button type="button" class="select-none-btn">Deselect All</button>
            </div>
            <div class="modal-selection-list">${itemCheckboxes}</div>
          </div>
        `;
      };

      const peerItems = Array.from(peerData.values());

      let contentHTML = '<div class="modal-send-container">';
      contentHTML += createChecklistUI('Gardens to Send', gardenData);
      contentHTML += createChecklistUI('Peers to Receive', peerItems, true);
      contentHTML += '</div>';

      modal.updateContent(contentHTML);

      modal.content.querySelectorAll('.modal-selection-group').forEach(group => {
        group.querySelector('.select-all-btn').onclick = () => group.querySelectorAll('.modal-select-checkbox').forEach(cb => cb.checked = true);
        group.querySelector('.select-none-btn').onclick = () => group.querySelectorAll('.modal-select-checkbox').forEach(cb => cb.checked = false);
      });
      
      const submit = () => {
        const selectedGardens = Array.from(modal.content.querySelectorAll('#group-GardenstoSend .modal-select-checkbox:checked')).map(cb => cb.value);
        const selectedPeers = Array.from(modal.content.querySelectorAll('#group-PeerstoReceive .modal-select-checkbox:checked')).map(cb => cb.value);
        
        if (selectedGardens.length > 0 && selectedPeers.length > 0) {
          resolve({ gardens: selectedGardens, peers: selectedPeers });
        } else {
          resolve(null);
        }
        modal.destroy();
      };
      
      const cancel = () => {
        resolve(null);
        modal.destroy();
      };

      modal.addFooterButton(okText, submit);
      modal.addFooterButton('Cancel', cancel);
      modal.show();
    });
  }
}