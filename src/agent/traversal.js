import { Git } from '../util/git-integration.js';

export class Traversal {
    constructor(gitClient) {
        if (!gitClient) throw new Error("Traversal helper requires a gitClient instance.");
        this.gitClient = gitClient;
    }

    /**
     * Extracts all [[wikilinks]] from a given text content.
     * @param {string} content - The text to parse.
     * @returns {string[]} An array of link targets (the string inside the brackets).
     */
    extractWikilinks(content) {
        const linkRegex = /\[\[([^\[\]]+?)\]\]/g;
        const links = new Set(); // Use a Set to avoid duplicates
        let match;
        while ((match = linkRegex.exec(content))) {
            const target = match[1].split('|')[0].trim();
            links.add(target);
        }
        return Array.from(links);
    }

    /**
     * Reads the content of a file specified by a wikilink, handling cross-garden links.
     * @param {string} linkTarget - The target from within the wikilink (e.g., "some-file" or "gardenName#some-file").
     * @param {string} baseGardenName - The name of the garden where this link was found, for resolving relative paths.
     * @returns {Promise<{content: string|null, fullIdentifier: string|null, gardenName: string}>} An object containing the file content
     * and a unique identifier for the visited set (e.g., "/some-file" or "gardenName#/some-file").
     */
    async readLinkContent(linkTarget, baseGardenName) {
        let gardenName = baseGardenName;
        let filePath = linkTarget;

        if (linkTarget.includes('#')) {
            [gardenName, filePath] = linkTarget.split('#');
        }

        if (!filePath.startsWith('/')) {
            filePath = `/${filePath}`;
        }

        const fullIdentifier = (gardenName !== this.gitClient.gardenName) ? `${gardenName}#${filePath}` : filePath;
        const gitClientToUse = (gardenName !== this.gitClient.gardenName) ? new Git(gardenName) : this.gitClient;

        try {
            const content = await gitClientToUse.readFile(filePath);
            return { content, fullIdentifier, gardenName };
        } catch (e) {
            console.error(`[Agent] Error reading ${fullIdentifier}:`, e);
            return { content: null, fullIdentifier, gardenName: null };
        }
    }
}