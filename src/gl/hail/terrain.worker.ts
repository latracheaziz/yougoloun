/// <reference lib="webworker" />
import { buildTerrain, type TerrainRequest } from './terrainGen';

self.onmessage = (e: MessageEvent<TerrainRequest>) => {
  const result = buildTerrain(e.data);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(result, [
    result.positions.buffer,
    result.normals.buffer,
    result.colors.buffer,
    result.shadow.buffer,
    result.index.buffer,
  ]);
};
