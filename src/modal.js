// src/modal.js
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
    
    this.footer = document.createElement('div');
    this.footer.className = 'modal-footer';
    this.footer.style.display = 'none'; // Hidden by default

    this.container.appendChild(this.header);
    this.container.appendChild(this.content);
    this.container.appendChild(this.footer);
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
  }

  show(contentHTML = 'Loading...') {
    this.updateContent(contentHTML);
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  destroy() {
    this.overlay.remove();
  }

  updateContent(html) {
    this.content.innerHTML = html;
  }
  
  addFooterButton(text, onClick) {
    this.footer.style.display = 'block';
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    this.footer.appendChild(button);
  }
}
