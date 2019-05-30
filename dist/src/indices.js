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
class Indices {
    constructor(elasticsearch) {
        if (!Indices.client) {
            Indices.client = new elasticsearch_1.Client(Object.assign({}, elasticsearch.options));
        }
    }
    static init(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const indices = new Indices(config.elasticsearch);
            for (let index of config.elasticsearch.indices) {
                index.index += config.controls.indexNameSuffix;
                if (!(yield indices.exists(index))) {
                    yield indices.create(index);
                    console.log('create index', index.index);
                }
            }
            for (let task of config.tasks) {
                task.load.index += config.controls.indexNameSuffix;
                yield indices.putMapping(task.load);
                console.log('put mapping', task.load.index, task.load.type);
            }
        });
    }
    create(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                Indices.client.indices.create(params, (err, response) => {
                    err ? reject(err) : resolve(response);
                });
            });
        });
    }
    putMapping(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                Indices.client.indices.putMapping(params, (err, response) => {
                    err ? reject(err) : resolve(response);
                });
            });
        });
    }
    exists(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                Indices.client.indices.exists(params, (err, response) => {
                    err ? reject(err) : resolve(response);
                });
            });
        });
    }
}
exports.default = Indices;
//# sourceMappingURL=indices.js.map