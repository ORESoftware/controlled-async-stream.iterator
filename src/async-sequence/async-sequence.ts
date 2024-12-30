#!/usr/bin/env pnpx tsx

import { Observable, from, zip as rxZip, concat as rxConcat } from 'rxjs';
import { map as rxMap, filter as rxFilter, take as rxTake, skip as rxSkip, tap as rxTap } from 'rxjs/operators';
import {SyncSequence} from "../sync-sequence/sync-sequence";


export class AsyncSequence<T> implements AsyncIterable<T> {
  private iterable: AsyncIterable<T>;

  constructor(iterable: AsyncIterable<T>) {
    this.iterable = iterable;
  }

  static fromAsyncGenerator<T>(generatorFunc: () => AsyncIterable<T>): AsyncSequence<T> {
    return new AsyncSequence(generatorFunc());
  }

  map<U>(fn: (item: T) => Promise<U> | U): AsyncSequence<U> {
    return new AsyncSequence(asyncMap(this.iterable, fn));
  }

  filter(predicate: (item: T) => Promise<boolean> | boolean): AsyncSequence<T> {
    return new AsyncSequence(asyncFilter(this.iterable, predicate));
  }

  flatMap<U>(fn: (item: T) => AsyncIterable<U> | Iterable<U>): AsyncSequence<U> {
    return new AsyncSequence(asyncFlatMap(this.iterable, fn));
  }

  take(n: number): AsyncSequence<T> {
    return new AsyncSequence(asyncTake(this.iterable, n));
  }

  skip(n: number): AsyncSequence<T> {
    return new AsyncSequence(asyncSkip(this.iterable, n));
  }

  concat(...streams: AsyncSequence<T>[]): AsyncSequence<T> {
    return new AsyncSequence(asyncConcat(this.iterable, ...streams.map(s => s.iterable)));
  }

  zip<U>(other: AsyncSequence<U>): AsyncSequence<[T, U]> {
    return new AsyncSequence(asyncZip(this.iterable, other.iterable));
  }

  tap(fn: (item: T) => void | Promise<void>): AsyncSequence<T> {
    return new AsyncSequence(asyncTap(this.iterable, fn));
  }

  flatten(depth: number = Infinity): AsyncSequence<any> {
    return new AsyncSequence(asyncFlatten(this.iterable, depth));
  }

  async reduce<U>(
    reducer: (accumulator: U, item: T) => Promise<U> | U,
    initialValue: U
  ): Promise<U> {
    return asyncReduce(this.iterable, reducer, initialValue);
  }

  async toSync(): Promise<SyncSequence<T>> {
    const results: T[] = [];
    for await (const item of this) {
      results.push(item);
    }
    return new SyncSequence(results);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterable[Symbol.asyncIterator]();
  }
}

async function* syncFlatten(iter: Iterable<any>, depth: number = Infinity): AsyncIterableIterator<any> {
  for (const item of iter) {
    if (depth > 0 && item && typeof item[Symbol.asyncIterator] === 'function') {
      yield* asyncFlatten(item, depth - 1);
    } else if(depth > 0 && item && typeof item[Symbol.iterator] === 'function') {
      yield* syncFlatten(item, depth - 1);
    } else {
      yield item;
    }
  }
}

async function* asyncFlatten(iter: AsyncIterable<any>, depth: number = Infinity): AsyncIterableIterator<any> {
  for await (const item of iter) {
    if (depth > 0 && item && typeof item[Symbol.asyncIterator] === 'function') {
      yield* asyncFlatten(item, depth - 1);
    } else if(depth > 0 && item && typeof item[Symbol.iterator] === 'function') {
      yield* syncFlatten(item, depth - 1);
    } else {
      yield item;
    }
  }
}


// Helper function for asyncReduce
async function asyncReduce<T, U>(
  iter: AsyncIterable<T>,
  reducer: (accumulator: U, item: T) => Promise<U> | U,
  initialValue: U
): Promise<U> {
  let accumulator = initialValue;
  for await (const item of iter) {
    accumulator = await reducer(accumulator, item);
  }
  return accumulator;
}

// Helper function for asyncFlatMap
async function* asyncFlatMap<T, U>(
  iter: AsyncIterable<T>,
  fn: (item: T) => AsyncIterable<U> | Iterable<U>
): AsyncIterableIterator<U> {
  for await (const item of iter) {
    const subIterable = await fn(item);
    if (isAsyncIterable(subIterable)) {
      for await (const subItem of subIterable) {
        yield subItem;
      }
    } else {
      for (const subItem of subIterable) {
        yield subItem;
      }
    }
  }
}

// Helper to check if something is AsyncIterable
function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
  return obj && typeof obj[Symbol.asyncIterator] === 'function';
}

// Helper for asyncMap
async function* asyncMap<T, U>(
  iter: AsyncIterable<T>,
  fn: (item: T) => Promise<U> | U
): AsyncIterableIterator<U> {
  for await (const item of iter) {
    yield await fn(item);
  }
}

// Helper for asyncFilter
async function* asyncFilter<T>(
  iter: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean> | boolean
): AsyncIterableIterator<T> {
  for await (const item of iter) {
    if (await predicate(item)) {
      yield item;
    }
  }
}


async function* asyncTake<T>(iter: AsyncIterable<T>, n: number): AsyncIterableIterator<T> {
  let count = 0;
  for await (const item of iter) {
    if (count++ < n) yield item;
    else break;
  }
}

async function* asyncSkip<T>(iter: AsyncIterable<T>, n: number): AsyncIterableIterator<T> {
  let count = 0;
  for await (const item of iter) {
    if (count++ >= n) yield item;
  }
}

async function* asyncConcat<T>(...iters: AsyncIterable<T>[]): AsyncIterableIterator<T> {
  for (const iter of iters) {
    yield* iter;
  }
}

async function* asyncZip<T, U>(iter1: AsyncIterable<T>, iter2: AsyncIterable<U>): AsyncIterableIterator<[T, U]> {
  const it1 = iter1[Symbol.asyncIterator]();
  const it2 = iter2[Symbol.asyncIterator]();
  let a = await it1.next();
  let b = await it2.next();

  while (!a.done && !b.done) {
    yield [a.value, b.value];
    a = await it1.next();
    b = await it2.next();
  }
}

async function* asyncTap<T>(iter: AsyncIterable<T>, fn: (item: T) => void | Promise<void>): AsyncIterableIterator<T> {
  for await (const item of iter) {
    await fn(item);
    yield item;
  }
}


// Example 1: Process numbers lazily
const asyncSeq1 = AsyncSequence.fromAsyncGenerator(async function* () {
    yield* [1, 2, 3, 4, 5];
  })
  .map((x) => x * 2)
  .filter((x) => x > 5)
  .take(3)
  .tap((x) => console.log('Tapped:', x));

(async () => {
  for await (const item of asyncSeq1) {
    console.log(item);
  }
})();

// Example 2: Flatten nested sequences
const asyncSeq2 = AsyncSequence.fromAsyncGenerator(async function* () {
    yield* [[1, 2], [3, [4, 5]], 6];
  })
  .flatten()
  .tap((x) => console.log('Flattened:', x));

(async () => {
  for await (const item of asyncSeq2) {
    console.log(item);
  }
})();
