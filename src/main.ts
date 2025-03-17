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
import { execSync } from 'child_process';

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
}

export interface WikiPageWithContent extends WikiInterfaces.WikiPage {
    content: string;
}

export class WikiPageApi implements IWikiPageApi {

    private getHeaders(token: string, etag?: string) {
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
}

// Existing code in main.ts
async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        // Getting input values
        let orgUrl: string = tl.getInput('ADOBaseUrl', true);
        let repositoryName: string = tl.getInput("MDRepositoryName", true);
        let title: string = tl.getInput("MDTitle", true);
        let wikiDestination: string = tl.getInput("WikiDestination", true);
        let versionNumber: string = tl.getInput("MDVersion", true);
        let wikiSource: string = tl.getInput("wikiSource", true); 

        let token: string = process.env.SYSTEM_ACCESSTOKEN;
        let project: string = process.env.SYSTEM_TEAMPROJECT;
        let buildId: string = process.env.BUILD_BUILDID;

        console.log("=== Debug Info ===");
        console.log(`BuildId: ${buildId}`);
        console.log(`Project: ${project}`);
        console.log(`Organization URL: ${orgUrl}`);
        console.log(`Repository Name: ${repositoryName}`);
        console.log(`Title: ${title}`);
        console.log(`Wiki Destination: ${wikiDestination}`);
        console.log(`Version Number: ${versionNumber}`);
        console.log(`Wiki Source: ${wikiSource}`); 
        console.log(`Token Present: ${token ? "Yes" : "No"}`);

        if (!token) {
            throw new Error("SYSTEM_ACCESSTOKEN is not set. Ensure 'Allow scripts to access the OAuth token' is enabled in the pipeline settings.");
        }

        // Authentication
        let authHandler = azdev.getPersonalAccessTokenHandler(token);
        let webapi = new azdev.WebApi(orgUrl, authHandler, undefined);
        let connData: lim.ConnectionData = await webapi.connect();

        console.log(`Connected to Azure DevOps as ${connData.authenticatedUser.providerDisplayName}`);

        // Wiki Access
        let wikiApiObject: WikiApi.IWikiApi = await webapi.getWikiApi();

        console.log("Fetching all wikis...");
        const wikis: WikiInterfaces.WikiV2[] = await wikiApiObject.getAllWikis(project);

        if (wikis.length === 0) {
            throw new Error(`No wikis found in project ${project}. Please ensure a wiki is created.`);
        }

        console.log("Available Wikis:", JSON.stringify(wikis, null, 2));

        let wikiUrl = wikis[0].url;
        console.log(`Using Wiki URL: ${wikiUrl}`);

        // Retrieve existing pages
        let wikiPageApi = new WikiPageApi();
        console.log("Fetching existing wiki pages...");
        let wikipages: WikiInterfaces.WikiPage[] = await wikiPageApi.getPages(wikiUrl, 100, token);

        console.log(`Found ${wikipages.length} existing wiki pages`);

