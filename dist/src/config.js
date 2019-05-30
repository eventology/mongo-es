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
const mongodb_1 = require("mongodb");
class MongoConfig {
    constructor({ url, options = {} }) {
        this.url = url;
        this.options = options;
    }
}
exports.MongoConfig = MongoConfig;
class ElasticsearchConfig {
    constructor({ options, indices = [] }) {
        this.options = options;
        this.indices = indices;
    }
}
exports.ElasticsearchConfig = ElasticsearchConfig;
class CheckPoint {
    constructor({ phase, id = '000000000000000000000000', time = Date.now() }) {
        this.phase = phase;
        if (phase === 'scan') {
            this.id = new mongodb_1.ObjectID(id);
        }
        this.time = new Date(time);
    }
}
exports.CheckPoint = CheckPoint;
class Task {
    constructor({ from, extract, transform, load }) {
        this.from = new CheckPoint(from);
        this.extract = extract;
        this.transform = transform;
        this.load = load;
    }
    name() {
        return `${this.extract.db}.${this.extract.collection}___${this.load.index}.${this.load.type}`;
    }
    endScan() {
        return __awaiter(this, void 0, void 0, function* () {
            this.from.phase = 'tail';
            delete this.from.id;
            yield Task.saveCheckpoint(this.name(), this.from);
        });
    }
    static onSaveCheckpoint(onSaveCallback) {
        Task.onSaveCallback = onSaveCallback;
    }
    static onLoadCheckpoint(onLoadCallback) {
        Task.onLoadCallback = onLoadCallback;
    }
    static saveCheckpoint(name, checkPoint) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Task.onSaveCallback && Task.onSaveCallback instanceof Function) {
                try {
                    yield Task.onSaveCallback(name, checkPoint);
                }
                catch (err) {
                    console.error('on save checkpoint', name, checkPoint, err);
                }
            }
        });
    }
    static loadCheckpoint(name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (Task.onLoadCallback && Task.onLoadCallback instanceof Function) {
                    const obj = yield Task.onLoadCallback(name);
                    if (obj && obj.phase) {
                        return new CheckPoint(obj);
                    }
                }
                return null;
            }
            catch (err) {
                console.error('on load checkpoint', name, err);
                return null;
            }
        });
    }
}
exports.Task = Task;
class Controls {
    constructor({ mongodbReadCapacity = Infinity, elasticsearchBulkInterval = 5000, elasticsearchBulkSize = 5000, indexNameSuffix = '', }) {
        this.mongodbReadCapacity = mongodbReadCapacity;
        this.elasticsearchBulkInterval = elasticsearchBulkInterval;
        this.elasticsearchBulkSize = elasticsearchBulkSize;
        this.indexNameSuffix = indexNameSuffix;
    }
}
exports.Controls = Controls;
class Config {
    constructor(str) {
        const { mongodb, elasticsearch, tasks, controls } = JSON.parse(str);
        this.mongodb = new MongoConfig(mongodb);
        this.elasticsearch = new ElasticsearchConfig(elasticsearch);
        this.tasks = tasks.map(task => new Task(task));
        this.controls = new Controls(controls);
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map