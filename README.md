# @eventology/mongo-es

A Clone of A MongoDB to Elasticsearch connector

[![npm version](https://badge.fury.io/js/@eventology/mongo-es.svg)](https://badge.fury.io/js/@eventology/mongo-es)

## Installation

```bash
npm i -g @eventology/mongo-es
```

## Usage

### Programmatically

```javascript
const fs = require('fs')
const Redis = require('ioredis')
const { Config, Task, run } = require('@eventology/mongo-es')

const redis = new Redis('localhost')

Task.onSaveCheckpoint((name, checkpoint) => {
  return redis.set(`@eventology/mongo-es:${name}`, JSON.stringify(checkpoint))
})

// this will overwrite task.from in config file
Task.onLoadCheckpoint((name) => {
  return redis.get(`@eventology/mongo-es:${name}`).then(JSON.parse)
})

run(new Config(fs.readFileSync('config.json', 'utf8')))
```

## Concepts

### Scan phase

scan entire database for existed documents

### Tail phase

tail the oplog for documents' create, update or delete

## Configuration

Structure:
```json
{
  "controls": {},
  "mongodb": {},  
  "elasticsearch": {},
  "tasks": [
    {
      "extract": {},
      "transform": {},
      "load": {}
    }
  ]
}
```

[Detail example](https://github.com/jike-engineering/@eventology/mongo-es/blob/master/examples/config.json)

### controls

- `mongodbReadCapacity` - Max docs read per second (default: `10000`). (optional)
- `elasticsearchBulkInterval` - Max bluk interval per request (default: `5000`). (optional)
- `elasticsearchBulkSize` - Max bluk size per request (default: `5000`). (optional)
- `indexNameSuffix` - Index name suffix, for index version control. (optional)

### mongodb

- `url` - The connection URI string, eg: `mongodb://user:password@localhost:27017/db?replicaSet=rs0`.
**notice**: must use a `admin` user to access oplog.
- `options` - Connection settings, see: [MongoClient](http://mongodb.github.io/node-mongodb-native/2.1/api/MongoClient.html#.connect). (optional)

### elasticsearch

- `options` - Elasticsearch Config Options, see: [Configuration](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html).
- `indices` - If set, auto create indices when program start, see: [Indeces Create](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference-5-0.html#api-indices-create-5-0). (optional)

### task.from

- `phase` - `scan` or `tail`
- `time` - tail oplog with query: `{ ts: { $gte: new Timestamp(0, new Date(time).getTime() / 1000) } }`
- `id` - scan collection with query `{ _id: { $gte: id }}`

### task.extract

- `db` - Database name.
- `collection` - Collection name in database.
- `projection` - Projection selector, see [Projection](https://docs.mongodb.com/manual/reference/operator/projection/).

### task.transform

- `mapping` - The field mapping from mongodb's collection to elasticsearch's index.
- `parent` - The field in mongodb's collection to use as the `_parent` in elasticsearch's index. (optional)

### task.load

- `index` - The name of the index.
- `type` - The name of the document type.
- `body` - The request body, see [Put Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/5.x/indices-put-mapping.html).

## License

[Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
