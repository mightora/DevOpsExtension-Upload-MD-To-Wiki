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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2lraVBhZ2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV2lraVBhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGtEQUEwQjtBQWdDMUIsTUFBYSxXQUFXO0lBRVosVUFBVSxDQUFDLEtBQWE7UUFDNUIsT0FBTztZQUNILE1BQU0sRUFBRSxrQkFBa0I7WUFDMUIsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyxhQUFhLEVBQUUsU0FBUyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDeEUsdUJBQXVCLEVBQUUsVUFBVTtTQUN0QyxDQUFDO0lBQ04sQ0FBQztJQUVLLFVBQVUsQ0FBQyxPQUFlLEVBQUUsSUFBWSxFQUFFLE9BQWUsRUFBRSxLQUFZOztZQUN6RSxJQUFJLEdBQUcsR0FBVyxHQUFHLE9BQU8sZUFBZSxJQUFJLGtCQUFrQixDQUFDO1lBQ2xFLElBQUksT0FBTyxHQUFXLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ2pDLFNBQVMsRUFBRSxPQUFPO2FBQ3JCLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxHQUF1QixNQUFNLGVBQUssQ0FBQyxHQUFHLENBQzlDLEdBQUcsRUFDSCxPQUFPLEVBQ1AsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNoQixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDekIsQ0FBQyxDQUFDO2lCQUNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLFFBQVEsQ0FBQztRQUNwQixDQUFDO0tBQUE7SUFFSyxRQUFRLENBQUMsT0FBZSxFQUFFLElBQVksRUFBRSxLQUFhOztZQUN2RCxJQUFJLEdBQUcsR0FBVyxHQUFHLE9BQU8sdUNBQXVDLENBQUM7WUFDcEUsSUFBSSxRQUFRLEdBQVcsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbEMsS0FBSyxFQUFFLEdBQUc7YUFDYixDQUFDLENBQUM7WUFFSCxJQUFJLEtBQUssR0FBYyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQ25DLEdBQUcsRUFDSCxRQUFRLEVBQ1IsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNoQixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQy9CLENBQUMsQ0FBQztpQkFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDYixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztLQUFBO0lBRUssT0FBTyxDQUFDLE9BQWUsRUFBRSxJQUFZLEVBQUUsS0FBWTs7WUFDckQsSUFBSSxHQUFHLEdBQVcsR0FBRyxPQUFPLGVBQWUsSUFBSSxzQ0FBc0MsQ0FBQztZQUV0RixJQUFJLFFBQVEsR0FBd0IsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUMvQyxHQUFHLEVBQ0gsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUN0QyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNoQixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDekIsQ0FBQyxDQUFDO2lCQUNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLFFBQVEsQ0FBQztRQUNwQixDQUFDO0tBQUE7Q0FDSjtBQWxFRCxrQ0FrRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBXaWtpUGFnZSB9IGZyb20gJ2F6dXJlLWRldm9wcy1ub2RlLWFwaS9pbnRlcmZhY2VzL1dpa2lJbnRlcmZhY2VzJztcclxuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVBhZ2V7XHJcbiAgICB0aXR0bGU6c3RyaW5nO1xyXG4gICAgZGVzY3JpcHRpb246c3RyaW5nO1xyXG4gICAgcmVsZWFzZU51bWJlcjpzdHJpbmc7XHJcbiAgICBiYWRnZXM6c3RyaW5nW107XHJcbiAgICBoZWxwTGluazpzdHJpbmc7XHJcbiAgICByZWxlYXNlRGF0ZTpzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSVdvcmtJdGVtRGV0YWlse1xyXG4gICAgaWQ6bnVtYmVyO1xyXG4gICAgdHlwZTpzdHJpbmc7XHJcbiAgICB1cmw6c3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIElHcm91cFdvcmtJdGVte1xyXG4gICAga2V5OnN0cmluZztcclxuICAgIHdvcmtJdGVtczpJV29ya0l0ZW1EZXRhaWxbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJV2lraVBhZ2VBcGkge1xyXG4gICAgZ2V0UGFnZXMod2lraVVybDogc3RyaW5nLCBzaXplOiBudW1iZXIsIHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPFdpa2lQYWdlW10+O1xyXG4gICAgZ2V0UGFnZSh3aWtpVXJsOiBzdHJpbmcsIHBhZ2U6IHN0cmluZywgdG9rZW46IHN0cmluZyk6IFByb21pc2U8V2lraVBhZ2VXaXRoQ29udGVudD47XHJcbiAgICBDcmVhdGVQYWdlKHdpa2lVcmw6IHN0cmluZywgcGFnZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPFdpa2lQYWdlV2l0aENvbnRlbnQ+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdpa2lQYWdlV2l0aENvbnRlbnQgZXh0ZW5kcyBXaWtpUGFnZSB7XHJcbiAgICBjb250ZW50OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXaWtpUGFnZUFwaSBpbXBsZW1lbnRzIElXaWtpUGFnZUFwaSB7XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRIZWFkZXJzKHRva2VuOiBzdHJpbmcpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJhc2ljICR7QnVmZmVyLmZyb20oYFBBVDoke3Rva2VufWApLnRvU3RyaW5nKCdiYXNlNjQnKX1gLFxyXG4gICAgICAgICAgICAnWC1URlMtRmVkQXV0aFJlZGlyZWN0JzogJ1N1cHByZXNzJyxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIENyZWF0ZVBhZ2Uod2lraVVybDogc3RyaW5nLCBwYWdlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgdG9rZW46c3RyaW5nKTogUHJvbWlzZTxXaWtpUGFnZVdpdGhDb250ZW50PiB7XHJcbiAgICAgICAgbGV0IHVybDogc3RyaW5nID0gYCR7d2lraVVybH0vcGFnZXM/cGF0aD0ke3BhZ2V9JmFwaS12ZXJzaW9uPTYuMGA7XHJcbiAgICAgICAgbGV0IHB1dERhdGE6IHN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgXCJjb250ZW50XCI6IGNvbnRlbnRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IHdpa2lwYWdlOldpa2lQYWdlV2l0aENvbnRlbnQgPSBhd2FpdCBheGlvcy5wdXQoXHJcbiAgICAgICAgICAgIHVybCxcclxuICAgICAgICAgICAgcHV0RGF0YSxcclxuICAgICAgICAgICAgeyBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnModG9rZW4pIH1cclxuICAgICAgICApLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB3aWtpcGFnZTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBnZXRQYWdlcyh3aWtpVXJsOiBzdHJpbmcsIHNpemU6IG51bWJlciwgdG9rZW46IHN0cmluZyk6IFByb21pc2U8V2lraVBhZ2VbXT4ge1xyXG4gICAgICAgIGxldCB1cmw6IHN0cmluZyA9IGAke3dpa2lVcmx9L3BhZ2VzYmF0Y2g/YXBpLXZlcnNpb249Ni4wLXByZXZpZXcuMWA7XHJcbiAgICAgICAgbGV0IHBvc3REYXRhOiBzdHJpbmcgPSBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIFwidG9wXCI6IDEwMFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsZXQgcGFnZXM6V2lraVBhZ2VbXSA9IGF3YWl0IGF4aW9zLnBvc3QoXHJcbiAgICAgICAgICAgIHVybCxcclxuICAgICAgICAgICAgcG9zdERhdGEsXHJcbiAgICAgICAgICAgIHsgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKHRva2VuKSB9XHJcbiAgICAgICAgKS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YS52YWx1ZTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gcGFnZXM7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZ2V0UGFnZSh3aWtpVXJsOiBzdHJpbmcsIHBhZ2U6IHN0cmluZywgdG9rZW46c3RyaW5nKTogUHJvbWlzZTxXaWtpUGFnZVdpdGhDb250ZW50PiB7XHJcbiAgICAgICAgbGV0IHVybDogc3RyaW5nID0gYCR7d2lraVVybH0vcGFnZXM/cGF0aD0ke3BhZ2V9JmluY2x1ZGVDb250ZW50PVRydWUmYXBpLXZlcnNpb249Ni4wYDtcclxuXHJcbiAgICAgICAgbGV0IHdpa2lwYWdlOiBXaWtpUGFnZVdpdGhDb250ZW50ID0gYXdhaXQgYXhpb3MuZ2V0KFxyXG4gICAgICAgICAgICB1cmwsXHJcbiAgICAgICAgICAgIHsgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKHRva2VuKSB9XHJcbiAgICAgICAgKS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gd2lraXBhZ2U7XHJcbiAgICB9XHJcbn0iXX0=