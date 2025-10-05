# Thoughtform.Garden

> An in-browser OS for vibe-driven development and agentic computing.<br>
> ![GitHub Repo stars](https://img.shields.io/github/stars/thoughtforms/garden)![GitHub repo size](https://img.shields.io/github/repo-size/thoughtforms/garden)![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/thoughtforms/garden)![GitHub Issues](https://img.shields.io/github/issues/thoughtforms/garden)

---

**Thoughtform Garden** is an experimental, browser-based coding environment merging a personal knowledge base with a functional IDE. It's an "editor-first OS" designed for literate programming, self-improving code, and collaboration with AI agents.

This project is more than a tool; it's an exploration into the **Tao of Digital Gardening**—a practice of intentional interaction with information. It's a space to turn digital chaos into a garden of personal gnosis.

## Local Development
To run the project on your machine for development:
1.  **Clone the repository and install dependencies:**
    ```
    git clone https://github.com/thoughtforms/garden.git
    cd garden
    npm install
    ```
2.  **Run the development server:**
    ```
    npm run dev
    ```
    This will start a local server (usually at `http://localhost:5173`). The live instance is always available at [**thoughtform.garden**](https://thoughtform.garden), no registration needed.

### Running the Full Stack Locally (Optional)

To enable the P2P mesh, remote `git` collaboration, and AI web access, you can run the backend services locally.

#### WebSocket Signaling Server
The signaling server acts as a "tracker," helping peers discover each other.
```
# From the project root, run:
npm run ws
```
This will start the server (usually at `ws://localhost:8080`). Update the URL in the **Sync** tab of the DevTools to point to your local instance.

#### Git Server for Collaboration
To enable `git push/pull` from the **Git** tab, you can serve a bare git repository over HTTP.
```
# 1. Create a bare repository to act as the central remote
git init --bare my-garden-remote.git

# 2. Serve the repository's directory using a simple HTTP server
# (You may need to run `npm install -g http-server` first)
http-server .
```
You can then use the URL provided by `http-server` (e.g., `http://192.168.1.10:8081/my-garden-remote.git`) as the remote URL in the Git tab for collaboration across devices.

#### AI Content Proxy Server
The proxy server allows the AI agent to read content from external websites, bypassing CORS and anti-bot measures. It uses a hybrid approach: a fast, lightweight fetch for simple sites, with an automatic fallback to a full headless browser for complex sites protected by services like Cloudflare.

1.  **Install additional dependencies:** The proxy uses Puppeteer, which includes a browser engine.
```
npm install axios puppeteer
```

2.  **Run the local proxy server:**
```
npm run proxy
```
This starts the server (usually at `http://localhost:8082`). This local version has **no allowlist** and can access any URL.

3.  **Configure the Frontend:**
    -   Open the **DevTools** in Thoughtform Garden (Ctrl+`).
    -   Go to the **AI** tab.
    -   In the "Proxy URL" field, enter your local server's address: `http://localhost:8082`.
    -   The setting saves automatically. The agent will now use your local proxy to read any URLs (`https://...` or `[markdown](links)`) included in its prompts.

#### Deploying Servers to Production

For production deployment of the WebSocket and Proxy servers to Fly.io with custom domains, see **[README.servers.md](README.servers.md)**.

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
-   **Toggle DevTools:** `Ctrl+`` (backtick)

### The Executable Layer: Creating Your Own Commands
Thoughtform Garden acts as a userscript manager for itself. Scripts have access to `editor` and `git` globals.

1.  **Create a script file:** E.g., `my-command.js`.
2.  **Write your script:**
    ```
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

Thoughtform Garden features a scalable and resilient P2P mesh network using WebRTC. This transforms isolated browser tabs into a cohesive, multi-device swarm, allowing you to orchestrate an "agentic supercomputer" from any connected device.

### How It Works

The system is a **tracker-assisted partial mesh** designed for massive swarms.

1.  **Peer Discovery (WebSocket Tracker):** A lightweight WebSocket server acts as a "tracker" or "introducer." When a new peer joins a swarm (identified by a shared **Sync Name**), the tracker introduces it to a small, random subset of peers already in the swarm. The tracker is *only* used for this initial handshake; it never touches your data.
2.  **Partial Mesh Network (WebRTC):** Each peer maintains a limited number of direct, encrypted P2P connections to other peers. This prevents any single device from being overwhelmed, allowing the swarm to scale to dozens or even hundreds of nodes without performance degradation.
3.  **Gossip Protocol:** When a peer has new information (like a file update), it "gossips" to all of its direct neighbors. Those neighbors, in turn, gossip to *their* neighbors. This allows information to propagate rapidly and reliably throughout the entire swarm, routing around disconnected peers automatically.
4.  **True Decentralization:** There is no central "host" or single point of failure. All peers are equal. This resilient architecture ensures the swarm can survive and function even if multiple peers disconnect.

### Configuring Your Sync Swarm

1.  **Open DevTools:** Navigate to the **Sync** tab.
2.  **Set a Sync Name:** Enter a unique, memorable name for your device group (e.g., `my-device-swarm`). This is your shared secret.
3.  **Enable Auto-Connect (Optional):** Check the "Auto-connect on startup" box to have this device automatically join the swarm every time you load the page.
4.  **Connect:** Click "Connect". Repeat this process on your other devices using the *exact same* Sync Name.
5.  **Monitor Status:** The **Sync** tab in DevTools will have a colored dot indicating the connection quality:
    -   **Yellow Dot:** Connected to the tracker and ready, but currently has no active P2P links to other peers.
    -   **Green Dot:** Has one or more high-speed, direct P2P WebRTC links active with other peers in the swarm.

Once connected, use the "Request All Files" button to synchronize your gardens from another peer in the swarm.

***

## The Philosophy: A Substrate for Emergent Intelligence
This is a system designed to become a direct extension of your mind—a version-controlled, locally-hosted environment for thought. By blending a journal, an IDE, and a knowledge graph, it facilitates a tight feedback loop between you and your digital self, augmented by AI.

The P2P mesh transforms this personal cognitive core into a **substrate for collective intelligence**. This substrate is built on three primitives:
1.  **Immutable, Forkable State:** Using `git` for the file system provides a complete, version-controlled history. This enables risk-free cognitive exploration, allowing an agent (or human) to fork a line of reasoning, explore it, and merge it back, making the scientific method a native feature of its memory.
2.  **Ambient, Resilient Presence:** The P2P mesh allows all nodes to share state without a central authority. This creates a shared, evolving reality—a collective memory for the swarm where discoveries can propagate and build upon each other emergently.
3.  **Native, Composable Functionality:** The ability to execute JavaScript that operates on the state and the network means the system is built from the same material it manipulates. Agents can write and commit new tools that other agents can then use, creating a recursively self-improving environment.

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