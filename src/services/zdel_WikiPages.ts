import { WikiPage } from 'azure-devops-node-api/interfaces/WikiInterfaces';
import axios from 'axios';

export interface IPage{
    tittle:string;
    description:string;
    releaseNumber:string;
    badges:string[];
    helpLink:string;
    releaseDate:string;
}

export interface IWorkItemDetail{
    id:number;
    type:string;
    url:string;
}

export interface IGroupWorkItem{
    key:string;
    workItems:IWorkItemDetail[];
}

export interface IWikiPageApi {
    getPages(wikiUrl: string, size: number, token: string): Promise<WikiPage[]>;
    getPage(wikiUrl: string, page: string, token: string): Promise<WikiPageWithContent>;
    CreatePage(wikiUrl: string, page: string, content: string, token: string): Promise<WikiPageWithContent>;
}

export interface WikiPageWithContent extends WikiPage {
    content: string;
}

export class WikiPageApi implements IWikiPageApi {

    private getHeaders(token: string) {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`PAT:${token}`).toString('base64')}`,
            'X-TFS-FedAuthRedirect': 'Suppress',
        };
    }

    async CreatePage(wikiUrl: string, page: string, content: string, token:string): Promise<WikiPageWithContent> {
        let url: string = `${wikiUrl}/pages?path=${page}&api-version=6.0`;
        let putData: string = JSON.stringify({
            "content": content
        });

        let wikipage:WikiPageWithContent = await axios.put(
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

    async getPages(wikiUrl: string, size: number, token: string): Promise<WikiPage[]> {
        let url: string = `${wikiUrl}/pagesbatch?api-version=6.0-preview.1`;
        let postData: string = JSON.stringify({
            "top": 100
        });

        let pages:WikiPage[] = await axios.post(
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

    async getPage(wikiUrl: string, page: string, token:string): Promise<WikiPageWithContent> {
        let url: string = `${wikiUrl}/pages?path=${page}&includeContent=True&api-version=6.0`;

        let wikipage: WikiPageWithContent = await axios.get(
            url,
            { headers: this.getHeaders(token) }
        ).then((response) => {
            return response.data;
        })
        .catch((error) => {
            console.log(error);
        });

        return wikipage;
    }
}