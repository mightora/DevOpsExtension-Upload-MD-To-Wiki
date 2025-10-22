import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { WikiPageApi } from './wiki_pages_api_service';
import * as WikiInterfaces from 'azure-devops-node-api/interfaces/WikiInterfaces';

export interface ExpectedWikiPage {
    WikiPagePath: string;
    IsDirectory: boolean;
}

export class WikiHelperFunctions {
    static async fetchDeveloperMessage(https: any): Promise<string> {
        const url = 'https://developer-message.mightora.io/api/HttpTrigger?appname=mightora-UploadMDToWiki';
        return new Promise((resolve, reject) => {
            https.get(url, (res: import('http').IncomingMessage) => {
                let data = '';
                res.on('data', (chunk: Buffer) => {
                    data += chunk.toString();
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const jsonResponse = JSON.parse(data);
                            resolve(jsonResponse.message);
                        } catch (error) {
                            reject('Failed to parse developer message response.');
                        }
                    } else {
                        reject(`Failed to fetch developer message. HTTP Status: ${res.statusCode}`);
                    }
                });
            }).on('error', (err: Error) => {
                reject(`Error fetching developer message: ${err.message}`);
            });
        });
    }

    static async ensurePathExists(wikipages: WikiInterfaces.WikiPage[], wikiPageApi: WikiPageApi, wikiUrl: string, pathStr: string, token: string, orgUrl: string, project: string, repositoryName: string) {
        const parts = pathStr.split('/');
        let currentPath = '';
        for (const part of parts) {
            currentPath += `/${part}`;
            let pageExists = wikipages.some(page => page.path === currentPath);
            if (pageExists) {
                console.log(`Page already exists: ${currentPath}`);
                console.log(`Page already exists get etag: ${orgUrl}/${project}/_apis/wiki/wikis/${repositoryName}/pages?path=${currentPath}&api-version=7.1`);
                try {
                    const { headers } = await wikiPageApi.getPage(wikiUrl, currentPath, token);
                    const etag = headers['etag'];
                    console.log(`ETag for ${currentPath}: ${etag}`);
                } catch (error) {
                    console.error(`Failed to retrieve ETag for ${currentPath}:`, (error as Error).message);
                }
            } else {
                console.log(`Page not found: ${currentPath}. Creating the page.`);
                try {
                    const content = `# ${part}\n \n [[ _TOSP_ ]] `;
                    await wikiPageApi.CreatePage(wikiUrl, currentPath, content, token);
                    console.log(`Page created at ${currentPath}`);
                } catch (error) {
                    console.error(`Failed to create page at ${currentPath}:`, (error as Error).message);
                    throw new Error(`Failed to create page at ${currentPath}. Please check permissions.`);
                }
            }
        }
    }

    static collectExpectedWikiPages(dir: string, expectedPages: ExpectedWikiPage[], wikiSource: string, wikiDestination: string, repositoryName: string) {
        console.log(`Scanning directory for markdown files: ${dir}`);
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
                const wikiPagePath = `/${wikiDestination}/${repositoryName}/${relativePath}`;
                expectedPages.push({
                    WikiPagePath: wikiPagePath,
                    IsDirectory: true
                });
                console.log(`Found directory: ${filePath}`);
                console.log(`  - Relative path: ${relativePath}`);
                console.log(`  - Expected wiki path: ${wikiPagePath} (Directory)`);
                WikiHelperFunctions.collectExpectedWikiPages(filePath, expectedPages, wikiSource, wikiDestination, repositoryName);
            } else if (file.endsWith('.md')) {
                const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
                const wikiPagePath = `/${wikiDestination}/${repositoryName}/${relativePath.replace(/\.md$/, '')}`;
                expectedPages.push({
                    WikiPagePath: wikiPagePath,
                    IsDirectory: false
                });
                console.log(`Found markdown file: ${filePath}`);
                console.log(`  - Relative path: ${relativePath}`);
                console.log(`  - Expected wiki path: ${wikiPagePath} (File)`);
            }
        }
    }

    static async processMdFiles(
        dir: string,
        wikiSource: string,
        wikiDestination: string,
        repositoryName: string,
        headerMessage: string,
        includePageLink: boolean,
        orgUrl: string,
        project: string,
        wikiUrl: string,
        wikiPageApi: WikiPageApi,
        token: string,
        wikipages: WikiInterfaces.WikiPage[]
    ) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            
            if (fs.statSync(filePath).isDirectory()) {
                await WikiHelperFunctions.processMdFiles(filePath, wikiSource, wikiDestination, repositoryName, headerMessage, includePageLink, orgUrl, project, wikiUrl, wikiPageApi, token, wikipages);
                continue;
            }
            
            if (!file.endsWith('.md')) continue;
            
            await WikiHelperFunctions.processMarkdownFile(
                filePath, wikiSource, wikiDestination, repositoryName,
                headerMessage, includePageLink, orgUrl, project,
                wikiUrl, wikiPageApi, token, wikipages, dir
            );
        }
    }

    // Helper method to process a single markdown file
    private static async processMarkdownFile(
        filePath: string, wikiSource: string, wikiDestination: string, repositoryName: string,
        headerMessage: string, includePageLink: boolean, orgUrl: string, project: string,
        wikiUrl: string, wikiPageApi: WikiPageApi, token: string, 
        wikipages: WikiInterfaces.WikiPage[], dir: string
    ) {
        console.log(`Markdown File: ${filePath}`);
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/\\newpage/g, '');
        
        if (headerMessage) {
            content = `${headerMessage}\n\n${content}`;
        }
        
        const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
        const wikiPagePath = `${wikiDestination}/${repositoryName}/${relativePath.replace(/\.md$/, '')}`;
        
        if (includePageLink) {
            const pageLink = WikiHelperFunctions.generateWikiPageLink(orgUrl, project, wikiPagePath);
            content = `${content}\n\n---\n\n**[Link to this page](${pageLink})**`;
        }
        
        console.log(`Ensuring path exists for: ${wikiPagePath}`);
        await WikiHelperFunctions.ensurePathExists(wikipages, wikiPageApi, wikiUrl, path.dirname(wikiPagePath), token, orgUrl, project, repositoryName);
        
        // Process images in the content
        content = await WikiHelperFunctions.processImagesInContent(content, dir, wikiPageApi, wikiUrl, token);
        
        // Create or update the wiki page
        console.log(`Attempting to create or update wiki page at: ${wikiPagePath}`);
        await WikiHelperFunctions.createOrUpdateWikiPage(wikiPageApi, wikiUrl, wikiPagePath, content, token);
    }

    // Helper method to process images in markdown content
    private static async processImagesInContent(content: string, dir: string, wikiPageApi: WikiPageApi, wikiUrl: string, token: string): Promise<string> {
        const imageRegex = /!\[.*?\]\((.*?)\)/g;
        let match;
        const images = [];
        
        while ((match = imageRegex.exec(content)) !== null) {
            console.log(`Image found: ${match[1]}`);
            images.push(match[1]);
        }
        
        for (const image of images) {
            const imagePath = path.join(dir, image);
            if (fs.existsSync(imagePath)) {
                const imageName = path.basename(imagePath);
                const attachmentUrl = await WikiHelperFunctions.uploadImageAsAttachment(wikiPageApi, wikiUrl, imagePath, token);
                content = content.replace(image, attachmentUrl);
                console.log(`Uploaded image: ${imageName} to ${attachmentUrl}`);
            } else {
                console.error(`Image file not found: ${imagePath}`);
            }
        }
        
        return content;
    }

    // Helper method to create or update a wiki page with error handling
    private static async createOrUpdateWikiPage(wikiPageApi: WikiPageApi, wikiUrl: string, wikiPagePath: string, content: string, token: string) {
        try {
            const { headers } = await wikiPageApi.getPage(wikiUrl, wikiPagePath, token);
            const etag = headers['etag'];
            console.log(`ETag for ${wikiPagePath} is: ${etag}`);
            const updateResponse = await wikiPageApi.UpdatePage(wikiUrl, wikiPagePath, content, token, etag);
            if (!updateResponse) {
                throw new Error(`Failed to update wiki page: No response data.`);
            }
        } catch (error) {
            await WikiHelperFunctions.handleWikiPageCreationError(error, wikiPageApi, wikiUrl, wikiPagePath, content, token);
        }
    }

    // Helper method to handle wiki page creation errors
    private static async handleWikiPageCreationError(error: any, wikiPageApi: WikiPageApi, wikiUrl: string, wikiPagePath: string, content: string, token: string) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            const typeKey = (error.response.data as any)?.typeKey;
            if (typeKey === "WikiPageNotFoundException") {
                console.log(`WikiPageNotFoundException: Page not found at ${wikiPagePath}`);
                console.error(`[A] Trying to create new page for ${wikiPagePath}:`);
            } else {
                console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
                console.error(`[B] Trying to create new page for ${wikiPagePath}:`);
            }
        } else {
            console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
            console.error(`[C] Trying to create new page for ${wikiPagePath}:`);
        }
        
        const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, content, token);
        if (!createResponse) {
            throw new Error(`Failed to create wiki page: No response data.`);
        }
        console.log(`Page Created: ${wikiPagePath}`);
    }

    static generateWikiPageLink(orgUrl: string, project: string, wikiPagePath: string): string {
        const cleanPath = wikiPagePath.startsWith('/') ? wikiPagePath.substring(1) : wikiPagePath;
        const encodedPath = encodeURIComponent(cleanPath);
        return `${orgUrl}${project}/_wiki/wikis/${project}.wiki?pagePath=%2F${encodedPath}`;
    }

    static async uploadImageAsAttachment(wikiPageApi: WikiPageApi, wikiUrl: string, imagePath: string, token: string): Promise<string> {
        const imageName = path.basename(imagePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueImageName = `${timestamp}-${imageName}`;
        const url = `${wikiUrl}/attachments?name=${uniqueImageName}&api-version=6.0`;
        const imageData = fs.readFileSync(imagePath);
        const base64ImageData = imageData.toString('base64');
        console.log(`Uploading image to URL: ${url}`);
        console.log(`Absolute path of the image: ${imagePath}`);
        console.log(`Upload Image Data`);
        console.log(`Try and upload image: ${imageName}`);
        const response = await axios.put(url, base64ImageData, {
            headers: {
                ...wikiPageApi.getHeaders(token),
                'Content-Type': 'application/octet-stream'
            }
        }).then((response) => {
            return response.data.url;
        }).catch((error) => {
            console.error(`Failed to upload image: ${uniqueImageName}`, error);
            throw new Error(`Failed to upload image: ${uniqueImageName}`);
        });
        const attachmentPath = `/.attachments/${uniqueImageName}`;
        return attachmentPath;
    }

    static async deleteOrphanedWikiPages(
        expectedPages: ExpectedWikiPage[],
        wikipages: WikiInterfaces.WikiPage[],
        wikiDestination: string,
        repositoryName: string,
        wikiPageApi: WikiPageApi,
        wikiUrl: string,
        token: string
    ) {
        console.log("Checking for orphaned wiki pages to delete...");
        const managedPathPrefix = `/${wikiDestination}/${repositoryName}/`;
        const managedPathPrefixNoSlash = `${wikiDestination}/${repositoryName}/`;
        console.log(`Managed path prefix (with slash): "${managedPathPrefix}"`);
        console.log(`Managed path prefix (no slash): "${managedPathPrefixNoSlash}"`);

        // Analyze pages and categorize them
        const { orphanedPages, managedPages } = WikiHelperFunctions.analyzeWikiPages(
            wikipages, expectedPages, managedPathPrefix, managedPathPrefixNoSlash
        );

        // Log summary and check if deletion is needed
        WikiHelperFunctions.logPageAnalysisSummary(wikipages, managedPages, expectedPages, orphanedPages);
        
        if (orphanedPages.length === 0) {
            console.log("No orphaned wiki pages found.");
            return;
        }

        // Delete orphaned pages
        await WikiHelperFunctions.deletePages(orphanedPages, wikiPageApi, wikiUrl, token);
    }

    // Helper method to analyze wiki pages and categorize them
    private static analyzeWikiPages(
        wikipages: WikiInterfaces.WikiPage[], 
        expectedPages: ExpectedWikiPage[], 
        managedPathPrefix: string, 
        managedPathPrefixNoSlash: string
    ): { orphanedPages: string[], managedPages: string[] } {
        const orphanedPages: string[] = [];
        const managedPages: string[] = [];
        
        console.log("=== Wiki Page Analysis ===");
        for (const page of wikipages) {
            if (!page.path) {
                console.log(`Skipping page with no path: ${JSON.stringify(page)}`);
                continue;
            }

            console.log(`Checking page: "${page.path}"`);
            const isManaged = page.path.startsWith(managedPathPrefix) || page.path.startsWith(managedPathPrefixNoSlash);
            
            if (!isManaged) {
                console.log(`  - IGNORED: Outside managed path`);
                console.log(`    Expected to start with: "${managedPathPrefix}" or "${managedPathPrefixNoSlash}"`);
                continue;
            }

            managedPages.push(page.path);
            console.log(`  - MANAGED: Under our managed path`);
            
            const expectedPage = expectedPages.find(ep => ep.WikiPagePath === page.path);

            if (!expectedPage) {
                orphanedPages.push(page.path);
                console.log(`  - ORPHANED: No corresponding markdown file`);
            } else {
                console.log(`  - KEPT: Has corresponding markdown file (${expectedPage.IsDirectory ? 'Directory' : 'File'})`);
            }
        }

        return { orphanedPages, managedPages };
    }

    // Helper method to log the page analysis summary
    private static logPageAnalysisSummary(
        wikipages: WikiInterfaces.WikiPage[], 
        managedPages: string[], 
        expectedPages: ExpectedWikiPage[], 
        orphanedPages: string[]
    ) {
        console.log(`\nSummary:`);
        console.log(`- Total wiki pages: ${wikipages.length}`);
        console.log(`- Pages under managed path: ${managedPages.length}`);
        console.log(`- Expected pages from markdown: ${expectedPages.length}`);
        console.log(`- Orphaned pages to delete: ${orphanedPages.length}`);
        
        if (managedPages.length > 0) {
            console.log(`\nManaged pages:`);
            managedPages.forEach(page => console.log(`  - ${page}`));
        }
        
        if (orphanedPages.length > 0) {
            console.log(`\nFound ${orphanedPages.length} orphaned wiki pages to delete:`);
            orphanedPages.forEach(page => console.log(`  - ${page}`));
        }
    }

    // Helper method to delete a list of wiki pages
    private static async deletePages(orphanedPages: string[], wikiPageApi: WikiPageApi, wikiUrl: string, token: string) {
        for (const pagePath of orphanedPages) {
            try {
                console.log(`Deleting orphaned wiki page: ${pagePath}`);
                await wikiPageApi.DeletePage(wikiUrl, pagePath, token);
                console.log(`Successfully deleted: ${pagePath}`);
            } catch (error) {
                console.error(`Failed to delete page ${pagePath}:`, (error as Error).message);
                if (error && typeof error === 'object' && 'response' in error) {
                    const axiosError = error as any;
                    console.error(`HTTP Status: ${axiosError.response?.status}`);
                    console.error(`Error details:`, axiosError.response?.data);
                }
            }
        }
    }
}
