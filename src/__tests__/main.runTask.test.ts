import { runTask } from '../main';

const mockSetResourcePath = jest.fn();
const mockGetInput = jest.fn();
const mockGetBoolInput = jest.fn();
const mockSetResult = jest.fn();

const mockTl = {
  setResourcePath: mockSetResourcePath,
  getInput: mockGetInput,
  getBoolInput: mockGetBoolInput,
  setResult: mockSetResult,
  TaskResult: { Failed: 'Failed' }
};

const mockWikiPageApi = jest.fn().mockImplementation(() => ({
  getPages: jest.fn().mockResolvedValue([]),
  CreatePage: jest.fn().mockResolvedValue({}),
  getPage: jest.fn().mockResolvedValue({ headers: { etag: 'etag' } }),
  UpdatePage: jest.fn().mockResolvedValue({}),
  DeletePage: jest.fn().mockResolvedValue({})
}));

const mockWebApi = jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue({ authenticatedUser: { providerDisplayName: 'Test User' } }),
  getWikiApi: jest.fn().mockResolvedValue({
    getAllWikis: jest.fn().mockResolvedValue([{ url: 'https://wiki.url' }])
  })
}));

const mockAzdev = {
  getPersonalAccessTokenHandler: jest.fn(),
  WebApi: mockWebApi
};

const mockFs = {
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({ isDirectory: () => false }),
  readFileSync: jest.fn().mockReturnValue(''),
  existsSync: jest.fn().mockReturnValue(false)
};

const mockPath = {
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((p) => p.split('/').pop()),
  relative: jest.fn(() => ''),
  dirname: jest.fn(() => ''),
};

const mockAxios = {
  put: jest.fn().mockResolvedValue({ data: { url: '/.attachments/image' } }),
  post: jest.fn().mockResolvedValue({ data: { value: [] } }),
  get: jest.fn().mockResolvedValue({ data: {}, headers: { etag: 'etag' } }),
  delete: jest.fn().mockResolvedValue({})
};

describe('runTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInput.mockImplementation((name) => {
      const inputs = {
        ADOBaseUrl: 'https://dev.azure.com/',
        MDRepositoryName: 'repo',
        MDTitle: 'title',
        WikiDestination: 'dest',
        MDVersion: '1.0',
        wikiSource: 'src',
        HeaderMessage: '',
      };
      return (inputs as any)[name];
    });
    mockGetBoolInput.mockReturnValue(false);
  });

  it('runs successfully with minimal mocks', async () => {
    await expect(runTask({
      tlLib: mockTl as any,
      pathLib: mockPath as any,
      fsLib: mockFs as any,
      azdevLib: mockAzdev as any,
      axiosLib: mockAxios as any,
      WikiPageApiClass: mockWikiPageApi as any,
      env: {
        SYSTEM_ACCESSTOKEN: 'token',
        SYSTEM_TEAMPROJECT: 'project',
        BUILD_BUILDID: '1',
      }
    })).resolves.not.toThrow();
    debugger;
    expect(mockSetResourcePath).toHaveBeenCalled();
    expect(mockSetResult).not.toHaveBeenCalledWith('Failed', expect.anything());
  });

  it('fails if SYSTEM_ACCESSTOKEN is missing', async () => {
    await runTask({
      tlLib: mockTl as any,
      pathLib: mockPath as any,
      fsLib: mockFs as any,
      azdevLib: mockAzdev as any,
      axiosLib: mockAxios as any,
      WikiPageApiClass: mockWikiPageApi as any,
      env: {
        SYSTEM_ACCESSTOKEN: '',
        SYSTEM_TEAMPROJECT: 'project',
        BUILD_BUILDID: '1',
      }
    });
    debugger;
    expect(mockSetResult).toHaveBeenCalledWith('Failed', expect.any(String));
  });
});
