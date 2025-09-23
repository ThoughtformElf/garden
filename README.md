# Thoughtform Garden

> An in-browser OS for vibe-driven development and agentic computing.<br>
> ![GitHub Repo stars](https://img.shields.io/github/stars/thoughtforms/garden)
![GitHub repo size](https://img.shields.io/github/repo-size/thoughtforms/garden)
![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/thoughtforms/garden)
![GitHub Issues](https://img.shields.io/github/issues/thoughtforms/garden)

---

**Thoughtform Garden** is an experimental, browser-based coding environment merging a personal knowledge base with a functional IDE. It's an "editor-first OS" designed for literate programming, self-improving code, and collaboration with AI agents.

This project is more than a tool; it's an exploration into the **Tao of Digital Gardening**—a practice of intentional interaction with information. It's a space to turn digital chaos into a garden of personal gnosis.

## Local Development
To run the project on your machine for development:
1.  **Clone the repository:**
```bash
git clone https://github.com/thoughtforms/garden.git
cd garden
```

2.  **Install dependencies:**
```bash
npm install
```
3.  **Run the development server:**

```bash
npm run dev
```

This will start a local server (usually at `http://localhost:5173`). The live instance is always available at [**thoughtform.garden**](https://thoughtform.garden), no registration needed.

***

## Getting Started: A Hands-On Guide
Thoughtform Garden is designed to be intuitive. Here are the key workflows.

### The Command Palette: Your Universal Interface
Access the Command Palette with two modes:
-   **Search Mode (`Ctrl+P`):** Find any file across all gardens instantly.
-   **Execute Mode (`Ctrl+Shift+P`):** Run any `.js` file within your current garden as a command.

### The Executable Layer: Creating Your Own Commands
Thoughtform Garden acts as a userscript manager for itself. Scripts have access to `editor` and `git` globals.

1.  **Create a script file:** E.g., `my-command.js`.
2.  **Write your script:**

```js
// Example: my-command.js
const currentDoc = editor.editorView.state.doc;
const newContent = currentDoc.toString() + `\n\nUpdated: ${new Date().toISOString()}`;

editor.editorView.dispatch({
  changes: { from: 0, to: currentDoc.length, insert: newContent }
});

await git.commit('Appended update timestamp via script');
console.log('Timestamp appended and committed successfully!');
```

3.  **Run your command:** Press `Ctrl+Shift+P`, type `my-command.js`, and press `Enter`.

### Multi-Workspace Management
Work is organized into "Gardens"—separate workspaces.
- **Switching Gardens**: Click the **Gardens** tab in the sidebar.
- **Managing Gardens**: **Right-click** (or **long-press** on mobile) in the Gardens view to create, duplicate, or delete gardens.

### File & Version Control
Each garden has a complete git-based workflow.
- **File Management**: **Right-click** (or **long-press**) on any file in the **Files** tab to `Rename`, `Duplicate`, or `Delete` it.
- **Git Workflow**: The **Git** tab provides staging, committing, viewing history, and diffing changes.

### Data Portability
Your data is yours. The **Data** tab in devtools gives you full control.
- **Selective Export**: Export selected gardens into a single `.zip` file.
- **Selective Import**: Import a `.zip` backup and choose which gardens to restore.
- **Clear Data**: Permanently delete selected gardens.

***

## Peer-to-Peer (P2P) File Synchronization

Thoughtform Garden features an experimental P2P file sync system using WebRTC, with a WebSocket fallback.

### How It Works (Simplified)

1.  **Direct Connection (WebRTC):** When two browsers connect, they attempt to establish a direct, encrypted link using WebRTC for fast file transfers.
2.  **Coordination (WebSocket Signaling):** A lightweight WebSocket server helps browsers find each other initially. This server does *not* normally relay file data.
3.  **Fallback (WebSocket Relay):** If a direct WebRTC link fails (due to firewalls/NATs), the system automatically uses the WebSocket server to relay the file data, ensuring sync always works.

### Using P2P Sync

-   **Start Session:** One user clicks "Start Sync Session" in DevTools. A code is generated.
-   **Join Session:** Another user clicks "Join a session" and enters the code.
-   **Transfer Files:** Use "Send All Files" or "Request All Files" buttons. The system prioritizes fast P2P but uses the WebSocket relay if needed.

This P2P system is a step towards the vision of ambient, multi-device computing.

***

## The Philosophy: A Cognitive Core
This is a system designed to become a direct extension of your mind—a version-controlled, locally-hosted environment for thought. By blending a journal, an IDE, and a knowledge graph, it facilitates a tight feedback loop between you and your digital self, augmented by AI.

## The Agentic Loop: Human + AI = AGI
The vision is a symbiotic partnership where human intent and AI execution blur. By giving an LLM access to its own source code, garden history, and API keys, the system becomes a "Test-Time Reinforcement Learning" environment. The agent updates context and prompts, enabling a powerful loop of self-improvement. This collaboration is a practical step towards an emergent, functional AGI.

---

## Roadmap: From Editor to Egregore
The current editor is the foundation. The future focuses on a fully ambient, multi-modal experience.
#### Phase 1: Quality of Life
- **Command Palette**: Universal finder for files.
- **Keyboard Shortcuts**: Customizable keymaps.
- **Enhanced Theming**: CSS variables for themes.
#### Phase 2: The OS Layer
- **Code Execution**: Execute editor code in a sandbox.
- **URL-Based Commands**: `?repo=` support for any git repository.
- **Environment Variables**: UI for managing API keys.
#### Phase 3: The Agentic Leap
- **Remote Sync & Collaboration**: `git push/pull` with auth.
- **LLM Integration**: Chat with an AI that has full garden context.
- **Device Swarms**: Ad-hoc multi-device computing clusters (WebRTC/WebSockets).
#### Phase 4: Full Embodiment
- **Visual & Multimodal Editing**: Node-based editors.
- **Sensor Integration**: Camera, microphone access.
- **Robotic Embodiment**: Stream context to/from robots.