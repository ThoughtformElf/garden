import { Git } from '../util/git-integration.js';

export class Traversal {
    constructor(gitClient) {
        if (!gitClient) throw new Error("Traversal helper requires a gitClient instance.");
        this.gitClient = gitClient;
    }

    extractWikilinks(content) {
        const linkRegex = /\[\[([^\[\]]+?)\]\]/g;
        const links = new Set();
        let match;
        while ((match = linkRegex.exec(content))) {
            const target = match[1].split('|')[0].trim();
            links.add(target);
        }
        return Array.from(links);
    }

    async readLinkContent(linkTarget, baseGardenName) {
        let gardenName = baseGardenName;
        let filePath = linkTarget;

        const gardenMatch = linkTarget.match(/^([^#]+)#(.*)$/);
        if (gardenMatch) {
            gardenName = gardenMatch[1];
            filePath = gardenMatch[2];
        }

        if (!filePath.startsWith('/')) {
            filePath = `/${filePath}`;
        }
        
        const gitClientToUse = (gardenName !== this.gitClient.gardenName) ? new Git(gardenName) : this.gitClient;
        const fullIdentifier = (gardenName !== this.gitClient.gardenName) ? `${gardenName}#${filePath}` : filePath;

        try {
            const content = await gitClientToUse.readFile(filePath);
            return { content, fullIdentifier, gardenName };
        } catch (e) {
            // --- THIS IS THE FIX (Part 1) ---
            // Changed from console.error to console.warn and improved the message.
            console.warn(`[Agent] Handled a broken link. Could not read ${fullIdentifier}:`, e.message);
            return { content: null, fullIdentifier, gardenName: null };
        }
    }
}