declare module 'topojson-specification' {
  export interface GeometryCollection {
    type: 'GeometryCollection';
    geometries: Geometry[];
  }
  export type Geometry = Polygon | MultiPolygon | LineString | MultiLineString | Point | MultiPoint | FeatureCollection | GeometryCollection;
  export interface Polygon {
    type: 'Polygon';
    coordinates: number[][][][];
  }
  export interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: number[][][][][];
  }
  export interface LineString {
    type: 'LineString';
    coordinates: number[][];
  }
  export interface MultiLineString {
    type: 'MultiLineString';
    coordinates: number[][][];
  }
  export interface Point {
    type: 'Point';
    coordinates: number[];
  }
  export interface MultiPoint {
    type: 'MultiPoint';
    coordinates: number[][];
  }
  export interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
  }
  export interface Feature<TGeometry extends Geometry = Geometry> {
    type: 'Feature';
    geometry: TGeometry;
    properties: Record<string, unknown>;
    id?: string | number;
  }
  export interface ArcValues {
    type: 'ArcValues';
    arcs: number[][];
    scale: number[];
    translate: number[];
  }
  export type Mesh = ArcValues;
  export interface ArcLayer {
    type: 'ArcLayer';
    arcs: number[][];
  }
  export interface Topology<T = any> {
    type: 'Topology';
    arcType: 'ArcLayer' | 'Mesh';
    arcs: ArcLayer[] | Mesh[];
    objects: T;
    transform?: { scale: number[]; translate: number[] };
  }
}
