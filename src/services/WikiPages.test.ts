import { WikiPageApi } from './WikiPages';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WikiPageApi', () => {
    const token = 'dummy-token';
    const wikiUrl = 'https://dev.azure.com/org/project/_apis/wiki/wikis/wikiId';
    const pagePath = '/TestPage';
    const content = '# Test Content';

    let api: WikiPageApi;
    beforeEach(() => {
        api = new WikiPageApi();
        jest.clearAllMocks();
    });

    it('should create a page', async () => {
        mockedAxios.put.mockResolvedValueOnce({ data: { id: 1, path: pagePath, content } });
        const result = await api.CreatePage(wikiUrl, pagePath, content, token);
        expect(mockedAxios.put).toHaveBeenCalledWith(
            `${wikiUrl}/pages?path=${pagePath}&api-version=6.0`,
            JSON.stringify({ content }),
            expect.objectContaining({ headers: expect.any(Object) })
        );
        expect(result).toEqual({ id: 1, path: pagePath, content });
    });

    it('should get pages', async () => {
        const pages = [{ id: 1, path: '/page1' }, { id: 2, path: '/page2' }];
        mockedAxios.post.mockResolvedValueOnce({ data: { value: pages } });
        const result = await api.getPages(wikiUrl, 100, token);
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${wikiUrl}/pagesbatch?api-version=6.0-preview.1`,
            JSON.stringify({ top: 100 }),
            expect.objectContaining({ headers: expect.any(Object) })
        );
        expect(result).toEqual(pages);
    });

    it('should get a page', async () => {
        const pageData = { id: 1, path: pagePath, content };
        mockedAxios.get.mockResolvedValueOnce({ data: pageData });
        const result = await api.getPage(wikiUrl, pagePath, token);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${wikiUrl}/pages?path=${pagePath}&includeContent=True&api-version=6.0`,
            expect.objectContaining({ headers: expect.any(Object) })
        );
        expect(result).toEqual(pageData);
    });
});
