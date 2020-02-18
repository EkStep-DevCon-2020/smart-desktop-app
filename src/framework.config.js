"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
exports.frameworkConfig = {
    db: {
        cassandra: {
            contactPoints: ["127.0.0.1"]
        },
        elasticsearch: {
            host: "127.0.0.1:9200",
            disabledApis: [
                "cat",
                "cluster",
                "ingest",
                "nodes",
                "remote",
                "snapshot",
                "tasks"
            ]
        },
        couchdb: {
            url: "http://localhost:5984"
        },
        pouchdb: {
            path: "./"
        }
    },
    plugins: [
        {
            id: "openrap-sunbirded-plugin",
            ver: "1.0"
        }
    ],
    pluginBasePath: path.join(__dirname, "node_modules") + "/"
};
