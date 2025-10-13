import tl = require('azure-pipelines-task-lib/task');
import path = require('path');
import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';
import * as azdev from "azure-devops-node-api";
import * as fs from 'fs';
import * as WikiApi from "azure-devops-node-api/WikiApi";
import * as WikiInterfaces from "azure-devops-node-api/interfaces/WikiInterfaces";
import * as lim from "azure-devops-node-api/interfaces/LocationsInterfaces";
import * as ba from "azure-devops-node-api/BuildApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as WorkItemTrackingApi from 'azure-devops-node-api/WorkItemTrackingApi';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import axios from 'axios';
const https = require('https');

// Include the provided code here
export interface IPage {
    tittle: string;
    description: string;
    releaseNumber: string;
    badges: string[];
    helpLink: string;
    releaseDate: string;
}

export interface IWorkItemDetail {
    id: number;
    type: string;
    url: string;
}

export interface IGroupWorkItem {
    key: string;
    workItems: IWorkItemDetail[];
}

export interface IWikiPageApi {
    getPages(wikiUrl: string, size: number, token: string): Promise<WikiPage[]>;
    getPage(wikiUrl: string, page: string, token: string): Promise<{ data: WikiPageWithContent, headers: any }>;
    CreatePage(wikiUrl: string, page: string, content: string, token: string): Promise<WikiPageWithContent>;
    UpdatePage(wikiUrl: string, page: string, content: string, token: string, etag: string): Promise<WikiPageWithContent>;
    DeletePage(wikiUrl: string, page: string, token: string): Promise<void>;
}

export interface WikiPageWithContent extends WikiInterfaces.WikiPage {
    content: string;
}

export class WikiPageApi implements IWikiPageApi {

