import { Timestamp, ObjectID } from 'mongodb';
export declare type MongoDoc = {
    _id: ObjectID;
    [key: string]: any;
};
export declare type ESDoc = {
    _id: string;
    [key: string]: any;
};
export declare type OplogInsert = {
    op: 'i';
    o: {
        _id: ObjectID;
        [key: string]: any;
    };
};
export declare type OplogUpdate = {
    op: 'u';
    o: {
        $set?: {
            [key: string]: any;
        };
        $unset?: {
            [key: string]: any;
        };
        [key: string]: any;
    };
    o2: {
        _id: ObjectID;
    };
};
export declare type OplogDelete = {
    op: 'd';
    o: {
        _id: ObjectID;
    };
};
export declare type OpLog = {
    ts: Timestamp;
    ns: string;
    fromMigrate?: boolean;
} & (OplogInsert | OplogUpdate | OplogDelete);
export declare type IRUpsert = {
    action: 'upsert';
    id: string;
    parent?: string;
    data: {
        [key: string]: any;
    };
    timestamp: number;
};
export declare type IRDelete = {
    action: 'delete';
    id: string;
    parent?: string;
    timestamp: number;
};
export declare type IR = IRUpsert | IRDelete;
