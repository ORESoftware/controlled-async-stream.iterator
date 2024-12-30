#!/usr/bin/env pnpx tsx

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

  // New flatten method
  flatten(): LazyStream<any> {
    return this.addOperation((input) => flatten(input)); // Apply flatten helper
  }

  forEach(action: (item: T) => void): void {
    for (const item of this.stream()) {
      action(item);
    }
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
    yield* fn(item); // Flatten the iterable result
  }
}

// Recursive flatten helper
function* flatten<T>(iter: Iterable<T>): IterableIterator<any> {
  for (const item of iter) {
    if (Array.isArray(item)) {
      yield* flatten(item); // Recursively flatten arrays
    } else {
      yield item; // Yield non-array values
    }
  }
}


// example usage:

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
