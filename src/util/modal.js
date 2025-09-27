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

  /**
   * Shows a modal with multiple custom choices.
   * @param {Object} options
   * @param {string} options.title - The title of the modal.
   * @param {string} options.message - The HTML content/message for the modal.
   * @param {Array<{id: string, text: string, class?: string}>} options.choices - Array of choice objects for buttons.
   * @returns {Promise<string|null>} A promise that resolves with the ID of the chosen option, or null if cancelled.
   */
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
      
      // Allow Esc key to cancel
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          resolve(null); // Resolve with null on escape
          modal.destroy();
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      
      modal.show();
    });
  }
}