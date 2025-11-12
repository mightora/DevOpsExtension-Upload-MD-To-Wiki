import tl = require('azure-pipelines-task-lib/task');
import path = require('path');
// import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';
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
import { WikiHelperFunctions, ExpectedWikiPage } from './services/WikiPages/wiki_helper_functions';
import { WikiPageApi } from './services/WikiPages/wiki_pages_api_service';


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
    WikiHelper = WikiHelperFunctions,
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
        console.log('All discovered wikis:', JSON.stringify(wikis.map(w => ({
            id: w.id,
            name: w.name,
            type: w.type,
            typeString: w.type === WikiInterfacesLib.WikiType.ProjectWiki ? 'ProjectWiki' : 'CodeWiki'
        })), null, 2));

        // Filter to only Project Wikis (exclude Code Wikis)
        const projectWikis = wikis.filter(wiki => wiki.type === WikiInterfacesLib.WikiType.ProjectWiki);
        
        if (projectWikis.length === 0) {
            throw new Error(`No Project Wikis found in project ${project}. Only found ${wikis.length} Code Wiki(s). Please create a Project Wiki.`);
        }

        // Use the first Project Wiki found
        let selectedWiki = projectWikis[0];
        let wikiUrl = selectedWiki.url;

        console.log(`Using Project Wiki: id=${selectedWiki.id} name=${selectedWiki.name} type=${selectedWiki.type}`);

        // Retrieve existing pages
        let wikiPageApi = new WikiPageApiClass();
        let wikipages = await wikiPageApi.getPages(wikiUrl, 100, token);


        // Ensure the path exists
        await WikiHelper.ensurePathExists(
            wikipages,
            wikiPageApi,
            wikiUrl,
            `${wikiDestination}/${repositoryName}`,
            token,
            orgUrl,
            project,
            repositoryName
        );

        // Process all .md files in the wikiSource directory and push to the wiki
        await WikiHelper.processMdFiles(
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

        console.log("All markdown files processed successfully.");

        // Collect expected wiki pages from the repository source directory
        const expectedWikiPages: ExpectedWikiPage[] = [];
        WikiHelper.collectExpectedWikiPages(wikiSource, expectedWikiPages, wikiSource, wikiDestination, repositoryName);

        console.log(`Expected wiki pages (${expectedWikiPages.length}):`);
        expectedWikiPages.forEach(page => console.log(`  - ${page.WikiPagePath} (${page.IsDirectory ? 'Directory' : 'File'})`));

        // Delete orphaned wiki pages (only if enabled)
        if (deleteOrphanedPages) {
            console.log("Delete orphaned pages is enabled. Checking for pages to delete...");
            await WikiHelper.deleteOrphanedWikiPages(
                expectedWikiPages,
                wikipages,
                wikiDestination,
                repositoryName,
                wikiPageApi,
                wikiUrl,
                token
            );
        } else {
            console.log("Delete orphaned pages is disabled. Skipping orphaned page deletion.");
        }

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
    try {
        debugger;
        await runTask();
    } catch (error) {
        console.error('Error in main():', (error as Error).message);
    }
}

main();
