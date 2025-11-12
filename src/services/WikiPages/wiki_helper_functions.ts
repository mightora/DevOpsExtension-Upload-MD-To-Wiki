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
    /**
     * Fetches a developer message from a remote API
     * @param https - The HTTPS module for making HTTP requests
     * @returns Promise<string> - The developer message from the API
     */
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

    /**
     * Ensures that all path segments in a wiki page path exist, creating missing ones
     * @param wikipages - Array of existing remote wiki pages to check against
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param pathStr - The wiki path to ensure exists
     * @param token - Authentication token
     * @param orgUrl - Azure DevOps organization URL
     * @param project - Project name
     * @param repositoryName - Wiki repository name
     */
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
                console.log(`🔧 Page not found: ${currentPath}. Creating the page.`);
                try {
                    const content = `# ${part}\n \n [[_TOSP_]] `;
                    const createdPage = await wikiPageApi.CreatePage(wikiUrl, currentPath, content, token);
                    console.log(`✅ Page created at ${currentPath}`);
                    
                    // **FIX: Add the newly created page to the wikipages array**
                    const newWikiPage: WikiInterfaces.WikiPage = {
                        id: createdPage?.id || Math.floor(Math.random() * 1000000), // Use actual ID from response or fallback
                        path: currentPath,
                        isParentPage: true, // This is a directory/parent page
                        order: wikipages.length + 1, // Add at the end
                        remoteUrl: `${wikiUrl}${currentPath}`,
                        url: `${wikiUrl}${currentPath}`,
                        gitItemPath: currentPath
                    };
                    wikipages.push(newWikiPage);
                    console.log(`📝 Added new page to cache: ${currentPath}`);
                    
                } catch (error) {
                    console.error(`❌ Failed to create page at ${currentPath}:`, (error as Error).message);
                    
                    // Check if it's a "page already exists" error and handle gracefully
                    if (error && typeof error === 'object' && 'message' in error) {
                        const errorMessage = (error as any).message || '';
                        if (errorMessage.includes('already exists')) {
                            console.log(`⚠️  Page ${currentPath} was created by another process, continuing...`);
                            // Add it to our cache even though we didn't create it
                            const existingWikiPage: WikiInterfaces.WikiPage = {
                                id: Math.floor(Math.random() * 1000000), // We don't have the actual ID
                                path: currentPath,
                                isParentPage: true,
                                order: wikipages.length + 1,
                                remoteUrl: `${wikiUrl}${currentPath}`,
                                url: `${wikiUrl}${currentPath}`,
                                gitItemPath: currentPath
                            };
                            wikipages.push(existingWikiPage);
                            continue; // Don't throw, just continue with the next part
                        }
                    }
                    
                    throw new Error(`Failed to create page at ${currentPath}. Please check permissions.`);
                }
            }
        }
    }

    /**
     * Recursively scans a directory to collect expected wiki pages from markdown files and their containing directories
     * @param dir - The directory to scan for markdown files and their containing directories
     * @param expectedPages - Array to populate with expected wiki page objects that will be pushed to the wiki
     * @param wikiSource - Root source directory for markdown files
     * @param wikiDestination - Wiki remote destination root path
     * @param repositoryName - Wiki remote repository name
     */
    static collectExpectedWikiPages(dir: string, expectedPages: ExpectedWikiPage[], wikiSource: string, wikiDestination: string, repositoryName: string) {
        console.log(`Scanning directory for markdown files: ${dir}`);
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            //if the filePath is a directory, add it to the expectedPages array and recurse into it to find .md files
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

    /**
     * Recursively processes markdown files in a directory and uploads them to the wiki
     * @param dir - Directory to process
     * @param wikiSource - Root source (local) directory for markdown files
     * @param wikiDestination - Wiki remote destination root path
     * @param repositoryName - Wiki remote repository name
     * @param headerMessage - Optional header message to prepend to each wiki page
     * @param includePageLink - Whether to include a link back to the wiki page
     * @param orgUrl - Azure DevOps organization URL
     * @param project - Project name
     * @param wikiUrl - Base URL for the wiki API
     * @param wikiPageApi - API service for wiki operations
     * @param token - Authentication token
     * @param wikipages - Array of existing wiki pages
     */
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

    /**
     * Helper method to process a single markdown file
     * @param filePath - Path (local) to the markdown file to process
     * @param wikiSource - Root source directory for markdown files
     * @param wikiDestination - Wiki remote destination root path
     * @param repositoryName - Wiki remote repository name
     * @param headerMessage - Optional header message to prepend to the page
     * @param includePageLink - Whether to include a link back to the wiki page
     * @param orgUrl - Azure DevOps organization URL
     * @param project - Project name
     * @param wikiUrl - Base URL for the wiki API
     * @param wikiPageApi - API service for wiki operations
     * @param token - Authentication token for devops
     * @param wikipages - Array of existing wiki pages
     * @param dir - Directory containing the markdown file
     */
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

    /**
     * Helper method to process images in markdown content
     * @param content - Markdown content to process
     * @param dir - Directory (local) containing the markdown file and images
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param token - devops Authentication token
     * @returns Promise<string> - Updated content with image URLs replaced
     */
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

    /**
     * Helper method to create or update a wiki page with error handling
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param wikiPagePath - Path to the remote wiki page
     * @param content - Content to write to the page
     * @param token - Authentication token
     */
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

    /**
     * Helper method to handle wiki page creation errors
     * @param error - The error that occurred during page creation/update
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param wikiPagePath - Path to the (remote) wiki page
     * @param content - Content to write to the page
     * @param token - Authentication token
     */
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

    /**
     * Generates a URL link to a wiki page
     * @param orgUrl - Azure DevOps organization URL
     * @param project - Project name
     * @param wikiPagePath - Path to the wiki page
     * @returns string - Full URL to the wiki page
     */
    static generateWikiPageLink(orgUrl: string, project: string, wikiPagePath: string): string {
        const cleanPath = wikiPagePath.startsWith('/') ? wikiPagePath.substring(1) : wikiPagePath;
        const encodedPath = encodeURIComponent(cleanPath);
        return `${orgUrl}${project}/_wiki/wikis/${project}.wiki?pagePath=%2F${encodedPath}`;
    }

    /**
     * Uploads an image as an attachment to the wiki
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param imagePath - Local path to the image file
     * @param token - devops Authentication token
     * @returns Promise<string> - The attachment path for the uploaded image
     */
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

    /**
     * Deletes orphaned wiki pages that no longer have corresponding markdown files
     * @param expectedPages - Array of expected wiki pages based on markdown files in (local) source directory
     * @param wikipages - Array of existing wiki pages from the API
     * @param wikiDestination - Wiki destination root path
     * @param repositoryName - Wiki repository name
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param token - Authentication token
     */
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

    /**
     * Helper method to analyze wiki pages and categorize them to keep them or mark them as orphaned for deletion from the remote wiki
     * @param wikipages - Array of existing wiki pages from the API
     * @param expectedPages - Array of expected wiki pages based on markdown files in (local) source directory
     * @param managedPathPrefix - Managed path prefix with leading slash
     * @param managedPathPrefixNoSlash - Managed path prefix without leading slash
     * @returns Object containing arrays of orphaned and managed page paths
     */
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

    /**
     * Helper method to log the page analysis summary
     * @param wikipages - Array of existing wiki pages from the API
     * @param managedPages - Array of managed page paths
     * @param expectedPages - Array of expected wiki pages based on markdown files in (local) source directory
     * @param orphanedPages - Array of orphaned page paths to be deleted from the remote wiki
     */
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

    /**
     * Helper method to delete a list of wiki pages
     * @param orphanedPages - Array of orphaned page paths to delete
     * @param wikiPageApi - API service for wiki operations
     * @param wikiUrl - Base URL for the wiki API
     * @param token - Authentication token
     */
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
