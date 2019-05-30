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
const _ = require("lodash");
const mongodb_1 = require("mongodb");
class MongoDB {
    constructor(collection, task) {
        this.retrieveBuffer = {};
        this.retrieveRunning = false;
        this.collection = collection;
        this.task = task;
    }
    static init(mongodb, task) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = (yield mongodb_1.MongoClient.connect(mongodb.url, mongodb.options))
                .db(task.extract.db)
                .collection(task.extract.collection);
            if (!MongoDB.oplog) {
                MongoDB.oplog = (yield mongodb_1.MongoClient.connect(mongodb.url, mongodb.options))
                    .db('local')
                    .collection('oplog.rs');
            }
            return new MongoDB(collection, task);
        });
    }
    getCollection() {
        return this.collection
            .find({
            _id: {
                $gte: this.task.from.id,
            },
        })
            .project(this.task.extract.projection)
            .stream();
    }
    getOplog() {
        return MongoDB.oplog
            .find({
            ns: `${this.task.extract.db}.${this.task.extract.collection}`,
            ts: {
                $gte: new mongodb_1.Timestamp(0, this.task.from.time.getTime() / 1000),
            },
            fromMigrate: {
                $ne: true,
            },
        })
            .addCursorFlag('tailable', true)
            .addCursorFlag('oplogReplay', true)
            .addCursorFlag('noCursorTimeout', true)
            .addCursorFlag('awaitData', true);
    }
    retrieve(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.retrieveBuffer[id.toHexString()] = this.retrieveBuffer[id.toHexString()] || [];
                this.retrieveBuffer[id.toHexString()].push(resolve);
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
            try {
                const docs = yield this.collection
                    .find({
                    _id: {
                        $in: ids.map(mongodb_1.ObjectID.createFromHexString),
                    },
                })
                    .toArray();
                console.debug('retrieve from mongodb', docs);
                return _.keyBy(docs, doc => doc._id.toHexString());
            }
            catch (err) {
                console.warn('retrieve from mongodb', this.task.name(), ids, err);
                return {};
            }
        });
    }
}
exports.default = MongoDB;
//# sourceMappingURL=mongodb.js.map