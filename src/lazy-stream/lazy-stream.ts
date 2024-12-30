#!/usr/bin/env pnpx tsx

import { Observable, from, zip as rxZip, concat as rxConcat } from 'rxjs';
import { map as rxMap, filter as rxFilter, take as rxTake, skip as rxSkip, tap as rxTap } from 'rxjs/operators';

class LazyStream<T> {
  private pipeline: Array<(input: Iterable<any>) => Iterable<any>> = [];

  constructor(private source: Iterable<T>) {}

  static from<T>(generator: () => Iterable<T>): LazyStream<T> {
    return new LazyStream<T>(generator());
  }

  // Add an operation to the pipeline
  private addOperation<U>(
    operation: (input: Iterable<any>) => Iterable<U>
  ): LazyStream<U> {
    this.pipeline.push(operation);
    return this as unknown as LazyStream<U>; // Explicitly cast to allow chaining with type U
  }

  // Transformation methods
  map<U>(fn: (item: T) => U): LazyStream<U> {
    return this.addOperation((input) => map(input, fn));
  }

  filter(predicate: (item: T) => boolean): LazyStream<T> {
    return this.addOperation((input) => filter(input, predicate));
  }

  flatMap<U>(fn: (item: T) => Iterable<U>): LazyStream<U> {
    return this.addOperation((input) => flatMap(input, fn));
  }

  // New methods
  take(n: number): LazyStream<T> {
    return this.addOperation((input) => take(input, n));
  }

  skip(n: number): LazyStream<T> {
    return this.addOperation((input) => skip(input, n));
  }

  concat(...streams: LazyStream<T>[]): LazyStream<T> {
    return this.addOperation((input) => concat(input, ...streams.map(s => s.stream())));
  }

  zip<U>(other: LazyStream<U>): LazyStream<[T, U]> {
    return this.addOperation((input) => zip(input, other.stream()));
  }

  tap(fn: (item: T) => void): LazyStream<T> {
    return this.addOperation((input) => tap(input, fn));
  }

  // Flatten method with depth
  flatten(depth: number = Infinity): LazyStream<any> {
    return this.addOperation((input) => flatten(input, depth));
  }

  // Start the processing and return the final stream (iterator)
  stream(): Iterable<T> {
    return this.pipeline.reduce(
      (acc, operation) => operation(acc),
      this.source as Iterable<any>
    ) as Iterable<T>;
  }

  // Terminal operations
  reduce<U>(reducer: (acc: U, item: T) => U, initialValue: U): U {
    let result = initialValue;
    for (const item of this.stream()) {
      result = reducer(result, item);
    }
    return result;
  }

  forEach(action: (item: T) => void): void {
    for (const item of this.stream()) {
      action(item);
    }
  }

  async toPromise(): Promise<T | undefined> {
    for (const item of this.take(1).stream()) {
      return item;
    }
    return undefined;
  }

  // RxJS interop: convert to Observable
  toObservable(): Observable<T> {
    return from(this.stream());
  }
}

// Helper functions
function* map<T, U>(iter: Iterable<T>, fn: (item: T) => U): IterableIterator<U> {
  for (const item of iter) {
    yield fn(item);
  }
}

function* filter<T>(
  iter: Iterable<T>,
  predicate: (item: T) => boolean
): IterableIterator<T> {
  for (const item of iter) {
    if (predicate(item)) {
      yield item;
    }
  }
}

function* flatMap<T, U>(
  iter: Iterable<T>,
  fn: (item: T) => Iterable<U>
): IterableIterator<U> {
  for (const item of iter) {
    yield* fn(item);
  }
}

function* flatten(iter: Iterable<any>, depth: number = Infinity): IterableIterator<any> {
  for (const item of iter) {
    if (depth > 0 && item && typeof item[Symbol.iterator] === 'function') {
      yield* flatten(item, depth - 1);
    } else {
      yield item;
    }
  }
}

function* take<T>(iter: Iterable<T>, n: number): IterableIterator<T> {
  let count = 0;
  for (const item of iter) {
    if (count++ < n) yield item;
    else break;
  }
}

function* skip<T>(iter: Iterable<T>, n: number): IterableIterator<T> {
  let count = 0;
  for (const item of iter) {
    if (count++ >= n) yield item;
  }
}

function* concat<T>(...iters: Iterable<T>[]): IterableIterator<T> {
  for (const iter of iters) {
    yield* iter;
  }
}

function* zip<T, U>(iter1: Iterable<T>, iter2: Iterable<U>): IterableIterator<[T, U]> {
  const it1 = iter1[Symbol.iterator]();
  const it2 = iter2[Symbol.iterator]();
  let a = it1.next();
  let b = it2.next();

  while (!a.done && !b.done) {
    yield [a.value, b.value];
    a = it1.next();
    b = it2.next();
  }
}

function* tap<T>(iter: Iterable<T>, fn: (item: T) => void): IterableIterator<T> {
  for (const item of iter) {
    fn(item);
    yield item;
  }
}

// Example usage
const stream1 = new LazyStream([1, 2, 3, 4, 5])
  .map((x) => x * 2)
  .filter((x) => x > 5)
  .flatMap((x) => [x, x / 2])
  .take(3)
  .skip(1)
  .tap((x) => console.log('Tapped:', x));

stream1.forEach((x) => console.log(x));

const observable = stream1.toObservable().pipe(
  rxMap((x) => x * 2),
  rxFilter((x) => x > 10),
  rxTake(2),
  rxSkip(1),
  rxTap((x) => console.log('RxJS tapped:', x))
);

observable.subscribe((x) => console.log('RxJS:', x));

{
  const stream1 = new LazyStream([1, 2, 3, 4, 5]) // Source: [1, 2, 3, 4, 5]
    .map((x) => x * 2)                         // Transform: [2, 4, 6, 8, 10]
    .filter((x) => x > 5)                       // Filter: [6, 8, 10]
    .flatMap((x) => [x, x / 2]);                // Flatten: [6, 3, 8, 4, 10, 5]

// Use forEach to process results lazily
  stream1.forEach((x) => console.log(x));
// Output: 6, 3, 8, 4, 10, 5

// Reduce to sum all elements
  const sum = stream1.reduce((acc, x) => acc + x, 0);
  console.log(sum); // Output: 36

// Materialize the result into an array
  const result = [...stream1.stream()];
  console.log(result); // Output: [6, 3, 8, 4, 10, 5]
}

