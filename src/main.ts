#!/usr/bin/env pnpm tsx
'use strict';

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as assert from 'assert';
import * as EE from 'events';
import * as strm from "stream";


export const foo = 'bar';

export const r2gSmokeTest = async function () {
  // r2g command line app uses this exported function
  return true;
};


async function* stream() {
  yield 'Hello';
  yield 'World';
}

async function doAsyncTask(){

}

async function main() {
  for await (const v of stream()) { // Use 'for await' to iterate over async iterators
    await doAsyncTask()
  }
}

main();



