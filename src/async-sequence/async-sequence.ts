class AsyncSequence<T> implements AsyncIterable<T> {
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

  async reduce<U>(
    reducer: (accumulator: U, item: T) => Promise<U> | U,
    initialValue: U
  ): Promise<U> {
    return asyncReduce(this.iterable, reducer, initialValue);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterable[Symbol.asyncIterator]();
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
