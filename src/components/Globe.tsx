import { useEffect, useRef } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesUrl from "world-atlas/countries-110m.json?url";

const GLOBE_RADIUS = 1.65;
const DEGREE = Math.PI / 180;

type CountrySelection = {
  code: string;
  name: string;
};

type GlobeProps = {
  onCountryClick?: (country: CountrySelection) => void;
  onCountryHover?: (name: string | null) => void;
};

type InteractiveCountryName =
  | "Australia"
  | "Brazil"
  | "China"
  | "Egypt"
  | "France"
  | "Japan"
  | "Singapore"
  | "United Arab Emirates"
  | "United Kingdom"
  | "United States of America";

type CountriesTopology = Topology<{ countries: GeometryCollection }>;
type CountryFeature = {
  id?: string | number;
  properties?: {
    name?: string;
  };
  geometry:
    | {
        type: "Polygon";
        coordinates: number[][][];
      }
    | {
        type: "MultiPolygon";
        coordinates: number[][][][];
      }
    | null;
};

type GeoJsonFeatureCollection = {
  features: CountryFeature[];
};

type PreparedCountry = {
  selection: CountrySelection;
  polygons: number[][][][];
  centroidLat: number;
  centroidLon: number;
  hitRadius: number;
};

const cityMarkers = [
  { name: "Los Angeles", lat: 34.05, lon: -118.24 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Rio de Janeiro", lat: -22.91, lon: -43.17 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
];

const flightRoutes = [
  ["Los Angeles", "Tokyo"],
  ["Los Angeles", "New York"],
  ["New York", "London"],
  ["London", "Dubai"],
  ["Paris", "Cairo"],
  ["Cairo", "Singapore"],
  ["Rio de Janeiro", "Paris"],
  ["Rio de Janeiro", "Sydney"],
  ["Dubai", "Tokyo"],
  ["Singapore", "Sydney"],
];

const countryCodeByName: Record<string, string> = {
  Australia: "AU",
  Brazil: "BR",
  China: "CN",
  Egypt: "EG",
  France: "FR",
  Japan: "JP",
  Singapore: "SG",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States of America": "US",
};

const interactiveCountryNames = new Set<InteractiveCountryName>([
  "Australia",
  "Brazil",
  "China",
  "Egypt",
  "France",
  "Japan",
  "Singapore",
  "United Arab Emirates",
  "United Kingdom",
  "United States of America",
]);

function latLonToVector3(lat: number, lon: number, radius = GLOBE_RADIUS) {
  const phi = (90 - lat) * DEGREE;
  const theta = (lon + 180) * DEGREE;

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function vector3ToLatLon(point: THREE.Vector3) {
  const normalized = point.clone().normalize();
  const lat = Math.asin(normalized.y) / DEGREE;
  const theta = Math.atan2(normalized.z, -normalized.x) / DEGREE;
  const lon = ((((theta - 180) + 540) % 360) - 180);

  return { lat, lon };
}

function countryToSelection(country: CountryFeature): CountrySelection {
  const name = country.properties?.name ?? "Unknown";

  return {
    code: countryCodeByName[name] ?? String(country.id ?? name).slice(0, 3).toUpperCase(),
    name: name === "United States of America" ? "United States" : name,
  };
}

function featurePolygons(country: CountryFeature) {
  if (!country.geometry) {
    return [];
  }

  return country.geometry.type === "Polygon"
    ? [country.geometry.coordinates]
    : country.geometry.coordinates;
}

function simplifyRing(ring: number[][], step = 2) {
  if (ring.length <= 24) {
    return ring;
  }

  return ring.filter((_, index) => index % step === 0 || index === ring.length - 1);
}

function prepareCountries(collection: GeoJsonFeatureCollection) {
  return collection.features
    .filter((country) => interactiveCountryNames.has(country.properties?.name as InteractiveCountryName))
    .map((country): PreparedCountry => {
      const polygons = featurePolygons(country).map((polygon) =>
        polygon.map((ring) => simplifyRing(ring)),
      );

      let totalLat = 0, totalLon = 0, count = 0;
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;

      for (const polygon of polygons) {
        for (const ring of polygon) {
          for (const [, lat] of ring) {
            totalLat += lat;
            count++;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }
      }
      for (const polygon of polygons) {
        for (const ring of polygon) {
          for (const [lon] of ring) {
            totalLon += lon;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        }
      }

      const centroidLat = totalLat / count;
      const centroidLon = totalLon / count;
      const hitRadius = Math.max(
        Math.abs(maxLat - minLat),
        Math.abs(maxLon - minLon),
      ) * 0.6;

      return {
        selection: countryToSelection(country),
        polygons,
        centroidLat,
        centroidLon,
        hitRadius,
      };
    });
}

function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.18, "rgba(150, 245, 255, 0.95)");
  gradient.addColorStop(0.48, "rgba(55, 211, 255, 0.32)");
  gradient.addColorStop(1, "rgba(55, 211, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (let index = 0; index < 700; index += 1) {
    const radius = 6 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb8f5ff,
      size: 0.012,
      transparent: true,
      opacity: 0.42,
    }),
  );
}

