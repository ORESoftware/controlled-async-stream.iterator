#!/usr/bin/env pnpx tsx

import { AsyncSequence } from "../../src/async-sequence/async-sequence";

// Step 1: Start with asynchronous input
async function* fetchSensorIds() {
  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate API delay
  yield* [201, 202, 203, 204, 205]; // Yield IDs
}

(async() => {

  // Step 2: Convert to synchronous processing for metadata tagging
  const taggedSensors = await new AsyncSequence(fetchSensorIds())
    .map((id) => ({ id, type: 'humidity' })) // Add initial metadata
    .toSync();

// Step 3: Process synchronously
  const processedSensors = taggedSensors
    .filter((sensor) => sensor.id > 202) // Filter IDs > 202
    .map((sensor) => ({
      ...sensor,
      adjusted: sensor.id * 0.05, // Add adjustment
    }));

// Log intermediate synchronous results
  for (const sensor of processedSensors) {
    console.log('Sync Processed Sensor:', sensor);
  }

// Step 4: Convert back to asynchronous for enrichment
  const enrichedSensors = processedSensors.toAsync().map(async (sensor) => {
    // Simulate async enrichment
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      ...sensor,
      location: `Zone-${sensor.id % 2}`, // Add location info
      calibrated: sensor.adjusted + 1,  // Add calibrated value
    };
  });

// Step 5: Output the final asynchronous stream
  console.log('Async Enriched Sensors:');
  for await (const sensor of enrichedSensors) {
    console.log(sensor);
  }


})();
