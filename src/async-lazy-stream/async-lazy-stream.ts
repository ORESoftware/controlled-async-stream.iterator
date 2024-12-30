#!/usr/bin/env pnpx tsx

class AsyncLazyStream<T> {
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

  // Start processing and return the final async stream
  async *stream(): AsyncIterable<T> {
    let result: AsyncIterable<any> = this.source;
    for (const operation of this.pipeline) {
      result = operation(result);
    }
    yield* result as AsyncIterable<T>;
  }

  // Terminal operations
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
}

// Async helpers
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
    const subIterable = await fn(item); // Await the Promise if necessary
    if (isAsyncIterable(subIterable)) {
      yield* subIterable;
    } else {
      yield* subIterable as Iterable<U>;
    }
  }
}

// Type guard for AsyncIterable
function isAsyncIterable<T>(obj: any): obj is AsyncIterable<T> {
  return obj && typeof obj[Symbol.asyncIterator] === 'function';
}



// example usage:

async function* asyncRange(start: number, end: number): AsyncIterableIterator<number> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

(async () => {
  const asyncStream = new AsyncLazyStream(asyncRange(1, 5))
    .map(async (x) => x * 2) // Transform
    .filter(async (x) => x > 5) // Filter
    .flatMap(async (x) => [x, x / 2]); // Flatten

// Process lazily
  for await (const item of asyncStream.stream()) {
    console.log(item); // Output: 6, 3, 8, 4, 10, 5
  }

// Reduce operation
  const sum = await asyncStream.reduce(async (acc, x) => acc + x, 0);
  console.log(sum); // Output: 36
})()