function createGridLines() {
  const group = new THREE.Group();
  const latitudeMaterial = new THREE.LineBasicMaterial({
    color: 0x9deeff,
    transparent: true,
    opacity: 0.14,
  });
  const longitudeMaterial = new THREE.LineBasicMaterial({
    color: 0x6bdcff,
    transparent: true,
    opacity: 0.1,
  });

  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = [];

    for (let lon = -180; lon <= 180; lon += 3) {
      points.push(latLonToVector3(lat, lon, GLOBE_RADIUS * 1.004));
    }

    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), latitudeMaterial),
    );
  }

  for (let lon = -150; lon <= 180; lon += 30) {
    const points: THREE.Vector3[] = [];

    for (let lat = -80; lat <= 80; lat += 3) {
      points.push(latLonToVector3(lat, lon, GLOBE_RADIUS * 1.004));
    }

    group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), longitudeMaterial),
    );
  }

  return group;
}

async function loadCountries() {
  try {
    const response = await fetch(countriesUrl);
    if (!response.ok) {
      return { features: [] };
    }
    const topology = (await response.json()) as CountriesTopology;
    return feature(
      topology,
      topology.objects.countries,
    ) as unknown as GeoJsonFeatureCollection;
  } catch {
    return { features: [] };
  }
}

function createCountryOutlines(collection: GeoJsonFeatureCollection) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0x9deeff,
    transparent: true,
    opacity: 0.34,
  });

  const addRing = (ring: number[][]) => {
    if (ring.length < 3) {
      return;
    }

    const points = ring
      .filter((_, index) => index % 2 === 0)
      .map(([lon, lat]) => latLonToVector3(lat, lon, GLOBE_RADIUS * 1.012));

    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  };

  for (const country of collection.features) {
    if (!country.geometry) {
      continue;
    }

    if (country.geometry.type === "Polygon") {
      country.geometry.coordinates.forEach(addRing);
    }

    if (country.geometry.type === "MultiPolygon") {
      country.geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
    }
  }

  return group;
}

function createHighlightLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.022, 128, 128),
    material,
  );

  return { canvas, texture, mesh };
}

function drawRingPath(
  context: CanvasRenderingContext2D,
  ring: number[][],
  width: number,
  height: number,
) {
  ring.forEach(([lon, lat], index) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;

    if (index === 0) {
      context.moveTo(x, y);
      return;
    }

    context.lineTo(x, y);
  });
}

