# Thoughtform Garden

> An in-browser OS for vibe-driven development and agentic computing.<br>
> ![GitHub Repo stars](https://img.shields.io/github/stars/thoughtforms/garden)
![GitHub repo size](https://img.shields.io/github/repo-size/thoughtforms/garden)
![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/thoughtforms/garden)
![GitHub Issues](https://img.shields.io/github/issues/thoughtforms/garden)

---

**Thoughtform Garden** is an experimental, browser-based coding environment that merges a personal knowledge base with a functional IDE. It is an "editor-first OS" that lives entirely in your browser, designed to explore literate programming, cultivate self-improving code, and collaborate with AI agents.

This project is more than a tool; it's an exploration into the **Tao of Digital Gardening**—a practice of intentional, mindful interaction with information. It's a space to turn the chaos of the digital world into a garden of personal gnosis, shepherding streams of tokens into streams of consciousness.

## Local Development
To run the project on your machine for development:
1.  **Clone the repository:**
    ```
    git clone https://github.com/thoughtforms/garden.git
    cd garden
    ```
2.  **Install dependencies:**
    ```
    npm install
    ```
3.  **Run the development server:**
    ```
    npm run dev
    ```
This will start a local server at `http://localhost:5173`. The live, stable instance is always available at [**thoughtform.garden**](https://thoughtform.garden), no account registration needed.

***

## Getting Started: A Hands-On Guide
Thoughtform Garden is designed to be intuitive. Here are the key workflows.

### The Command Palette: Your Universal Interface
The Command Palette has two modes for powerful interaction: **Search** and **Execute**.

-   **Search Mode (`Ctrl+P`):** This is your universal file finder. It provides a single, unified search across **all files in all of your gardens.** Simply start typing any part of a file or garden name to instantly filter results, and press `Enter` to open the file.
-   **Execute Mode (`Ctrl+Shift+P`):** This is your command runner. It finds and executes any `.js` file within your current garden, turning simple scripts into powerful commands.

### The Executable Layer: Creating Your Own Commands
Thoughtform Garden is now a powerful userscript manager for itself. You can write JavaScript files that have direct access to the application's core components, allowing you to automate workflows and extend the editor's functionality on the fly.

1.  **Create a script file:** In the file explorer, create a new file, for example, `my-command.js`.
2.  **Write your script:** Your script has access to two powerful global objects: `editor` and `git`.

    ```
    // Example: my-command.js
    // This script will get the content of the current file,
    // append a timestamp, and save the change as a new commit.

    // 1. Access the 'editor' object
    const currentDoc = editor.editorView.state.doc;
    const newContent = currentDoc.toString() + `\n\nUpdated: ${new Date().toISOString()}`;

    // 2. Dispatch a change to the editor view
    editor.editorView.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newContent }
    });

    // 3. Access the 'git' object to commit the change
    await git.commit('Appended update timestamp via script');

    console.log('Timestamp appended and committed successfully!');
    ```
3.  **Run your command:** Press `Ctrl+Shift+P`, type `my-command.js`, and press `Enter`. The script will execute immediately.

### Multi-Workspace Management
Your work is organized into "Gardens"—separate, self-contained workspaces.
- **Switching Gardens**: Click the **Gardens** tab in the sidebar to see all your workspaces. Clicking a garden name instantly switches to it.
- **Managing Gardens**: **Right-click** (or **long-press** on mobile) in the Gardens view to create, duplicate, or delete gardens.

### File & Version Control
Within each garden, you have a complete git-based workflow.
- **File Management**: **Right-click** (or **long-press**) on any file in the **Files** tab to `Rename`, `Duplicate`, or `Delete` it.
- **Git Workflow**: The **Git** tab provides a full version control interface, including staging, committing, viewing history, and diffing changes.

### Data Portability
Your data is yours. The **Data** tab in the bottom devtools panel gives you full control.
- **Selective Export**: Click **Export...** to open a modal where you can select which gardens to back up into a single `.zip` file.
- **Selective Import**: Click **Import...** and choose a `.zip` backup. You'll be prompted to select which gardens from the archive you wish to restore.
- **Clear Data**: A "Danger Zone" option allows you to permanently delete selected gardens to reset your environment.

***

## The Philosophy: A Cognitive Core
This is not just an application; it is a **Cognitive Core**. It is a system designed to become a direct extension of your mind—a version-controlled, locally-hosted, and infinitely malleable environment for thought. By blending a journal, an IDE, and a knowledge graph, Thoughtform Garden facilitates a tight feedback loop between you and your digital self, augmented by AI.

## The Agentic Loop: Human + AI = AGI
The ultimate vision is to create a symbiotic partnership where the boundaries between user and AI blur. By giving an LLM access to its own source code, the complete version history of the garden, and a secure environment for API keys, the system becomes a "Test-Time Reinforcement Learning" environment. Instead of updating weights, the agent can update its own context and prompts, enabling a powerful loop of self-improvement and reflection. This collaboration—the human providing intent and the AI providing generative execution—is a practical step toward an emergent, functional AGI.

---

## Roadmap: From Editor to Egregore
The current editor is the foundation. The future is focused on building a fully ambient, multi-modal computing experience.
#### Phase 1: Quality of Life
- **Command Palette**: A universal finder for files across all gardens.
- **Keyboard Shortcuts**: Customizable keymaps for core actions and navigation.
- **Enhanced Theming**: Refactor styles to use CSS variables for easy theme switching and personalization.
#### Phase 2: The OS Layer
- **Code Execution**: Allow code written in the editor to be executed in a sandboxed environment.
- **URL-Based Commands**: Implement `?repo=` support to clone and render any git repository, turning the Garden into a universal lens for knowledge.
- **Environment Variables**: Add a dedicated UI for managing secrets like API keys.
#### Phase 3: The Agentic Leap
- **Remote Sync & Collaboration**: Implement `git push/pull` with a secure authentication layer to sync gardens between devices.
- **LLM Integration**: Build a dedicated interface for chatting with an AI that has full context of the current garden.
- **Device Swarms**: Use WebRTC or WebSockets to create ad-hoc, multi-device computing clusters.
#### Phase 4: Full Embodiment
- **Visual & Multimodal Editing**: Move beyond text to include node-based graph editors and viewers.
- **Sensor Integration**: Connect to browser sensors (camera, microphone) for hands-free interaction.
- **Robotic Embodiment**: Create pathways to stream context to and from physical robots, augmenting reality with your digital gnosis.
