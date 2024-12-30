#!/usr/bin/env pnpx tsx

import { Observable, from, zip as rxZip, concat as rxConcat } from 'rxjs';
import { map as rxMap, filter as rxFilter, take as rxTake, skip as rxSkip, tap as rxTap } from 'rxjs/operators';

export class AsyncLazyStream<T> {
  private pipeline: Array<(input: AsyncIterable<any>) => AsyncIterable<any>> = [];

  constructor(private source: AsyncIterable<T>) {}

  private addOperation<U>(
    operation: (input: AsyncIterable<any>) => AsyncIterable<U>
  ): AsyncLazyStream<U> {
    this.pipeline.push(operation);
    return this as unknown as AsyncLazyStream<U>;
  }

  map<U>(fn: (item: T) => Promise<U> | U): AsyncLazyStream<U> {
    return this.addOperation((input) => asyncMap(input, fn));
  }

  filter(predicate: (item: T) => Promise<boolean> | boolean): AsyncLazyStream<T> {
    return this.addOperation((input) => asyncFilter(input, predicate));
  }

  flatMap<U>(
    fn: (item: T) => AsyncIterable<U> | Iterable<U> | Promise<AsyncIterable<U> | Iterable<U>>
  ): AsyncLazyStream<U> {
    return this.addOperation((input) => asyncFlatMap(input, fn));
  }

  take(n: number): AsyncLazyStream<T> {
    return this.addOperation((input) => asyncTake(input, n));
  }

  skip(n: number): AsyncLazyStream<T> {
    return this.addOperation((input) => asyncSkip(input, n));
  }

  concat(...streams: AsyncLazyStream<T>[]): AsyncLazyStream<T> {
    return this.addOperation((input) => asyncConcat(input, ...streams.map(s => s.stream())));
  }

  zip<U>(other: AsyncLazyStream<U>): AsyncLazyStream<[T, U]> {
    return this.addOperation((input) => asyncZip(input, other.stream()));
  }

  tap(fn: (item: T) => Promise<void> | void): AsyncLazyStream<T> {
    return this.addOperation((input) => asyncTap(input, fn));
  }

  flatten(depth: number = Infinity): AsyncLazyStream<any> {
    return this.addOperation((input) => asyncFlatten(input, depth));
  }

  async *stream(): AsyncIterable<T> {
    let result: AsyncIterable<any> = this.source;
    for (const operation of this.pipeline) {
      result = operation(result);
    }
    yield* result as AsyncIterable<T>;
  }

  async reduce<U>(
    reducer: (acc: U, item: T) => Promise<U> | U,
    initialValue: U
  ): Promise<U> {
    let result = initialValue;
    for await (const item of this.stream()) {
      result = await reducer(result, item);
    }
    return result;
  }

  async forEach(action: (item: T) => Promise<void> | void): Promise<void> {
    for await (const item of this.stream()) {
      await action(item);
    }
  }

  async toPromise(): Promise<T | undefined> {
    for await (const item of this.take(1).stream()) {
      return item;
    }
    return undefined;
  }

  // RxJS interop: convert to Observable
  toObservable(): Observable<T> {
    return from(this.stream());
  }

}

async function* asyncMap<T, U>(
  iter: AsyncIterable<T>,
  fn: (item: T) => Promise<U> | U
): AsyncIterableIterator<U> {
  for await (const item of iter) {
    yield await fn(item);
  }
}

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

async function* asyncFlatMap<T, U>(
  iter: AsyncIterable<T>,
  fn: (item: T) => AsyncIterable<U> | Iterable<U> | Promise<AsyncIterable<U> | Iterable<U>>
): AsyncIterableIterator<U> {
  for await (const item of iter) {
    const subIterable = await fn(item);
    if (isAsyncIterable(subIterable)) {
      yield* subIterable;
    } else {
      yield* subIterable as Iterable<U>;
    }
  }
}

async function* asyncTake<T>(iter: AsyncIterable<T>, n: number): AsyncIterableIterator<T> {
  let count = 0;
  for await (const item of iter) {
    if (count++ >= n) {
      break;
    }
    yield item;
  }
}

async function* asyncSkip<T>(iter: AsyncIterable<T>, n: number): AsyncIterableIterator<T> {
  let count = 0;
  for await (const item of iter) {
    if (count++ >= n) {
      yield item;
    }
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

function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
  return obj && typeof obj[Symbol.asyncIterator] === 'function';
}

async function* syncFlatten(iter: Iterable<any>, depth: number = Infinity): AsyncIterableIterator<any> {
  for  (const item of iter) {
    if (depth > 0 && item && typeof item[Symbol.asyncIterator] === 'function') {
      yield* asyncFlatten(item, depth - 1);
    }
    else if (depth > 0 && item && typeof item[Symbol.iterator] === 'function') {
      yield* syncFlatten(item, depth - 1);
    }
    else {
      yield item;
    }
  }
}

async function* asyncFlatten(iter: AsyncIterable<any>, depth: number = Infinity): AsyncIterableIterator<any> {
  for await (const item of iter) {
    if (depth > 0 && item && typeof item[Symbol.asyncIterator] === 'function') {
      yield* asyncFlatten(item, depth - 1);
    }
    else if (depth > 0 && item && typeof item[Symbol.iterator] === 'function') {
      yield* syncFlatten(item, depth - 1);
    } else {
      yield item;
    }
  }
}

async function* asyncRange(start: number, end: number): AsyncIterableIterator<number> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

(async () => {
  const stream = new AsyncLazyStream(asyncRange(1, 10))
    .map(async (x) => x * 2)
    .filter(async (x) => x > 5)
    .take(3)
    .tap((x) => console.log('Tapped:', x));

  for await (const item of stream.stream()) {
    console.log(item);
  }
})();

const observable = new AsyncLazyStream(asyncRange(1, 10)).toObservable().pipe(
  rxMap((x) => x * 2),
  rxFilter((x) => x > 10),
  rxTake(2),
  rxSkip(1),
  rxTap((x) => console.log('RxJS tapped:', x))
);

observable.subscribe((x) => console.log('RxJS:', x));
