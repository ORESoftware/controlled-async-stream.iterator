#!/usr/bin/env pnpx tsx

// Step 1: Create synchronous data source
import {SyncSequence} from "../../src/sync-sequence/sync-sequence";

const sensorIds = new SyncSequence([101, 102, 103, 104, 105])
  .map((id) => ({id, type: 'temperature'})) // Add initial metadata
  .filter((sensor) => sensor.id > 102);       // Filter IDs > 102

async function  main() {

// Step 2: Convert to asynchronous for API enrichment
  const enrichedSensors = sensorIds.toAsync().map(async (sensor) => {
    // Simulate asynchronous API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      ...sensor,
      location: `Zone-${sensor.id % 3}`, // Add zone info based on ID
      calibration: sensor.id * 0.01      // Add calibration data
    };
  });

// Step 3: Convert back to synchronous for final processing
  const processedSensors = await enrichedSensors.toSync()

  const finalOutput = processedSensors.map((sensor) => ({
      ...sensor,
      adjustedValue: sensor.calibration * 100 // Final computation
    }))
    .tap((sensor) => console.log('Processed Sensor:', sensor)); // Output result

  // Iterate over the final sync sequence
  for (const sensor of finalOutput) {
    console.log('Final:', sensor);
  }
}

main();
