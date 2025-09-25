# Thoughtform.Garden

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
1.  **Clone the repository and install dependencies:**
```bash
git clone https://github.com/thoughtforms/garden.git
cd garden
npm install
```
2.  **Run the development server:**
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

### Navigation & Shortcuts
Quickly navigate between files and to external websites directly from the editor.
-   **Follow a Link:** Use `Ctrl+Click` (desktop) or **long-press** (mobile) on any link.
-   **Navigate from Keyboard:** Place your cursor inside any link and press `Ctrl+Enter`.
    - `[[Wikilinks]]` navigate to other files within your garden.
    - `[Markdown](links)` and `https://naked.urls` open in a new browser tab.
-   **Toggle Sidebar:** `Ctrl+[`
-   **Toggle DevTools:** `Ctrl+\`` (backtick)

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

## Ambient, Peer-to-Peer (P2P) Synchronization

Thoughtform Garden features a persistent, self-healing P2P synchronization system using WebRTC. This transforms isolated browser tabs into a cohesive, multi-device swarm, allowing you to orchestrate an "agentic supercomputer" from any connected device.

### How It Works

1.  **Direct Connection (WebRTC):** The system prioritizes a direct, encrypted, peer-to-peer link between devices. This is ideal for fast, low-latency file transfers.
2.  **Coordination (WebSocket Signaling):** A lightweight WebSocket server helps devices find each other using a shared **Sync Name**, which acts as a persistent "room" for your devices to meet in.
3.  **Seamless Fallback (WebSocket Relay):** If a direct P2P link cannot be established (due to restrictive firewalls or NATs), the system automatically and seamlessly falls back to relaying encrypted file data through the WebSocket server. This ensures the connection always succeeds.
4.  **Self-Healing Network:** The network is designed for resilience. If the device that initiated the session (the "host") disconnects, another peer will automatically take over, re-establish the session, and allow all other devices to rejoin without any manual intervention.

### Configuring Your Sync Swarm

1.  **Open DevTools:** Navigate to the **Sync** tab.
2.  **Set a Sync Name:** Enter a unique, memorable name for your device group (e.g., `my-device-swarm`). This is your shared secret.
3.  **Enable Auto-Connect (Optional):** Check the "Auto-connect on startup" box to have this device automatically join the swarm every time you load the page.
4.  **Connect:** Click "Connect". Repeat this process on your other devices using the *exact same* Sync Name.
5.  **Monitor Status:** The **Sync** tab in DevTools will have a colored dot indicating the connection quality:
    -   **Yellow Dot:** Connecting, or connected via the reliable WebSocket fallback.
    -   **Green Dot:** Connected via a high-speed, direct P2P WebRTC link.

Once connected, use the "Send All Files" or "Request All Files" buttons to synchronize your gardens across the swarm.

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