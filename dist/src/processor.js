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
const rx_1 = require("rx");
const _ = require("lodash");
const config_1 = require("./config");
class Processor {
    constructor(task, controls, mongodb, elasticsearch) {
        this.queue = [];
        this.running = false;
        this.task = task;
        this.controls = controls;
        this.mongodb = mongodb;
        this.elasticsearch = elasticsearch;
        Processor.provisionedReadCapacity = controls.mongodbReadCapacity;
        Processor.consumedReadCapacity = 0;
    }
    static controlReadCapacity(stream) {
        if (!Processor.provisionedReadCapacity) {
            return stream;
        }
        const interval = setInterval(() => {
            Processor.consumedReadCapacity = 0;
            stream.resume();
        }, 1000);
        stream.addListener('data', () => {
            Processor.consumedReadCapacity++;
            if (Processor.consumedReadCapacity >= Processor.provisionedReadCapacity) {
                stream.pause();
            }
        });
        stream.addListener('end', () => {
            clearInterval(interval);
        });
        return stream;
    }
    transformer(action, doc, timestamp, isESDoc = false) {
        if (action === 'delete') {
            return {
                action: 'delete',
                id: doc._id.toString(),
                parent: this.task.transform.parent && _.get(doc, this.task.transform.parent),
                timestamp: timestamp ? timestamp.getHighBits() : 0,
            };
        }
        const data = _.reduce(this.task.transform.mapping, (obj, value, key) => {
            if (isESDoc) {
                key = value;
            }
            if (_.has(doc, key)) {
                _.set(obj, value, _.get(doc, key));
            }
            return obj;
        }, {});
        if (_.isEmpty(data)) {
            return null;
        }
        return {
            action: 'upsert',
            id: doc._id.toString(),
            data,
            parent: this.task.transform.parent && _.get(doc, this.task.transform.parent),
            timestamp: timestamp ? timestamp.getHighBits() : 0,
        };
    }
    applyUpdateMongoDoc(doc, set = {}, unset = {}) {
        _.forEach(this.task.transform.mapping, (ignored, key) => {
            if (_.get(unset, key)) {
                _.unset(doc, key);
            }
            if (_.has(set, key)) {
                _.set(doc, key, _.get(set, key));
            }
        });
        return doc;
    }
    applyUpdateESDoc(doc, set = {}, unset = {}) {
        _.forEach(this.task.transform.mapping, (value, key) => {
            if (_.get(unset, key)) {
                _.unset(doc, value);
            }
            if (_.has(set, key)) {
                _.set(doc, value, _.get(set, key));
            }
        });
        return doc;
    }
    ignoreUpdate(oplog) {
        let ignore = true;
        if (oplog.op === 'u') {
            _.forEach(this.task.transform.mapping, (value, key) => {
                ignore =
                    ignore && !(_.has(oplog.o, key) || _.has(oplog.o.$set, key) || _.get(oplog.o.$unset, key));
            });
        }
        return ignore;
    }
    scan() {
        return rx_1.Observable.create(observer => {
            try {
                const stream = Processor.controlReadCapacity(this.mongodb.getCollection());
                stream.addListener('data', (doc) => {
                    observer.onNext(doc);
                });
                stream.addListener('error', (err) => {
                    observer.onError(err);
                });
                stream.addListener('end', () => {
                    observer.onCompleted();
                });
            }
            catch (err) {
                observer.onError(err);
            }
        });
    }
    tail() {
        return rx_1.Observable.create(observer => {
            try {
                const cursor = this.mongodb.getOplog();
                cursor.forEach((log) => {
                    observer.onNext(log);
                }, () => {
                    observer.onCompleted();
                });
            }
            catch (err) {
                observer.onError(err);
            }
        });
    }
    oplog(oplog) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                switch (oplog.op) {
                    case 'i': {
                        return this.transformer('upsert', oplog.o, oplog.ts);
                    }
                    case 'u': {
                        if (_.size(oplog.o2) !== 1 || !oplog.o2._id) {
                            console.warn('oplog', 'cannot transform', oplog);
                            return null;
                        }
                        if (this.ignoreUpdate(oplog)) {
                            console.debug('ignoreUpdate', oplog);
                            return null;
                        }
                        if (_.keys(oplog.o).find(key => !key.startsWith('$'))) {
                            return this.transformer('upsert', Object.assign({ _id: oplog.o2._id }, oplog.o), oplog.ts);
                        }
                        const old = this.task.transform.parent
                            ? yield this.elasticsearch.search(oplog.o2._id.toHexString())
                            : yield this.elasticsearch.retrieve(oplog.o2._id.toHexString());
                        const doc = old
                            ? this.applyUpdateESDoc(old, oplog.o.$set, oplog.o.$unset)
                            : yield this.mongodb.retrieve(oplog.o2._id);
                        return doc ? this.transformer('upsert', doc, oplog.ts, !!old) : null;
                    }
                    case 'd': {
                        if (_.size(oplog.o) !== 1 || !oplog.o._id) {
                            console.warn('oplog', 'cannot transform', oplog);
                            return null;
                        }
                        const doc = this.task.transform.parent
                            ? yield this.elasticsearch.search(oplog.o._id.toHexString())
                            : oplog.o;
                        console.debug(doc);
                        return doc ? this.transformer('delete', doc, oplog.ts) : null;
                    }
                    default: {
                        return null;
                    }
                }
            }
            catch (err) {
                console.error('oplog', err);
                return null;
            }
        });
    }
    load(irs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (irs.length === 0) {
                return;
            }
            const body = [];
            irs.forEach(ir => {
                switch (ir.action) {
                    case 'upsert': {
                        body.push({
                            index: {
                                _index: this.task.load.index,
                                _type: this.task.load.type,
                                _id: ir.id,
                                _parent: ir.parent,
                            },
                        });
                        body.push(ir.data);
                        break;
                    }
                    case 'delete': {
                        body.push({
                            delete: {
                                _index: this.task.load.index,
                                _type: this.task.load.type,
                                _id: ir.id,
                                _parent: ir.parent,
                            },
                        });
                        break;
                    }
                }
            });
            return yield this.elasticsearch.bulk({ body });
        });
    }
    mergeOplogs(oplogs) {
        const store = {};
        for (let oplog of _.sortBy(oplogs, 'ts')) {
            switch (oplog.op) {
                case 'i': {
                    store[oplog.ns + oplog.o._id.toString()] = oplog;
                    break;
                }
                case 'u': {
                    const key = oplog.ns + oplog.o2._id.toString();
                    const log = store[key];
                    if (log && log.op === 'i') {
                        log.o = this.applyUpdateMongoDoc(log.o, oplog.o.$set, oplog.o.$unset);
                        log.ts = oplog.ts;
                    }
                    else if (log && log.op === 'u') {
                        log.o = _.merge(log.o, oplog.o);
                        log.ts = oplog.ts;
                    }
                    else {
                        store[key] = oplog;
                    }
                    break;
                }
                case 'd': {
                    const key = oplog.ns + oplog.o._id.toString();
                    if (store[key] && store[key].op === 'i') {
                        delete store[key];
                    }
                    else {
                        store[key] = oplog;
                    }
                    break;
                }
            }
        }
        return _.sortBy(_.map(store, oplog => oplog), 'ts');
    }
    scanDocument() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.scan()
                    .bufferWithTimeOrCount(this.controls.elasticsearchBulkInterval, this.controls.elasticsearchBulkSize)
                    .map(docs => _.compact(_.map(docs, doc => this.transformer('upsert', doc))))
                    .subscribe((irs) => __awaiter(this, void 0, void 0, function* () {
                    if (irs.length === 0) {
                        return;
                    }
                    try {
                        yield this.load(irs);
                        yield config_1.Task.saveCheckpoint(this.task.name(), new config_1.CheckPoint({
                            phase: 'scan',
                            id: irs[0].id,
                        }));
                        console.log('scan', this.task.name(), irs.length, irs[0].id);
                    }
                    catch (err) {
                        console.warn('scan', this.task.name(), err.message);
                    }
                }), reject, resolve);
            });
        });
    }
    tailOpLog() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.tail()
                    .bufferWithTimeOrCount(this.controls.elasticsearchBulkInterval, this.controls.elasticsearchBulkSize)
                    .subscribe(oplogs => {
                    this.queue.push(oplogs);
                    if (!this.running) {
                        this.running = true;
                        setImmediate(this._processOplog.bind(this));
                    }
                }, err => {
                    console.error('tail', this.task.name(), err);
                    reject(err);
                }, () => {
                    const err = new Error('should not complete');
                    console.error('tail', this.task.name(), err);
                    reject(err);
                });
            });
        });
    }
    _processOplog() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.queue.length === 0) {
                this.running = false;
                return;
            }
            while (this.queue.length > 0) {
                const oplogs = _.flatten(this.queue);
                this.queue = [];
                yield this._processOplogSafe(oplogs);
            }
            setImmediate(this._processOplog.bind(this));
        });
    }
    _processOplogSafe(oplogs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const irs = _.compact(yield Promise.all(this.mergeOplogs(oplogs).map((oplog) => __awaiter(this, void 0, void 0, function* () {
                    return yield this.oplog(oplog);
                }))));
                if (irs.length > 0) {
                    yield this.load(irs);
                    yield config_1.Task.saveCheckpoint(this.task.name(), new config_1.CheckPoint({
                        phase: 'tail',
                        time: Date.now() - 1000 * 10,
                    }));
                    console.log('tail', this.task.name(), irs.length, new Date(irs[0].timestamp * 1000));
                }
            }
            catch (err) {
                console.warn('tail', this.task.name(), err.message);
            }
        });
    }
}
exports.default = Processor;
//# sourceMappingURL=processor.js.map