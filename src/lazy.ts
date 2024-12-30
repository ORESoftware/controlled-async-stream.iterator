class LazySequence<T> implements Iterable<T> {
  private iterable: Iterable<T>;

  constructor(iterable: Iterable<T>) {
    this.iterable = iterable;
  }

  // Static method to create LazySequence from a generator function
  static fromGenerator<T>(generatorFunc: () => Iterable<T>): LazySequence<T> {
    return new LazySequence(generatorFunc());
  }

  // Map method
  map<U>(fn: (item: T) => U): LazySequence<U> {
    return new LazySequence(map(this.iterable, fn));
  }

  // Filter method
  filter(predicate: (item: T) => boolean): LazySequence<T> {
    return new LazySequence(filter(this.iterable, predicate));
  }

  // Reduce method
  reduce<U>(reducer: (accumulator: U, item: T) => U, initialValue: U): U {
    return reduce(this.iterable, reducer, initialValue);
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