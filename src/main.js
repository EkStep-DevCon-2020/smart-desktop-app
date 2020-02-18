"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("OpenRAP/dist/api/index");
const _ = __importStar(require("lodash"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fse = __importStar(require("fs-extra"));
const api_1 = require("@project-sunbird/ext-framework-server/api");
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const framework_config_1 = require("./framework.config");
const express_1 = __importDefault(require("express"));
const portscanner_1 = __importDefault(require("portscanner"));
const bodyParser = __importStar(require("body-parser"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let envs = {};
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let appBaseUrl;
const expressApp = express_1.default();
expressApp.use(bodyParser.json());
let fileSDK = index_1.containerAPI.getFileSDKInstance("");
const reloadUIOnFileChange = () => {
    const subject = new rxjs_1.Subject();
    subject.pipe(operators_1.debounceTime(2500)).subscribe(data => {
        let currentURL = win.webContents.getURL();
        console.log("portal file changed- reloading screen with current url", currentURL);
        fs.rename(path.join("public", "portal", "index.html"), path.join("public", "portal", "index.ejs"), err => {
            if (err)
                console.log("ERROR: " + err);
            win.reload();
        });
    });
    fileSDK
        .watch([path.join("public", "portal")])
        .on("add", path => subject.next(path))
        .on("change", path => subject.next(path))
        .on("unlink", path => subject.next(path));
};


// set the env
const initializeEnv = () => {
    let rootOrgId, hashTagId;
        envs = JSON.parse(fs.readFileSync(path.join(__dirname, "env.json"), { encoding: "utf-8" }));
        let rootOrgObj = JSON.parse(fs.readFileSync(path.join(__dirname, framework_config_1.frameworkConfig.plugins[0].id, "data", "organizations", `${envs["CHANNEL"]}.json`), { encoding: "utf-8" }));
        rootOrgId = _.get(rootOrgObj, "result.response.content[0].rootOrgId");
        hashTagId = _.get(rootOrgObj, "result.response.content[0].hashTagId");
    
    process.env.ROOT_ORG_ID = rootOrgId || hashTagId;
    process.env.ROOT_ORG_HASH_TAG_ID = hashTagId;
    process.env.TELEMETRY_VALIDATION =  "false" ;
    process.env.APP_VERSION = '1.0.0';
    _.forEach(envs, (value, key) => {
        process.env[key] = value;
    });
    process.env.DATABASE_PATH = path.join(__dirname, "database");
    process.env.FILES_PATH = __dirname;
    if (!fs.existsSync(process.env.DATABASE_PATH)) {
        fse.ensureDirSync(process.env.DATABASE_PATH);
    }
};

// get available port from range(9000-9100) and sets it to run th app
const setAvailablePort = () => __awaiter(void 0, void 0, void 0, function* () {
    let port = yield portscanner_1.default.findAPortNotInUse(9000, 9100);
    process.env.APPLICATION_PORT = port;
});
// Initialize ext framework
const framework = () => __awaiter(void 0, void 0, void 0, function* () {
    const subApp = express_1.default();
    subApp.use(bodyParser.json({ limit: "100mb" }));
    expressApp.use("/", subApp);
    return new Promise((resolve, reject) => {
        framework_config_1.frameworkConfig.db.pouchdb.path = process.env.DATABASE_PATH;
        framework_config_1.frameworkConfig["logBasePath"] = __dirname;
        api_1.frameworkAPI
            .bootstrap(framework_config_1.frameworkConfig, subApp)
            .then(() => {
            resolve();
        })
            .catch((error) => {
            console.error(error);
            resolve();
        });
    });
});
// start the express app to load in the main window
const startApp = () => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        expressApp.listen(process.env.APPLICATION_PORT, (error) => {
            if (error) {
                logger_1.logger.error(error);
                reject(error);
            }
            else {
                logger_1.logger.info("app is started on port " + process.env.APPLICATION_PORT);
                resolve();
            }
        });
    });
});
// this will check whether all the plugins are initialized using event from each plugin which should emit '<pluginId>:initialized' event
const checkPluginsInitialized = () => {
    //TODO: for now we are checking one plugin need to change once plugin count increases
    return new Promise(resolve => {
        EventManager_1.EventManager.subscribe("openrap-sunbirded-plugin:initialized", () => {
            resolve();
        });
    });
};
// start loading all the dependencies
const bootstrapDependencies = () => __awaiter(void 0, void 0, void 0, function* () {
    yield initializeEnv();
    yield setAvailablePort();
    yield Promise.all([framework(), checkPluginsInitialized()]);
    yield index_1.containerAPI.bootstrap();
    yield startApp();
    //to handle the unexpected navigation to unknown route
    expressApp.all("*", (req, res) => res.redirect("/"));
});
bootstrapDependencies()