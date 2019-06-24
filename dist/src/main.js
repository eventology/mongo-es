#!/usr/bin/env node
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
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
const index_1 = require("./index");
function readConfig(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs_1.readFile(path_1.resolve(path), 'utf8', (err, str) => {
                err ? reject(err) : resolve(new config_1.Config(str));
            });
        });
    });
}
readConfig(process.argv[2])
    .then(index_1.run)
    .catch(err => {
    console.error('run', err);
});
//# sourceMappingURL=main.js.map