function drawHighlightedCountry(
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  country: PreparedCountry | null,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!country) {
    texture.needsUpdate = true;
    return;
  }

  try {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.shadowColor = "rgba(112, 239, 255, 0.88)";
    context.shadowBlur = 10;
    context.fillStyle = "rgba(84, 226, 255, 0.22)";
    context.strokeStyle = "rgba(204, 252, 255, 0.76)";
    context.lineWidth = 1.7;

    for (const polygon of country.polygons) {
      context.beginPath();
      for (const ring of polygon) {
        drawRingPath(context, ring, canvas.width, canvas.height);
      }
      context.fill("evenodd");
      context.stroke();
    }

    context.restore();
    texture.needsUpdate = true;
  } catch {
    // Silently ignore draw errors
  }
}

function findCountryByCentroid(
  countries: PreparedCountry[],
  lat: number,
  lon: number,
): PreparedCountry | null {
  let best: PreparedCountry | null = null;
  let bestDist = Infinity;

  for (const country of countries) {
    const dLat = lat - country.centroidLat;
    const dLon = lon - country.centroidLon;
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);

    if (dist < country.hitRadius && dist < bestDist) {
      best = country;
      bestDist = dist;
    }
  }

  return best;
}

function createArc(start: THREE.Vector3, end: THREE.Vector3) {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= 96; index += 1) {
    const progress = index / 96;
    const altitude = Math.sin(progress * Math.PI) * 0.48;
    const point = start
      .clone()
      .lerp(end, progress)
      .normalize()
      .multiplyScalar(GLOBE_RADIUS * 1.03 + altitude);

    points.push(point);
  }

  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0xa8f6ff,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
    }),
  );
}

function createNetwork(glowTexture: THREE.Texture | null) {
  if (!glowTexture) {
    return new THREE.Group();
  }

  const group = new THREE.Group();
  const markerByName = new Map(cityMarkers.map((marker) => [marker.name, marker]));
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xeaffff,
    transparent: true,
    opacity: 0.92,
  });
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x8ff7ff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const [from, to] of flightRoutes) {
    const startMarker = markerByName.get(from);
    const endMarker = markerByName.get(to);

    if (!startMarker || !endMarker) {
      continue;
    }

    group.add(
      createArc(
        latLonToVector3(startMarker.lat, startMarker.lon, GLOBE_RADIUS * 1.03),
        latLonToVector3(endMarker.lat, endMarker.lon, GLOBE_RADIUS * 1.03),
      ),
    );
  }

  for (const marker of cityMarkers) {
    const position = latLonToVector3(marker.lat, marker.lon, GLOBE_RADIUS * 1.045);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 16), markerMaterial);
    const glow = new THREE.Sprite(glowMaterial.clone());

    dot.position.copy(position);
    glow.position.copy(position);
    glow.scale.setScalar(0.28);
    group.add(dot);
    group.add(glow);
  }

  return group;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }

    if (child instanceof THREE.Sprite) {
      child.material.dispose();
    }
  });
}

