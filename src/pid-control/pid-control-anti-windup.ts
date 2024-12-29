#!/usr/bin/env pnpm tsx

/**
 * PID Controller with Anti-Windup for Backpressure Management in Async Streams
 *
 * This code dynamically adjusts the rate of yielding values in an asynchronous stream
 * based on the processing speed of the consumer. It uses a PID controller with anti-windup
 * to maintain a target processing rate.
 */

// Asynchronous generator stream with PID-based rate control
async function* stream(rateAdjuster: (latency: number) => number) {
  let delay = 1000; // Initial delay in milliseconds (1 second)
  let lastYieldTime = Date.now(); // Timestamp of the last yield

  // Infinite data generation loop
  for (let i = 0; ; i++) {
    // Wait before yielding the next value
    await new Promise((resolve) => setTimeout(resolve, delay));

    const currentTime = Date.now();
    const latency = currentTime - lastYieldTime; // Measure the time since the last yield
    lastYieldTime = currentTime; // Update the yield timestamp

    yield `Message ${i}`; // Yield the data

    // Adjust the delay based on the PID controller
    delay = rateAdjuster(latency);
  }
}

// Simulated async task to process each stream value
async function doAsyncTask(value: string) {
  console.log(value); // Log the received value
  // Simulate random processing time between 100ms and 500ms
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));
}

// PID Controller with Anti-Windup for Rate Adjustment
function createRateAdjuster() {
  let delay = 1000; // Initial delay in milliseconds

  // PID constants (gains)
  const kP = 0.1;   // Proportional gain - responds to current error
  const kI = 0.01;  // Integral gain - accumulates past error
  const kD = 0.01;  // Derivative gain - reacts to rate of error change

  // State variables for PID control
  let errorSum = 0; // Accumulated error (integral term)
  let lastError = 0; // Previous error (used for derivative calculation)
  const maxErrorSum = 5000; // Anti-windup limit for integral term

  return (latency: number) => {
    const targetLatency = 1000; // Target latency in milliseconds (1 second)

    // Calculate error between target and actual latency
    const error = targetLatency - latency;

    // Derivative of error (change in error)
    const derivative = error - lastError;

    // Anti-windup: Clamp the integral term to prevent excessive accumulation
    errorSum = Math.max(-maxErrorSum, Math.min(maxErrorSum, errorSum + error));

    // PID control output: combines P, I, and D terms
    const adjustment = kP * error + kI * errorSum + kD * derivative;

    // Update the last error for the next iteration
    lastError = error;

    // Adjust the delay, ensuring it stays within reasonable bounds
    delay = Math.max(100, delay + adjustment); // Minimum delay is 100ms

    return delay;
  };
}

// Main function to consume the stream with PID-controlled backpressure
async function main() {
  const rateAdjuster = createRateAdjuster(); // Create the PID-based rate adjuster

  // Consume the stream and process each value
  for await (const v of stream(rateAdjuster)) {
    await doAsyncTask(v); // Simulate processing of each value
  }
}

// Start the process
main();
