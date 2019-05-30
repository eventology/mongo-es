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
const mongodb_1 = require("./mongodb");
const elasticsearch_1 = require("./elasticsearch");
const indices_1 = require("./indices");
const processor_1 = require("./processor");
const config_1 = require("./config");
exports.Config = config_1.Config;
exports.Task = config_1.Task;
function run(config) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('run', new Date());
        // check and create indices, mappings
        yield indices_1.default.init(config);
        // load checkpoint
        for (let task of config.tasks) {
            const checkpoint = yield config_1.Task.loadCheckpoint(task.name());
            if (checkpoint) {
                task.from = checkpoint;
            }
            console.log('from checkpoint', task.name(), task.from);
        }
        // run tasks
        for (let task of config.tasks) {
            const mongodb = yield mongodb_1.default.init(config.mongodb, task);
            const elasticsearch = new elasticsearch_1.default(config.elasticsearch, task);
            const processor = new processor_1.default(task, config.controls, mongodb, elasticsearch);
            if (task.from.phase === 'scan') {
                console.log('scan', task.name(), 'from', task.from.id);
                yield processor.scanDocument();
                yield task.endScan();
                console.log('scan', task.name(), 'end');
            }
            console.log('tail', task.name(), 'from', task.from.time);
            processor.tailOpLog().catch(err => {
                console.error('tailOpLog', err);
                process.exit(0);
            });
        }
    });
}
exports.run = run;
console.debug = process.env.NODE_ENV === 'dev' ? console.log : () => null;
//# sourceMappingURL=index.js.map