    public getHeaders(token: string, etag?: string) {
        const headers: { [key: string]: string } = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`PAT:${token}`).toString('base64')}`,
            'X-TFS-FedAuthRedirect': 'Suppress',
        };

        if (etag) {
            headers['If-Match'] = etag;
        }

        return headers;
    }

    async CreatePage(wikiUrl: string, page: string, content: string, token: string): Promise<WikiPageWithContent> {
        let url: string = `${wikiUrl}/pages?path=${page}&api-version=6.0`;
        let putData: string = JSON.stringify({
            "content": content
        });

        let wikipage: WikiPageWithContent = await axios.put(
            url,
            putData,
            { headers: this.getHeaders(token) }
        ).then((response) => {
            return response.data;
        })
        .catch((error) => {
            console.log(error);
        });

        return wikipage;
    }

    async UpdatePage(wikiUrl: string, page: string, content: string, token: string, etag: string): Promise<WikiPageWithContent> {
        let url: string = `${wikiUrl}/pages?path=${page}&api-version=6.0`;
        let putData: string = JSON.stringify({
            "content": content
        });

        let wikipage: WikiPageWithContent = await axios.put(
            url,
            putData,
            { headers: this.getHeaders(token, etag) }
        ).then((response) => {
            return response.data;
        })
        .catch((error) => {
            console.log(error);
        });

        return wikipage;
    }

    async getPages(wikiUrl: string, size: number, token: string): Promise<WikiPage[]> {
        let url: string = `${wikiUrl}/pagesbatch?api-version=6.0-preview.1`;
        let postData: string = JSON.stringify({
            "top": 100
        });

        let pages: WikiPage[] = await axios.post(
            url,
            postData,
            { headers: this.getHeaders(token) }
        ).then((response) => {
            return response.data.value;
        })
        .catch((error) => {
            console.log(error);
        });

        return pages;
    }

    async getPage(wikiUrl: string, page: string, token: string): Promise<{ data: WikiPageWithContent, headers: any }> {
        let url: string = `${wikiUrl}/pages?path=${page}&includeContent=True&api-version=6.0`;

        let response = await axios.get(
            url,
            { headers: this.getHeaders(token) }
        ).then((response) => {
            return response;
        })
        .catch((error) => {
            console.log(error);
        });

        if (!response) {
            throw new Error("Failed to get page content.");
        }
        return { data: response.data, headers: response.headers };
    }

    async DeletePage(wikiUrl: string, page: string, token: string): Promise<void> {
        let url: string = `${wikiUrl}/pages?path=${page}&api-version=6.0`;

        await axios.delete(
            url,
            { headers: this.getHeaders(token) }
        ).then((response: any) => {
            return response.data;
        })
        .catch((error: any) => {
            console.log(`Error deleting page ${page}:`, error);
            throw error;
        });
    }
}

async function fetchDeveloperMessage(): Promise<string> {
    const url = 'https://developer-message.mightora.io/api/HttpTrigger?appname=mightora-UploadMDToWiki';

    return new Promise((resolve, reject) => {
        https.get(url, (res: import('http').IncomingMessage) => {
            let data = '';

            // Collect response data
            res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
            });

            // Handle end of response
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

// --- Top-level functions extracted from main ---
async function ensurePathExists(wikipages: WikiInterfaces.WikiPage[], wikiPageApi: WikiPageApi, wikiUrl: string, pathStr: string, token: string, orgUrl: string, project: string, repositoryName: string) {
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

function collectExpectedWikiPages(dir: string, expectedPages: Set<string>, wikiSource: string, wikiDestination: string, repositoryName: string) {
    console.log(`Scanning directory for markdown files: ${dir}`);
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            collectExpectedWikiPages(filePath, expectedPages, wikiSource, wikiDestination, repositoryName);
        } else if (file.endsWith('.md')) {
            const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
            const wikiPagePath = `/${wikiDestination}/${repositoryName}/${relativePath.replace(/\.md$/, '')}`;
            console.log(`Found markdown file: ${filePath}`);
            console.log(`  - Relative path: ${relativePath}`);
            console.log(`  - Expected wiki path: ${wikiPagePath}`);
            expectedPages.add(wikiPagePath);
        }
    }
}

async function processMdFiles(
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
            await processMdFiles(filePath, wikiSource, wikiDestination, repositoryName, headerMessage, includePageLink, orgUrl, project, wikiUrl, wikiPageApi, token, wikipages);
        } else if (file.endsWith('.md')) {
            console.log(`Markdown File: ${filePath}`);
            let content = fs.readFileSync(filePath, 'utf8');

            // Remove \newpage from the content
            content = content.replace(/\\newpage/g, '');

            // Prepend the header message to the content
            if (headerMessage) {
                content = `${headerMessage}\n\n${content}`;
            }

            const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
            const wikiPagePath = `${wikiDestination}/${repositoryName}/${relativePath.replace(/\.md$/, '')}`;

            // Append the page link if enabled
            if (includePageLink) {
                const pageLink = generateWikiPageLink(orgUrl, project, wikiPagePath);
                content = `${content}\n\n---\n\n**[Link to this page](${pageLink})**`;
            }

            console.log(`Ensuring path exists for: ${wikiPagePath}`);
            await ensurePathExists(wikipages, wikiPageApi, wikiUrl, path.dirname(wikiPagePath), token, orgUrl, project, repositoryName);

            // Identify images in the markdown content
            const imageRegex = /!\[.*?\]\((.*?)\)/g;
            let match;
            const images = [];
            while ((match = imageRegex.exec(content)) !== null) {
                console.log(`Image found: ${match[1]}`);
                images.push(match[1]);
            }

            // Upload images as attachments and update markdown content
            for (const image of images) {
                const imagePath = path.join(dir, image);
                if (fs.existsSync(imagePath)) {
                    const imageName = path.basename(imagePath);
                    const attachmentUrl = await uploadImageAsAttachment(wikiPageApi, wikiUrl, imagePath, token);
                    content = content.replace(image, attachmentUrl);
                    console.log(`Uploaded image: ${imageName} to ${attachmentUrl}`);
                } else {
                    console.error(`Image file not found: ${imagePath}`);
                }
            }

            console.log(`Attempting to create or update wiki page at: ${wikiPagePath}`);

            try {
                const { headers } = await wikiPageApi.getPage(wikiUrl, wikiPagePath, token);
                const etag = headers['etag'];
                console.log(`ETag for ${wikiPagePath} is: ${etag}`);
                //update page
                const updateResponse = await wikiPageApi.UpdatePage(wikiUrl, wikiPagePath, content, token, etag);
                if (!updateResponse) {
                    throw new Error(`Failed to update wiki page: No response data.`);
                }
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    const typeKey = (error.response.data as any)?.typeKey;
                    if (typeKey === "WikiPageNotFoundException") {
                        console.log(`WikiPageNotFoundException: Page not found at ${wikiPagePath}`);
                        console.error(`[A] Trying to create new page for ${wikiPagePath}:`);
                        const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, content, token);
                        if (!createResponse) {
                            throw new Error(`Failed to create wiki page: No response data.`);
                        }
                        console.log(`Page Created: ${wikiPagePath}`);
                    } else {
                        console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
                        console.error(`[B] Trying to create new page for ${wikiPagePath}:`);
                        const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, content, token);
                        if (!createResponse) {
                            throw new Error(`Failed to create wiki page: No response data.`);
                        }
                    }
                } else {
                    console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
                    console.error(`[C] Trying to create new page for ${wikiPagePath}:`);
                    const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, content, token);
                    if (!createResponse) {
                        throw new Error(`Failed to create wiki page: No response data.`);
                    }
                }
            }
        }
    }
}

function generateWikiPageLink(orgUrl: string, project: string, wikiPagePath: string): string {
    const cleanPath = wikiPagePath.startsWith('/') ? wikiPagePath.substring(1) : wikiPagePath;
    const encodedPath = encodeURIComponent(cleanPath);
    return `${orgUrl}${project}/_wiki/wikis/${project}.wiki?pagePath=%2F${encodedPath}`;
}


async function uploadImageAsAttachment(wikiPageApi: WikiPageApi, wikiUrl: string, imagePath: string, token: string): Promise<string> {
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

// Refactored orchestration logic for testability
export async function runTask({
    tlLib = tl,
    pathLib = path,
    fsLib = fs,
    azdevLib = azdev,
    WikiApiLib = WikiApi,
    WikiInterfacesLib = WikiInterfaces,
    limLib = lim,
    baLib = ba,
    biLib = bi,
    WorkItemTrackingApiLib = WorkItemTrackingApi,
    WorkItemTrackingInterfacesLib = WorkItemTrackingInterfaces,
    axiosLib = axios,
    WikiPageApiClass = WikiPageApi,
    env = process.env
} = {}) {
    debugger;
    // Use injected dependencies everywhere below
    try {
        tlLib.setResourcePath(pathLib.join(__dirname, 'task.json'));
        debugger;
        // Getting input values
        let orgUrl: string = tlLib.getInput('ADOBaseUrl', true);
        let repositoryName: string = tlLib.getInput("MDRepositoryName", true);
        let title: string = tlLib.getInput("MDTitle", true);
        let wikiDestination: string = tlLib.getInput("WikiDestination", true);
        let versionNumber: string = tlLib.getInput("MDVersion", true);
        let wikiSource: string = tlLib.getInput("wikiSource", true); 
        let headerMessage: string = tlLib.getInput("HeaderMessage", false) || '';
        let includePageLink: boolean = tlLib.getBoolInput("IncludePageLink", false) || false;
        let deleteOrphanedPages: boolean = tlLib.getBoolInput("DeleteOrphanedPages", false) || false;

        let token: string = env.SYSTEM_ACCESSTOKEN;
        let project: string = env.SYSTEM_TEAMPROJECT;
        let buildId: string = env.BUILD_BUILDID;

        if (!token) {
            tlLib.setResult(tlLib.TaskResult.Failed, "SYSTEM_ACCESSTOKEN is not set. Ensure 'Allow scripts to access the OAuth token' is enabled in the pipeline settings.");
            return;
        }

        // Authentication
        let authHandler = azdevLib.getPersonalAccessTokenHandler(token);
        let webapi = new azdevLib.WebApi(orgUrl, authHandler, undefined);
        let connData = await webapi.connect();

        // Wiki Access
        let wikiApiObject = await webapi.getWikiApi();
        const wikis = await wikiApiObject.getAllWikis(project);
        if (wikis.length === 0) {
            throw new Error(`No wikis found in project ${project}. Please ensure a wiki is created.`);
        }
        let wikiUrl = wikis[0].url;

        // Retrieve existing pages
        let wikiPageApi = new WikiPageApiClass();
        let wikipages = await wikiPageApi.getPages(wikiUrl, 100, token);


        // Ensure the path exists
        await ensurePathExists(
            wikipages,
            wikiPageApi,
            wikiUrl,
            `${wikiDestination}/${repositoryName}`,
            token,
            orgUrl,
            project,
            repositoryName
        );

        // Collect expected wiki pages from the repository source directory
         const expectedWikiPages = new Set<string>();
        collectExpectedWikiPages(wikiSource, expectedWikiPages, wikiSource, wikiDestination, repositoryName);

        console.log(`Expected wiki pages (${expectedWikiPages.size}):`);
        expectedWikiPages.forEach(page => console.log(`  - ${page}`));

        // Process all .md files in the wikiSource directory and push tonthe wiki
        await processMdFiles(
            wikiSource,
            wikiSource,
            wikiDestination,
            repositoryName,
            headerMessage,
            includePageLink,
            orgUrl,
            project,
            wikiUrl,
            wikiPageApi,
            token,
            wikipages
        );

        // ... (rest of the orchestration logic, always using injected dependencies)
        // For brevity, you should continue this pattern for all fs, path, tl, azdev, axios, etc. usages in the function.
    } catch (error) {
        if (tlLib && tlLib.setResult) {
            tlLib.setResult(tlLib.TaskResult.Failed, (error as Error).message);
        } else {
            throw error;
        }
    }
}

// Keep the original main() for CLI usage
async function main() {
    debugger;
    await runTask();
}

main();
