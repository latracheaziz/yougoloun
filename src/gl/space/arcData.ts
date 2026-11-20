import { Curve, Vector3 } from 'three';
import { latLonToVec3 } from '../geo';
import { site } from '@/config/site';

/** GCC & MENA cities connected to Hail. */
export const CITIES = [
  { id: 'riyadh', lat: 24.7136, lon: 46.6753 },
  { id: 'jeddah', lat: 21.4858, lon: 39.1925 },
  { id: 'dubai', lat: 25.2048, lon: 55.2708 },
  { id: 'abu-dhabi', lat: 24.4539, lon: 54.3773 },
  { id: 'doha', lat: 25.2854, lon: 51.531 },
  { id: 'kuwait', lat: 29.3759, lon: 47.9774 },
  { id: 'manama', lat: 26.2285, lon: 50.586 },
  { id: 'muscat', lat: 23.588, lon: 58.3829 },
  { id: 'cairo', lat: 30.0444, lon: 31.2357 },
  { id: 'amman', lat: 31.9454, lon: 35.9284 },
] as const;

/** Hail on the unit sphere (globe-local frame). */
export const HAIL_LOCAL = latLonToVec3(site.hail.lat, site.hail.lon);

/** Great-circle arc from a city to Hail, lifted off the surface in proportion to its length. */
export class SurfaceArc extends Curve<Vector3> {
  private readonly from: Vector3;
  private readonly to: Vector3;
  private readonly angle: number;
  private readonly lift: number;

  constructor(from: Vector3, to: Vector3) {
    super();
    this.from = from.clone().normalize();
    this.to = to.clone().normalize();
    this.angle = this.from.angleTo(this.to);
    this.lift = 0.012 + this.angle * 0.42;
  }

  getPoint(t: number, target = new Vector3()) {
    // slerp on the unit sphere
    const s = Math.sin(this.angle) || 1;
    const a = Math.sin((1 - t) * this.angle) / s;
    const b = Math.sin(t * this.angle) / s;
    target.copy(this.from).multiplyScalar(a).addScaledVector(this.to, b).normalize();
    return target.multiplyScalar(1.002 + this.lift * Math.sin(Math.PI * t));
  }
}

/** One arc per city, t = 0 at the city, t = 1 at Hail (pulses and words travel towards Hail). */
export const ARCS = CITIES.map((c) => {
  const curve = new SurfaceArc(latLonToVec3(c.lat, c.lon), HAIL_LOCAL);
  curve.arcLengthDivisions = 64;
  return curve;
});
