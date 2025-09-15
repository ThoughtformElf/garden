# Thoughtform Garden
> An in-browser OS for vibe-driven development and agentic computing.

![GitHub Repo stars](https://img.shields.io/github/stars/thoughtforms/garden)
![GitHub repo size](https://img.shields.io/github/repo-size/thoughtforms/garden)
![GitHub Commit Activity](https://img.shields.io/github/commit-activity/m/thoughtforms/garden)
![GitHub Issues](https://img.shields.io/github/issues/thoughtforms/garden)

---

**Thoughtform Garden** is an experimental, browser-based coding environment that merges a personal knowledge base with a functional IDE. It is an "editor-first OS" that lives entirely in your browser, designed to explore literate programming, cultivate self-improving code, and collaborate with AI agents.

This project is more than a tool; it's an exploration into the **Tao of Digital Gardening**—a practice of intentional, mindful interaction with information. It's a space to turn the chaos of the digital world into a garden of personal gnosis.

## Core Technologies
- **[CodeMirror 6](https://codemirror.net/)**: A modern, extensible in-browser code editor.
- **[isomorphic-git](https://isomorphic-git.org/)**: A pure JavaScript implementation of git, creating a complete version control system in your browser's IndexedDB.
- **[Eruda](https://eruda.liriliri.io/)**: An embedded developer console for debugging and application management.
- **[Vite](https://vitejs.dev/)**: A next-generation front-end tool for a fast and lean development experience.

***

## Getting Started: A Hands-On Guide

Thoughtform Garden is designed to be intuitive. Here are the key workflows.

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

## The Vision
This project explores what happens when a development tool is also a malleable, agentic knowledge graph. The system is designed to be a digital sanctuary where ideas (Thoughtforms) can be cultivated, connected, and grown into complex systems by a collective intelligence (an Egregore) of humans and AI.

By giving an LLM access to its own source code, version history, and a secure environment for API keys, the Garden becomes a "Test-Time Reinforcement Learning" environment. Instead of updating weights, the agent can update its own context and prompts, enabling a powerful loop of self-improvement and reflection.

## Roadmap
The current editor is the foundation. The future is focused on building a fully ambient, multi-modal computing experience.

-   **Code Execution**: Allow code written in the editor to be executed in a sandboxed environment, turning the garden into a true development playground.
-   **Remote Sync & Collaboration**: Implement `git push/pull` with a secure authentication layer to sync gardens between devices and enable collaboration.
-   **Environment Variables**: Add a dedicated UI for managing secrets like API keys, enabling LLM integration and other external services.
-   **Theming & Customization**: Refactor styles to use CSS variables for easy theme switching and personalization.
-   **Device Swarms**: Use WebRTC or WebSockets to create ad-hoc, multi-device computing clusters, turning old phones and tablets into dedicated agent hosts.
-   **Universal Renderer**: Implement `?repo=` URL support to clone and render any git repository, turning the Garden into a universal lens for knowledge bases.
-   **Visual & Multimodal Editing**: Move beyond text to include node-based graph editors and viewers for different media types.