        async function ensurePathExists(wikiUrl: string, path: string, token: string) {
            const parts = path.split('/');
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
                        console.error(`Failed to retrieve ETag for ${currentPath}:`, (error as Error).message);
                    }
                } else {
                    console.log(`Page not found: ${currentPath}. Creating the page.`);
                    try {
                        await wikiPageApi.CreatePage(wikiUrl, currentPath, `# ${part}`, token);
                        console.log(`Page created at ${currentPath}`);
                    } catch (error) {
                        console.error(`Failed to create page at ${currentPath}:`, (error as Error).message);
                        throw new Error(`Failed to create page at ${currentPath}. Please check permissions.`);
                    }
                }
            }
        }

        // Ensure the path exists
        console.log(`Ensuring path exists: ${wikiDestination}/${repositoryName}`);
        await ensurePathExists(wikiUrl, `${wikiDestination}/${repositoryName}`, token);

        // Function to log and process .md files
        async function processMdFiles(dir: string) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    await processMdFiles(filePath);
                } else if (file.endsWith('.md')) {
                    console.log(`Markdown File: ${filePath}`);
                    let content = fs.readFileSync(filePath, 'utf8');
                    
                    // Convert Mermaid diagrams to images
                    const diagramsDir = path.join(dir, 'diagrams');
                    if (!fs.existsSync(diagramsDir)) {
                        fs.mkdirSync(diagramsDir);
                    }
                    let updatedMdContent = content.replace(/(```|:::)(mermaid)([\s\S]*?)(```|:::)/g, (match, p1, p2, p3, p4, offset) => {
                        console.log(`=== Convert Mermaid Diagram ===`);
                        const mermaidFilePath = path.join(diagramsDir, `diagram-${offset}.mmd`);
                        fs.writeFileSync(mermaidFilePath, p3.trim());
                        const pngFilePath = mermaidFilePath.replace('.mmd', '.png');
                        console.log(`Generating Mermaid diagram: ${mermaidFilePath}`);
                        execSync(`mmdc -i ${mermaidFilePath} -o ${pngFilePath} --theme default`);
                        console.log(`Generated Mermaid diagram: ${pngFilePath}`);
                        console.log(`=== Next Diagram ===`);
                        return `![Mermaid Diagram](${pngFilePath})`;
                    });

                    // Convert PlantUML diagrams to images
                    updatedMdContent = updatedMdContent.replace(/```plantuml([\s\S]*?)```/g, (match, p1, offset) => {
                        console.log(`=== Convert PlantUML Diagram ===`);
                        const plantUmlFilePath = path.join(diagramsDir, `diagram-${offset}.puml`);
                        fs.writeFileSync(plantUmlFilePath, p1.trim());
                        console.log(`Generated PlantUML file: ${plantUmlFilePath}`);
                        const pngFilePath = plantUmlFilePath.replace('.puml', '.png');
                    
                        const maxRetries = 3;
                        let attempt = 0;
                        let success = false;
                    
                        while (attempt < maxRetries && !success) {
                            try {
                                execSync(`plantuml ${plantUmlFilePath}`);
                                console.log(`Generated PlantUML diagram for file: ${plantUmlFilePath}`);
                                console.log(`Generated PlantUML diagram: ${pngFilePath}`);
                                success = true;
                            } catch (error) {
                                console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
                                attempt++;
                                if (attempt < maxRetries) {
                                    console.log('Retrying...');
                                } else {
                                    console.error('Max retries reached. Failed to generate PlantUML diagram.');
                                }
                            }
                        }

                        // Ensure the file system has caught up
                        if (success) {
                            let fileExists = false;
                            for (let i = 0; i < 5; i++) {
                                if (fs.existsSync(pngFilePath)) {
                                    fileExists = true;
                                    break;
                                }
                                console.log(`Waiting for file system to catch up...`);
                                execSync('sleep 1');
                            }
                            if (!fileExists) {
                                console.error(`Image file does not exist after retries: ${pngFilePath}`);
                                success = false;
                            }
                        }

                        console.log(`=== Next Diagram ===`);
                        return success ? `![PlantUML Diagram](${pngFilePath})` : match;
                    });

                    // Scan for images in the updated markdown content
                    const imageRegex = /!\[.*?\]\((.*?)\)/g;
                    let match;
                    const images = [];
                    while ((match = imageRegex.exec(updatedMdContent)) !== null) {
                        console.log(`Image found: ${match[1]}`);
                        images.push(match[1]);
                    }

                    // Log all images found
                    console.log(`Images found in ${filePath}:`);
                    images.forEach(image => console.log(image));

                    const relativePath = path.relative(wikiSource, filePath).replace(/\\/g, '/');
                    const wikiPagePath = `${wikiDestination}/${repositoryName}/${relativePath.replace(/\.md$/, '')}`;
                    console.log(`Ensuring path exists for: ${wikiPagePath}`);
                    await ensurePathExists(wikiUrl, path.dirname(wikiPagePath), token);

                    console.log(`Attempting to create or update wiki page at: ${wikiPagePath}`); 
                    
                    //let currentPath = '';
                    //currentPath += `/${project}/_apis/wiki/wikis/${repositoryName}/pages?path=${wikiPagePath}&api-version=7.1`;
                    //console.log(`Making request to GET ${orgUrl}${currentPath}`);            
                    
                    try {
                        const { headers } = await wikiPageApi.getPage(wikiUrl,  wikiPagePath, token);
                        const etag = headers['etag'];
                        console.log(`ETag for ${wikiPagePath} is: ${etag}`);
                        //update page
                        const updateResponse = await wikiPageApi.UpdatePage(wikiUrl, wikiPagePath, updatedMdContent, token, etag);
                            if (!updateResponse) {
                                throw new Error(`Failed to update wiki page: No response data.`);
                            }
                    } catch (error) {
                        if (axios.isAxiosError(error) && error.response?.status === 404) {
                            const typeKey = (error.response.data as any)?.typeKey;
                            if (typeKey === "WikiPageNotFoundException") {
                                console.log(`WikiPageNotFoundException: Page not found at ${wikiPagePath}`);
                                console.error(`[A] Trying to create new page for ${wikiPagePath}:`);
                                const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, updatedMdContent, token);
                                if (!createResponse) {
                                    throw new Error(`Failed to create wiki page: No response data.`);
                                }
                                console.log(`Page Created: ${wikiPagePath}`);
                            } else {
                                console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
                                console.error(`[B] Trying to create new page for ${wikiPagePath}:`);
                                const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, updatedMdContent, token);
                                if (!createResponse) {
                                    throw new Error(`Failed to create wiki page: No response data.`);
                                }
                                
                            }
                        } else {
                            console.error(`Failed to retrieve ETag for ${wikiPagePath}:`, (error as Error).message);
                            console.error(`[C] Trying to create new page for ${wikiPagePath}:`);
                            const createResponse = await wikiPageApi.CreatePage(wikiUrl, wikiPagePath, updatedMdContent, token);
                            if (!createResponse) {
                                throw new Error(`Failed to create wiki page: No response data.`);
                            }
                        }
                    }
                    
                }
            }
        }

        // Process all .md files in the wikiSource directory
        await processMdFiles(wikiSource);

        console.log("All markdown files processed successfully.");

    } catch (error) {
        console.error('🚨 Error:', error);
        tl.setResult(tl.TaskResult.Failed, (error as Error).message);
    }
}

run();
