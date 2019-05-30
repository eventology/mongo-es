"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("elasticsearch");
const _ = require("lodash");
class Elasticsearch {
    constructor(elasticsearch, task) {
        this.searchBuffer = {};
        this.searchRunning = false;
        this.retrieveBuffer = {};
        this.retrieveRunning = false;
        if (!Elasticsearch.client) {
            Elasticsearch.client = new elasticsearch_1.Client(Object.assign({}, elasticsearch.options));
        }
        this.task = task;
    }
    bulk(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                Elasticsearch.client.bulk(params, (err, response) => {
                    err ? reject(err) : resolve(response);
                });
            });
        });
    }
    search(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.searchBuffer[id] = this.searchBuffer[id] || [];
                this.searchBuffer[id].push(resolve);
                if (!this.searchRunning) {
                    this.searchRunning = true;
                    setTimeout(this._search.bind(this), 1000);
                }
            });
        });
    }
    _search() {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = _.take(_.keys(this.searchBuffer), 1024);
            if (ids.length === 0) {
                this.searchRunning = false;
                return;
            }
            const docs = yield this._searchBatchSafe(ids);
            ids.forEach(id => {
                const cbs = this.searchBuffer[id];
                delete this.searchBuffer[id];
                cbs.forEach(cb => {
                    cb(docs[id] || null);
                });
            });
            setTimeout(this._search.bind(this), 1000);
        });
    }
    _searchBatchSafe(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                Elasticsearch.client.search({
                    index: this.task.load.index,
                    type: this.task.load.type,
                    body: {
                        query: {
                            terms: {
                                _id: ids,
                            },
                        },
                    },
                }, (err, response) => {
                    try {
                        if (err) {
                            console.warn('search from elasticsearch', this.task.name(), ids, err.message);
                            resolve({});
                            return;
                        }
                        console.debug('search from elasticsearch', response);
                        const docs = response.hits.hits.map(this._mapResponse.bind(this));
                        resolve(_.keyBy(docs, doc => doc._id));
                    }
                    catch (err2) {
                        console.error('search from elasticsearch', this.task.name(), ids, err2);
                        resolve({});
                    }
                });
            });
        });
    }
    retrieve(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.retrieveBuffer[id] = this.retrieveBuffer[id] || [];
                this.retrieveBuffer[id].push(resolve);
                if (!this.retrieveRunning) {
                    this.retrieveRunning = true;
                    setTimeout(this._retrieve.bind(this), 1000);
                }
            });
        });
    }
    _retrieve() {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = _.take(_.keys(this.retrieveBuffer), 1024);
            if (ids.length === 0) {
                this.retrieveRunning = false;
                return;
            }
            const docs = yield this._retrieveBatchSafe(ids);
            ids.forEach(id => {
                const cbs = this.retrieveBuffer[id];
                delete this.retrieveBuffer[id];
                cbs.forEach(cb => {
                    cb(docs[id] || null);
                });
            });
            setTimeout(this._retrieve.bind(this), 1000);
        });
    }
    _retrieveBatchSafe(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                Elasticsearch.client.mget({
                    index: this.task.load.index,
                    type: this.task.load.type,
                    body: {
                        ids,
                    },
                }, (err, response) => {
                    try {
                        if (err || !response.docs) {
                            console.warn('retrieve from elasticsearch', this.task.name(), ids, err.message);
                            resolve({});
                            return;
                        }
                        console.debug('retrieve from elasticsearch', response);
                        const docs = response.docs
                            .filter(doc => doc.found)
                            .map(this._mapResponse.bind(this));
                        resolve(_.keyBy(docs, doc => doc._id));
                    }
                    catch (err2) {
                        console.error('retrieve from elasticsearch', this.task.name(), ids, err2);
                        resolve({});
                    }
                });
            });
        });
    }
    _mapResponse(hit) {
        const doc = hit._source || {};
        doc._id = hit._id;
        if (this.task.transform.parent && hit._parent) {
            _.set(doc, this.task.transform.parent, hit._parent);
        }
        return doc;
    }
}
exports.default = Elasticsearch;
//# sourceMappingURL=elasticsearch.js.map