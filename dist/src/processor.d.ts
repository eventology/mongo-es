/// <reference types="rx-core" />
/// <reference types="rx-core-binding" />
/// <reference types="rx-lite" />
/// <reference types="rx-lite-aggregates" />
/// <reference types="rx-lite-backpressure" />
/// <reference types="rx-lite-coincidence" />
/// <reference types="rx-lite-experimental" />
/// <reference types="rx-lite-joinpatterns" />
/// <reference types="rx-lite-time" />
import { Readable } from 'stream';
import { Observable } from 'rx';
import { Timestamp } from 'mongodb';
import { Task, Controls } from './config';
import { IR, MongoDoc, ESDoc, OpLog } from './types';
import Elasticsearch from './elasticsearch';
import MongoDB from './mongodb';
export default class Processor {
    static provisionedReadCapacity: number;
    static consumedReadCapacity: number;
    task: Task;
    controls: Controls;
    mongodb: MongoDB;
    elasticsearch: Elasticsearch;
    queue: OpLog[][];
    running: boolean;
    constructor(task: Task, controls: Controls, mongodb: MongoDB, elasticsearch: Elasticsearch);
    static controlReadCapacity(stream: Readable): Readable;
    transformer(action: 'upsert' | 'delete', doc: MongoDoc | ESDoc, timestamp?: Timestamp, isESDoc?: boolean): IR | null;
    applyUpdateMongoDoc(doc: MongoDoc, set?: {
        [key: string]: any;
    }, unset?: {
        [key: string]: any;
    }): MongoDoc;
    applyUpdateESDoc(doc: ESDoc, set?: {
        [key: string]: any;
    }, unset?: {
        [key: string]: any;
    }): ESDoc;
    ignoreUpdate(oplog: OpLog): boolean;
    scan(): Observable<MongoDoc>;
    tail(): Observable<OpLog>;
    oplog(oplog: OpLog): Promise<IR | null>;
    load(irs: IR[]): Promise<void>;
    mergeOplogs(oplogs: OpLog[]): OpLog[];
    scanDocument(): Promise<void>;
    tailOpLog(): Promise<never>;
    _processOplog(): Promise<void>;
    _processOplogSafe(oplogs: any): Promise<void>;
}
