import tl = require('azure-pipelines-task-lib/task');
import path = require('path');
import * as azdev from "azure-devops-node-api";
import * as WikiApi from "azure-devops-node-api/WikiApi";
import * as WikiInterfaces from "azure-devops-node-api/interfaces/WikiInterfaces";
import * as lim from "azure-devops-node-api/interfaces/LocationsInterfaces";
import * as WikiPageApi from './services/zdel_WikiPages'
import * as ba from "azure-devops-node-api/BuildApi";
import * as bi from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as WorkItemTrackingApi from 'azure-devops-node-api/WorkItemTrackingApi';
import * as WorkItemTrackingInterfaces from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';

async function run() {
    try {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        // Getting input values
        let orgUrl: string = tl.getInput('ADOBaseUrl', true);
        let repositoryName: string = tl.getInput("RNRepositoryName", true);
        let title: string = tl.getInput("RNTitle", true);
        let wikiDestination: string = tl.getInput("WikiDestination", true);
        let versionNumber: string = tl.getInput("RNVersion", true);

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
        let wikiPageApi = new WikiPageApi.WikiPageApi();
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

        // Retrieve work items related to the build
        console.log("Retrieving related work items...");
        let buildObject: ba.IBuildApi = await webapi.getBuildApi();
        let buildWorkItems = await buildObject.getBuildWorkItemsRefs(project, Number(buildId));

        console.log(`Found ${buildWorkItems.length} related work items`);

        let workItemObject: WorkItemTrackingApi.IWorkItemTrackingApi = await webapi.getWorkItemTrackingApi();
        let wiDetails: WorkItemTrackingInterfaces.WorkItem[] = [];

        for (let item of buildWorkItems) {
            let workItem = await workItemObject.getWorkItem(Number(item.id));
            console.log(`Work Item ID: ${workItem.id}, Type: ${workItem.fields["System.WorkItemType"]}`);
            wiDetails.push(workItem);
        }

        // Build Release Notes
        let now = new Date();
        let content = `
# Release Notes - ${now.toDateString()}

## Build Number ${buildId}

# ${repositoryName} version ${versionNumber}

${wiDetails.length > 0 ? "### Work Items\n" : "### No work items found for this build.\n"}
${wiDetails.map(wi => `- **#${wi.id}**: ${wi.fields["System.Title"]}`).join("\n")}
        `;

        let releasePagePath = `${wikiDestination}/${repositoryName}/${versionNumber}`;
        console.log(`Attempting to create release notes at: ${releasePagePath}`);

        try {
            let releasesPage = await wikiPageApi.CreatePage(wikiUrl, releasePagePath, content, token);
            console.log(`✅ Release notes page created at ${releasePagePath}`);
        } catch (error) {
            console.error(`❌ Failed to create release notes page: ${(error as Error).message}`);
            throw error;
        }

        let repoPagePath = `${wikiDestination}/${repositoryName}`;
        console.log(`Attempting to create repository page at: ${repoPagePath}`);

        try {
            let repoPage = await wikiPageApi.CreatePage(wikiUrl, repoPagePath, "", token);
            console.log(`✅ Repository page created at ${repoPagePath}`);
        } catch (error) {
            console.error(`❌ Failed to create repository page: ${(error as Error).message}`);
            throw error;
        }

        console.log("Final Release Notes Content:");
        console.log(content);

    } catch (error) {
        console.error('🚨 Error:', error);
        tl.setResult(tl.TaskResult.Failed, (error as Error).message);
    }
}

run();
