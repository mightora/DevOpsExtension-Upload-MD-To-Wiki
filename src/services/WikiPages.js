"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikiPageApi = void 0;
const axios_1 = __importDefault(require("axios"));
class WikiPageApi {
    getHeaders(token) {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`PAT:${token}`).toString('base64')}`,
            'X-TFS-FedAuthRedirect': 'Suppress',
        };
    }
    CreatePage(wikiUrl, page, content, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = `${wikiUrl}/pages?path=${page}&api-version=6.0`;
            let putData = JSON.stringify({
                "content": content
            });
            let wikipage = yield axios_1.default.put(url, putData, { headers: this.getHeaders(token) }).then((response) => {
                return response.data;
            })
                .catch((error) => {
                console.log(error);
            });
            return wikipage;
        });
    }
    getPages(wikiUrl, size, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = `${wikiUrl}/pagesbatch?api-version=6.0-preview.1`;
            let postData = JSON.stringify({
                "top": 100
            });
            let pages = yield axios_1.default.post(url, postData, { headers: this.getHeaders(token) }).then((response) => {
                return response.data.value;
            })
                .catch((error) => {
                console.log(error);
            });
            return pages;
        });
    }
    getPage(wikiUrl, page, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = `${wikiUrl}/pages?path=${page}&includeContent=True&api-version=6.0`;
            let wikipage = yield axios_1.default.get(url, { headers: this.getHeaders(token) }).then((response) => {
                return response.data;
            })
                .catch((error) => {
                console.log(error);
            });
            return wikipage;
        });
    }
}
exports.WikiPageApi = WikiPageApi;
