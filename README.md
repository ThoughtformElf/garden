# Thoughtform Garden
> An in-browser OS for vibe-driven development and agentic computing.

![GitHub Repo stars](https://img.shields.io/github/stars/thoughtforms/garden)
![GitHub repo size](https://img.shields.io/github/repo-size/thoughtforms/garden)
![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/thoughtforms/garden)
![GitHub Issues](https://img.shields.io/github/issues/thoughtforms/garden)

---

**Thoughtform Garden** is an experimental, browser-based coding environment that merges a personal knowledge base with a functional IDE. It is an "editor-first OS" that lives entirely in your browser, designed to explore literate programming, build self-improving code, and collaborate with AI agents.

## Core Technologies
- **[CodeMirror 6](https://codemirror.net/)**: A modern, extensible in-browser code editor that provides the core text-editing experience.
- **[isomorphic-git](https://isomorphic-git.org/)**: A pure JavaScript implementation of git that creates a complete virtual filesystem and version control system within the browser's IndexedDB.
- **[Eruda](https://eruda.liriliri.io/)**: An embedded developer console that provides mobile-friendly debugging tools for both human and AI developers.
- **[Vite](https://vitejs.dev/)**: A next-generation front-end tooling system that provides a fast and lean development experience.

***

## Getting Started: A Hands-On Guide

Thoughtform Garden is designed to be intuitive. Here are the key workflows to get you started.

### Multi-Workspace Management
Your work is organized into "Gardens," which are separate, self-contained workspaces.

- **Switching Gardens**: Click the **Gardens** tab in the sidebar to see all your workspaces. Clicking a garden name will instantly switch to it.
- **Managing Gardens**: **Right-click** (or **long-press** on mobile) anywhere in the Gardens view to bring up a context menu for creating, duplicating, or deleting gardens.

### File & Version Control
Within each garden, you can manage files and their history with a simple, powerful interface.

- **File Management**: **Right-click** (or **long-press**) on any file in the **Files** tab to `Rename`, `Duplicate`, or `Delete` it. Right-click the background to create a `New File`.
- **Git Workflow**: The **Git** tab provides a complete version control interface.
  - **Stage & Unstage**: Add files to the staging area individually.
  - **Commit Changes**: Write a commit message and save a snapshot of your work.
  - **Discard Changes**: Revert a file to its last committed state or delete a new, untracked file.
  - **View History**: Browse a full history of your commits. Expand any commit to see a list of changed files and click a file to view a diff of what changed in that specific commit.
- **Dirty Indicators**: When you modify a file, its name will be highlighted. The "Git" tab will also display an indicator, giving you an at-a-glance overview of all uncommitted work.

***

## The Vision
This project explores what happens when a development tool is also a malleable, agentic knowledge graph. The system is designed to be a "digital garden" where ideas (Thoughtforms) can be cultivated, connected, and grown into complex systems by a collective intelligence (an Egregore) of humans and AI.

By giving an LLM access to its own source code and version history, the Garden becomes a "Test-Time Reinforcement Learning" environment. Instead of updating weights, the agent can update its own context and prompts, enabling a powerful loop of self-improvement and reflection.

## Roadmap
The current editor is the foundation. The future is focused on building a fully ambient, multi-modal computing experience.

-   **Data Portability**: Implement a "DevTools" panel for easy import and export of entire gardens as `.zip` archives.
-   **Theming & Customization**: Refactor styles to use CSS variables, allowing for easy theme switching and personalization.
-   **LLM Integration**: Enable high-level, conversational coding and recursive self-improvement where the agent can read and write its own source code.
-   **Code Execution**: Allow code written in the editor to be executed, turning the garden into a true development playground.
-   **Remote Sync & Collaboration**: Implement `git push/pull` with a secure authentication layer to sync gardens between devices and enable collaboration.
-   **Device Swarms**: Use WebRTC or WebSockets to create ad-hoc, multi-device computing clusters, turning old phones and tablets into dedicated agent hosts.
-   **Browser Extension**: Package the application as a browser extension to act as a powerful userscript manager and web automation tool.
-   **Visual & Multimodal Editing**: Move beyond text to include node-based graph editors and viewers for different media types like images and GIFs.
