#!/usr/bin/env pnpx tsx

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as assert from 'assert';
import * as EE from 'events';
import * as strm from "stream";
import {AsyncLazyStream} from "../../src/async-lazy-stream/async-lazy-stream";


console.log('your simple typescript test goes here.');


async function* dynamicStream(source: any[]): AsyncIterableIterator<any> {
  let index = 0;

  while (true) {
    while (index < source.length) {
      yield source[index++];
    }
    // Wait briefly before checking for new items
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}


const data: number[] = [];

// Simulate data being added at intervals
setInterval(() => {
  const newValue = Math.floor(Math.random() * 100);
  console.log('Pushed:', newValue);
  data.push(newValue);
}, 500); // Add a new value every 500ms

(async () => {
  const stream = new AsyncLazyStream(dynamicStream(data))
    .map(async (x) => x * 2)
    .filter(async (x) => x > 10)
    .tap((x) => console.log('Processed:', x));

  for await (const item of stream.stream()) {
    console.log('Consumed:', item);
  }
})();