export default function Globe({ onCountryClick, onCountryHover }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onCountryClickRef = useRef(onCountryClick);
  const onCountryHoverRef = useRef(onCountryHover);

  useEffect(() => {
    onCountryClickRef.current = onCountryClick;
  }, [onCountryClick]);

  useEffect(() => {
    onCountryHoverRef.current = onCountryHover;
  }, [onCountryHover]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let isDragging = false;
    let previousX = 0;
    let previousY = 0;
    let pointerMoved = false;
    let hoveredCountry: PreparedCountry | null = null;
    let countries: PreparedCountry[] = [];
    let pendingPointerEvent: PointerEvent | null = null;
    let hoverFrame = 0;
    const dragVelocity = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x06142c, 5.2, 12);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    globeGroup.position.set(-1.2, 0.3, -2);
    globeGroup.rotation.set(0, 0, 0);
    scene.add(globeGroup);

    const baseGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a527b,
      roughness: 0.4,
      metalness: 0.16,
      transmission: 0.12,
      transparent: true,
      opacity: 0.48,
      emissive: 0x083f68,
      emissiveIntensity: 0.72,
    });
    const baseSphere = new THREE.Mesh(baseGeometry, baseMaterial);
    globeGroup.add(baseSphere);

    const rimGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 128, 128);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0x65eaff,
      transparent: true,
      opacity: 0.11,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    globeGroup.add(rim);

    const gridLines = createGridLines();
    const glowTexture = createGlowTexture();
    const network = createNetwork(glowTexture);
    const highlightLayer = createHighlightLayer();
    const stars = createStars();
    globeGroup.add(gridLines);
    globeGroup.add(network);
    globeGroup.add(highlightLayer.mesh);
    scene.add(stars);

    loadCountries().then((collection) => {
      if (disposed) return;
      countries = prepareCountries(collection);
      const outlines = createCountryOutlines(collection);
      globeGroup.add(outlines);
    });

    scene.add(new THREE.AmbientLight(0x64cfff, 1.25));
    const keyLight = new THREE.DirectionalLight(0xb7f9ff, 3.2);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updateHoveredCountry = (event: PointerEvent) => {
      pendingPointerEvent = event;
      if (hoverFrame) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        if (!pendingPointerEvent) return;
        updateHoveredCountryNow(pendingPointerEvent);
      });
    };

    const updateHoveredCountryNow = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const intersects = raycaster.intersectObject(baseSphere, false);
      let nextHovered: PreparedCountry | null = null;

      if (intersects[0] && countries.length > 0) {
        const localPoint = baseSphere.worldToLocal(intersects[0].point.clone());
        const { lat, lon } = vector3ToLatLon(localPoint);
        nextHovered = findCountryByCentroid(countries, lat, lon);
      }

      if (nextHovered !== hoveredCountry) {
        hoveredCountry = nextHovered;
        drawHighlightedCountry(highlightLayer.canvas, highlightLayer.texture, hoveredCountry);
        onCountryHoverRef.current?.(hoveredCountry ? hoveredCountry.selection.name : null);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      isDragging = true;
      pointerMoved = false;
      previousX = event.clientX;
      previousY = event.clientY;
      mount.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;
      previousX = event.clientX;
      previousY = event.clientY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
        pointerMoved = true;
      }
      globeGroup.rotation.y += deltaX * 0.0048;
      globeGroup.rotation.x += deltaY * 0.0032;
      globeGroup.rotation.x = THREE.MathUtils.clamp(globeGroup.rotation.x, -0.9, 0.9);
      dragVelocity.set(deltaX * 0.00038, deltaY * 0.00024);
    };

    const onPointerUp = (event: PointerEvent) => {
      isDragging = false;
      updateHoveredCountry(event);
      if (!pointerMoved && hoveredCountry) {
        onCountryClickRef.current?.(hoveredCountry.selection);
      }
      if (mount.hasPointerCapture(event.pointerId)) {
        mount.releasePointerCapture(event.pointerId);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", updateHoveredCountry);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerUp);
    mount.addEventListener("pointerleave", onPointerUp);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isDragging) {
        globeGroup.rotation.y += 0.0015 + dragVelocity.x;
        globeGroup.rotation.x += dragVelocity.y;
        dragVelocity.multiplyScalar(0.92);
      }
      stars.rotation.y += 0.00018;
      rim.scale.setScalar(1 + Math.sin(Date.now() * 0.0018) * 0.01);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(hoverFrame);
      resizeObserver.disconnect();
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", updateHoveredCountry);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerUp);
      mount.removeEventListener("pointerleave", onPointerUp);
      renderer.domElement.remove();
      disposeObject(globeGroup);
      disposeObject(stars);
      glowTexture?.dispose();
      highlightLayer.texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-label="Interactive rotating travel globe"
      style={{
        width: "100%",
        height: "100%",
        cursor: "none",
        touchAction: "none",
      }}
    />
  );
}