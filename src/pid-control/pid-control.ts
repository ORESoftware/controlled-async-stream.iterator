#!/usr/bin/env pnpm tsx

// Simulate an asynchronous generator stream
async function* stream(rateAdjuster: (latency: number) => number) {
  let delay = 1000; // Initial delay (1 second)
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

// Main function to consume the stream with backpressure handling
async function main() {
  // PID-like rate adjustment function
  const rateAdjuster = (() => {
    let delay = 1000; // Initial delay
    let errorSum = 0; // Integral control term
    const kP = 0.1;   // Proportional gain
    const kI = 0.01;  // Integral gain
    const kD = 0.01;  // Derivative gain
    let lastError = 0;

    return (latency: number) => {
      const targetLatency = 1000; // Target latency (1 second)
      const error = targetLatency - latency;
      const derivative = error - lastError;

      // PID calculation
      const adjustment = kP * error + kI * (errorSum += error) + kD * derivative;

      lastError = error;

      // Update delay, ensuring it's always positive
      delay = Math.max(100, delay + adjustment); // Minimum delay = 100ms
      return delay;
    };
  })();

  // Consume the stream with backpressure control
  for await (const v of stream(rateAdjuster)) {
    await doAsyncTask(v); // Process each value in the stream
  }
}

// Run the main function
main();
