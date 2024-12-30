#!/usr/bin/env pnpx tsx

import {Observable} from "rxjs";

class SyncSequence<T> {
  private iterable: Iterable<T>;

  constructor(iterable: Iterable<T>) {
    this.iterable = iterable;
  }

  static from<T>(g: () => Iterable<T>): SyncSequence<T> {
    return new SyncSequence<T>(g());
  }

  static fromObservable<T>(observable: Observable<T>): SyncSequence<T> {
    const items: T[] = [];
    observable.subscribe((value) => items.push(value));
    return SyncSequence.from(() => items);
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

  flatMap<U>(fn: (item: T) => Iterable<U>): SyncSequence<U> {
    return new SyncSequence(flatMap(this.iterable, fn));
  }

  // Make LazySequence iterable
  [Symbol.iterator](): Iterator<T> {
    return this.iterable[Symbol.iterator]();
  }
}

// Helper functions for map, filter, and reduce
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

// Helper function for flatMap
function* flatMap<T, U>(iter: Iterable<T>, fn: (item: T) => Iterable<U>): IterableIterator<U> {
  for (const item of iter) {
    yield* fn(item); // Flatten the iterable returned by `fn`
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


// Generator function that produces a range of numbers
function* range(start: number, end: number): IterableIterator<number> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

// Use the generator function with LazySequence
const sequence = SyncSequence.from(() => range(1, 10)) // [1, 2, 3, ..., 10]
  .map((x) => x * 2)           // Multiply each number by 2
  .filter((x) => x > 10);      // Keep only numbers greater than 10

// Iterate over the sequence with for...of
for (const item of sequence) {
  console.log(item); // Output: 12, 14, 16, 18, 20
}
