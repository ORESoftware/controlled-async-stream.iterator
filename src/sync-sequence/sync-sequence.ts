#!/usr/bin/env pnpx tsx

import { Observable, from, zip as rxZip, concat as rxConcat } from 'rxjs';
import { map as rxMap, filter as rxFilter, take as rxTake, skip as rxSkip, tap as rxTap } from 'rxjs/operators';

class SyncSequence<T> {
  private iterable: Iterable<T>;

  constructor(iterable: Iterable<T>) {
    this.iterable = iterable;
  }

  static from<T>(g: () => Iterable<T>): SyncSequence<T> {
    return new SyncSequence<T>(g());
  }

  // Map method
  map<U>(fn: (item: T) => U): SyncSequence<U> {
    return new SyncSequence(map(this.iterable, fn));
  }

  // Filter method
  filter(predicate: (item: T) => boolean): SyncSequence<T> {
    return new SyncSequence(filter(this.iterable, predicate));
  }

  // Reduce method
  reduce<U>(reducer: (accumulator: U, item: T) => U, initialValue: U): U {
    return reduce(this.iterable, reducer, initialValue);
  }

  // Take method
  take(n: number): SyncSequence<T> {
    return new SyncSequence(take(this.iterable, n));
  }

  // Skip method
  skip(n: number): SyncSequence<T> {
    return new SyncSequence(skip(this.iterable, n));
  }

  // Concat method
  concat(...sequences: SyncSequence<T>[]): SyncSequence<T> {
    return new SyncSequence(concat(this.iterable, ...sequences.map((seq) => seq.iterable)));
  }

  // Zip method
  zip<U>(other: SyncSequence<U>): SyncSequence<[T, U]> {
    return new SyncSequence(zip(this.iterable, other.iterable));
  }

  // Tap method
  tap(fn: (item: T) => void): SyncSequence<T> {
    return new SyncSequence(tap(this.iterable, fn));
  }

  // Flatten method
  flatten<U>(): SyncSequence<U> {
    return new SyncSequence(flatten(this.iterable as Iterable<Iterable<U>>));
  }

  // RxJS interop: convert to Observable
  toObservable(): Observable<T> {
    return from(this.iterable);
  }

  // Make SyncSequence iterable
  [Symbol.iterator](): Iterator<T> {
    return this.iterable[Symbol.iterator]();
  }
}

function* flatten<T>(iter: Iterable<Iterable<T>>): IterableIterator<T> {
  for (const sub of iter) {
    yield* sub;
  }
}

// Helper functions
function* map<T, U>(iter: Iterable<T>, fn: (item: T) => U): IterableIterator<U> {
  for (const item of iter) {
    yield fn(item);
  }
}

function* filter<T>(iter: Iterable<T>, predicate: (item: T) => boolean): IterableIterator<T> {
  for (const item of iter) {
    if (predicate(item)) {
      yield item;
    }
  }
}

function reduce<T, U>(
  iter: Iterable<T>,
  reducer: (accumulator: U, item: T) => U,
  initialValue: U
): U {
  let accumulator = initialValue;
  for (const item of iter) {
    accumulator = reducer(accumulator, item);
  }
  return accumulator;
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
const sequence = SyncSequence.from(() => [1, 2, 3, 4, 5])
  .map((x) => x * 2)
  .filter((x) => x > 5)
  .take(3)
  .skip(1)
  .tap((x) => console.log('Tapped:', x));

for (const item of sequence) {
  console.log(item); // Processed output
}

// RxJS interop example
const observable = sequence.toObservable().pipe(
  rxMap((x) => x * 2),
  rxFilter((x) => x > 10),
  rxTake(2),
  rxSkip(1),
  rxTap((x) => console.log('RxJS tapped:', x))
);

observable.subscribe((x) => console.log('RxJS:', x));


// Generator function that produces a range of numbers
function* range(start: number, end: number): IterableIterator<number> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

// Use the generator function with LazySequence
const sequence2 = SyncSequence.from(() => range(1, 10)) // [1, 2, 3, ..., 10]
  .map((x) => x * 2)           // Multiply each number by 2
  .filter((x) => x > 10);      // Keep only numbers greater than 10

// Iterate over the sequence with for...of
for (const item of sequence2) {
  console.log(item); // Output: 12, 14, 16, 18, 20
}
