#!/usr/bin/env pnpm tsx

// Simulate an asynchronous generator stream
async function* stream(rateAdjuster: (latency: number) => number) {
  let delay = 1000; // Initial delay
  let lastYieldTime = Date.now();

  for (let i = 0; ; i++) {
    // Wait before yielding, applying the delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    const currentTime = Date.now();
    const latency = currentTime - lastYieldTime; // Measure latency
    lastYieldTime = currentTime;

    yield `Message ${i}`; // Generate data

    // Adjust delay based on processing latency
    delay = rateAdjuster(latency);
  }
}

// Simulate an async task with random processing time
async function doAsyncTask(value: string) {
  console.log(value); // Simulate processing the stream value
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 500)); // Random processing time
}

// Fuzzy logic controller
function fuzzyRateAdjuster() {
  let delay = 1000; // Initial delay

  return (latency: number) => {
    const targetLatency = 1000; // Target latency (1 second)

    // Compute fuzzy variables
    const error = targetLatency - latency;

    // Linguistic terms
    const slow = error > 200; // Too fast
    const normal = error >= -200 && error <= 200; // Within range
    const fast = error < -200; // Too slow

    // Fuzzy rules
    if (slow) {
      delay += 100; // Increase delay if too fast
    } else if (fast) {
      delay -= 100; // Decrease delay if too slow
    }

    // Clamp delay to reasonable bounds
    delay = Math.max(100, Math.min(5000, delay)); // 100ms to 5000ms

    return delay;
  };
}

// Main function to consume the stream with fuzzy control
async function main() {
  const rateAdjuster = fuzzyRateAdjuster();

  for await (const v of stream(rateAdjuster)) {
    await doAsyncTask(v); // Process each value in the stream
  }
}

// Run the main function
main();
