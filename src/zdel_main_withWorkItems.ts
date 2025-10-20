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

        if (!token) {
            throw new Error("SYSTEM_ACCESSTOKEN is not set. Ensure 'Allow scripts to access the OAuth token' is enabled in the pipeline settings.");
        }

        console.log(`BuildId: ${buildId}`);
        console.log(`Using Project: ${project}`);
        console.log(`Organization URL: ${orgUrl}`);
        console.log(`Repository Name: ${repositoryName}`);
        console.log(`Title: ${title}`);
        console.log(`Wiki Destination: ${wikiDestination}`);
        console.log(`Version Number: ${versionNumber}`);
        console.log(`Token: ${token ? 'Token is set' : 'Token is not set'}`);

        // Authenticating and connecting
        let authHandler = azdev.getPersonalAccessTokenHandler(token); 
        let webapi = new azdev.WebApi(orgUrl, authHandler, undefined);    
        let connData: lim.ConnectionData = await webapi.connect();
        
        // Wiki Access
        let wikiApiObject: WikiApi.IWikiApi = await webapi.getWikiApi();
        
        const wikis: WikiInterfaces.WikiV2[] = await wikiApiObject.getAllWikis(project);
        if (wikis.length === 0) {
            throw new Error(`No wikis found in project ${project}. Please ensure a wiki is created.`);
        }
        console.log("Wikis", wikis.map((wiki) => wiki));

        // Get Wiki's Pages
        let wikiUrl = wikis[0].url;
        console.log(wikiUrl);

        let wikiPageApi = new WikiPageApi.WikiPageApi;
        let wikipages: WikiInterfaces.WikiPage[] = await wikiPageApi.getPages(wikiUrl, 100, token);
        if (wikipages.length === 0) {
            throw new Error(`No pages found in wiki ${wikis[0].name}. Please ensure pages are created.`);
        }
        console.log(wikipages);
        console.log(`Getting page ${wikipages[0].path}`)

        try {
            let wikiPage: WikiPageApi.WikiPageWithContent = await wikiPageApi.getPage(wikiUrl, wikipages[0].path, token);
            console.log(wikiPage);
        } catch (error) {
            if ((error as any).response && (error as any).response.status === 404) {
                console.log(`Page not found: ${wikipages[0].path}. Please ensure the page exists.`);
            } else {
                throw error;
            }
        }

        // Get Build's related workitems
        console.log(`Getting workItems in build`);
        let buildObject: ba.IBuildApi = await webapi.getBuildApi();
        let buildWorkItems = await buildObject.getBuildWorkItemsRefs(project, Number(buildId));
        console.log("workitems", buildWorkItems.map((wi) => wi));

        let workItemObject: WorkItemTrackingApi.IWorkItemTrackingApi = await webapi.getWorkItemTrackingApi();
        let wiDetails: WorkItemTrackingInterfaces.WorkItem[] = [];

        for (let item of buildWorkItems) {
            wiDetails.push(await workItemObject.getWorkItem(Number(item.id)));
        }

        let workItems: WikiPageApi.IWorkItemDetail[] = [];

        wiDetails.forEach(function (item) {
            workItems.push({
                id: item.id,
                type: item.fields["System.WorkItemType"],
                url: item.url
            } as WikiPageApi.IWorkItemDetail)
        });
        
        let itemTypes = [...new Set(workItems.map(item => item.type))];
        console.log(itemTypes);

        // Build the Release page
        let now = new Date();
        let stringBuilder: string[] = [];

        stringBuilder.push(`# Release Notes - ${now.toDateString()} \n`);
        stringBuilder.push(`## Build Number ${buildId} \n`);
        stringBuilder.push(`# ${repositoryName} version ${versionNumber} \n`);

        itemTypes.forEach(type => {
            stringBuilder.push(`## ${type} \n `);
            stringBuilder.push(`--- \n `);
            workItems.forEach(item => {
                if (item.type === type) {
                    stringBuilder.push(`#${item.id} \n `);
                }
            });
            stringBuilder.push(`\n\n `);
        });

        // Creating Releases Page
        try {
            let releasesPage = await wikiPageApi.CreatePage(wikiUrl, wikiDestination, "", token);
            console.log(`Releases page created at ${wikiDestination}`);
        } catch (error) {
            console.log(`Failed to create releases page at ${wikiDestination}:`, error);
            throw error;
        }

        // Creating Repo Page
        let repourl = `${wikiDestination}/${repositoryName}`;
        try {
            let repoPage = await wikiPageApi.CreatePage(wikiUrl, repourl, "", token);
            console.log(`Repository page created at ${repourl}`);
        } catch (error) {
            console.log(`Failed to create repository page at ${repourl}:`, error);
            throw error;
        }

        let content = stringBuilder.join("");
        console.log(content);

        let page = `${wikiDestination}/${repositoryName}/${versionNumber}`;
        try {
            let notesPage = await wikiPageApi.CreatePage(wikiUrl, page, content, token);
            console.log(`Release notes page created at ${page}`);
        } catch (error) {
            console.log(`Failed to create release notes page at ${page}:`, error);
            throw error;
        }
    }
    catch (error) {
        console.log('Error:', error);
        tl.setResult(tl.TaskResult.Failed, (error as Error).message);
    }
}

run();