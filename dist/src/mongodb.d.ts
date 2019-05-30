/// <reference types="node" />
import { Readable } from 'stream';
import { Cursor, ObjectID, Collection } from 'mongodb';
import { MongoDoc } from './types';
import { Task, MongoConfig } from './config';
export default class MongoDB {
    static oplog: Collection;
    collection: Collection;
    task: Task;
    retrieveBuffer: {
        [id: string]: ((doc: MongoDoc | null) => void)[];
    };
    retrieveRunning: boolean;
    private constructor();
    static init(mongodb: MongoConfig, task: Task): Promise<MongoDB>;
    getCollection(): Readable;
    getOplog(): Cursor;
    retrieve(id: ObjectID): Promise<MongoDoc | null>;
    _retrieve(): Promise<void>;
    _retrieveBatchSafe(ids: string[]): Promise<{
        [id: string]: MongoDoc;
    }>;
}
