const stage = document.getElementById("stage") as HTMLElement;
const canvas = document.getElementById("globe") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const D2R = Math.PI / 180;
const TILT = 0.38;
const SPEED = 0.07;
const FRONT = "rgba(241, 234, 244, 0.6)";
const LAND_FRONT = "rgba(254, 234, 228, 0.75)";
const CLOUD = "#d4589d";
const PEER = "#f1eaf4";
const YOU = "#2b856c";

const GLOBE_END = 1.6;
const MESH_END = 2.6;

const LATS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
const LONS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];

let W = 0, H = 0;
let cx = 0, cy = 0, R = 200;

const userNodes: Hub[] = [];
let outageActive = false;
const outageNodes = new Set<string>();
let pingKey: string | null = null;
let pingT0 = 0;

function sstep(a: number, b: number, x: number): number {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

const YAW_OPEN = -0.5;
const YAW_SWEEP = 1.1;
let yaw = YAW_OPEN + YAW_SWEEP;
let running = true;
const t0 = performance.now() / 1000;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const nodePts: Array<{ hub: Hub; x: number; y: number; r: number; alpha: number; col: string; front: boolean }> = [];
const winQuad = new Map<string, number>();
const labelSm = new Map<string, { x: number; y: number }>();

type Kind = "cloud" | "peer" | "you";
interface Hub { id?: string; name: string; city: string; lat: number; lon: number; kind: Kind }
function hubKey(h: Hub): string { return h.id ?? h.name; }
const HUBS: Hub[] = [
 { name: "AWS us-east-1", city: "N. Virginia", lat: 38.9072, lon: -77.0369, kind: "cloud" },
	{ name: "AWS us-west-2", city: "Oregon", lat: 45.5152, lon: -122.6784, kind: "cloud" },
	{ name: "AWS eu-central-1", city: "Frankfurt", lat: 50.1109, lon: 8.6821, kind: "cloud" },
	{ name: "AWS ap-northeast-1", city: "Tokyo", lat: 35.6762, lon: 139.6503, kind: "cloud" },
	{ name: "AZURE eastus", city: "Virginia", lat: 37.4316, lon: -78.6569, kind: "cloud" },
	{ name: "AZURE westeurope", city: "Amsterdam", lat: 52.3676, lon: 4.9041, kind: "cloud" },
	{ name: "AZURE southeastasia", city: "Singapore", lat: 1.3521, lon: 103.8198, kind: "cloud" },
	{ name: "AZURE australiaeast", city: "Sydney", lat: -33.8688, lon: 151.2093, kind: "cloud" },
];

const PEER_POOL: Array<{ name: string; city: string; lat: number; lon: number }> = [				{ name: "VPS guangzhou", city: "Guangzhou", lat: 23.1291, lon: 113.2644 },
	{ name: "VPS ontario", city: "Toronto", lat: 43.6532, lon: -79.3832 },
	{ name: "VPS mexico-city", city: "Mexico City", lat: 19.4326, lon: -99.1332 },
	{ name: "VPS sydney", city: "Sydney", lat: -33.8688, lon: 151.2093 },
	{ name: "VPS osaka", city: "Osaka (residential)", lat: 34.6937, lon: 135.5023 },
	{ name: "VPS sao-paulo", city: "São Paulo", lat: -23.5558, lon: -46.6396 },
	{ name: "VPS cape-town", city: "Cape Town", lat: -33.9249, lon: 18.4241 },
	{ name: "VPS seoul", city: "Seoul", lat: 37.5665, lon: 126.978 },
	{ name: "VPS mumbai", city: "Mumbai", lat: 19.076, lon: 72.8777 },
	{ name: "VPS jakarta", city: "Jakarta", lat: -6.2088, lon: 106.8456 },
	{ name: "VPS manila", city: "Manila", lat: 14.5995, lon: 120.9842 },
	{ name: "VPS bangkok", city: "Bangkok", lat: 13.7563, lon: 100.5018 },
	{ name: "VPS hanoi", city: "Hanoi", lat: 21.0278, lon: 105.8342 },
	{ name: "VPS taipei", city: "Taipei", lat: 25.033, lon: 121.5654 },
	{ name: "VPS hong-kong", city: "Hong Kong", lat: 22.3193, lon: 114.1694 },
	{ name: "VPS shanghai", city: "Shanghai", lat: 31.2304, lon: 121.4737 },
	{ name: "VPS beijing", city: "Beijing", lat: 39.9042, lon: 116.4074 },
	{ name: "VPS delhi", city: "Delhi", lat: 28.6139, lon: 77.209 },
	{ name: "VPS dubai", city: "Dubai", lat: 25.2048, lon: 55.2708 },
	{ name: "VPS riyadh", city: "Riyadh", lat: 24.7136, lon: 46.6753 },
	{ name: "VPS istanbul", city: "Istanbul", lat: 41.0082, lon: 28.9784 },
	{ name: "VPS moscow", city: "Moscow", lat: 55.7558, lon: 37.6173 },
	{ name: "VPS berlin", city: "Berlin", lat: 52.52, lon: 13.405 },
	{ name: "VPS paris", city: "Paris", lat: 48.8566, lon: 2.3522 },
	{ name: "VPS madrid", city: "Madrid", lat: 40.4168, lon: -3.7038 },
	{ name: "VPS milan", city: "Milan", lat: 45.4642, lon: 9.19 },
	{ name: "VPS zurich", city: "Zurich", lat: 47.3769, lon: 8.5417 },
	{ name: "VPS stockholm", city: "Stockholm", lat: 59.3293, lon: 18.0686 },
	{ name: "VPS oslo", city: "Oslo", lat: 59.9139, lon: 10.7522 },
	{ name: "VPS nairobi", city: "Nairobi", lat: -1.2921, lon: 36.8219 },
	{ name: "VPS lagos", city: "Lagos", lat: 6.5244, lon: 3.3792 },
	{ name: "VPS cairo", city: "Cairo", lat: 30.0444, lon: 31.2357 },
	{ name: "VPS johannesburg", city: "Johannesburg", lat: -26.2041, lon: 28.0473 },
	{ name: "VPS buenos-aires", city: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
	{ name: "VPS santiago", city: "Santiago", lat: -33.4489, lon: -70.6693 },
	{ name: "VPS lima", city: "Lima", lat: -12.0464, lon: -77.0428 },
	{ name: "VPS bogota", city: "Bogotá", lat: 4.711, lon: -74.0721 },
	{ name: "VPS new-york", city: "New York", lat: 40.7128, lon: -74.006 },
	{ name: "VPS chicago", city: "Chicago", lat: 41.8781, lon: -87.6298 },
	{ name: "VPS dallas", city: "Dallas", lat: 32.7767, lon: -96.797 },
	{ name: "VPS seattle", city: "Seattle", lat: 47.6062, lon: -122.3321 },
	{ name: "VPS vancouver", city: "Vancouver", lat: 49.2827, lon: -123.1207 },
	{ name: "VPS montreal", city: "Montreal", lat: 45.5019, lon: -73.5674 },
	{ name: "VPS auckland", city: "Auckland", lat: -36.8485, lon: 174.7633 },
	{ name: "VPS perth", city: "Perth", lat: -31.9505, lon: 115.8605 },
	{ name: "VPS melbourne", city: "Melbourne", lat: -37.8136, lon: 144.9631 },
	{ name: "VPS brisbane", city: "Brisbane", lat: -27.4698, lon: 153.0251 },
	{ name: "VPS honolulu", city: "Honolulu", lat: 21.3099, lon: -157.8581 },
	{ name: "VPS reykjavik", city: "Reykjavik", lat: 64.1466, lon: -21.9426 },
	{ name: "VPS lisbon", city: "Lisbon", lat: 38.7223, lon: -9.1393 },
];

function mulberry32(seed: number) {
	return function () {
		seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const pingBase = new Map<string, number[]>();

const pingMean = new Map<string, number>();
function sparkFor(hub: Hub): number[] {
	const key = hubKey(hub);
	let h = pingBase.get(key);
	if (!h) {
		const r = mulberry32(
			[...key].reduce((a, c) => a + c.charCodeAt(0) * 31, 7),
		);
		const base = hub.kind === "cloud" ? 14 + r() * 22 : hub.kind === "you" ? 8 + r() * 10 : 30 + r() * 70;
		pingMean.set(key, base);
		h = Array.from({ length: 20 }, () => base + (r() - 0.5) * base * 0.5);
		pingBase.set(key, h);
	}
	return h;
}

let liveTick = 0;
let lastPingT = -1;
const traffic = new Map<string, number>();
function linkKey(a: Hub, b: Hub): string {
	return a.name < b.name ? `${a.name}|${b.name}` : `${b.name}|${a.name}`;
}
function tickPings() {
	liveTick++;
	for (const [name, h] of pingBase) {
		const lastV = h[h.length - 1];
		const mean = pingMean.get(name) ?? lastV;
		const next = Math.max(
			4,
			lastV + (mean - lastV) * 0.18 + Math.sin(liveTick * 0.11 + h.length) * 1.6 + (Math.random() - 0.5) * 2.4,
		);
		h.push(next);
		h.shift();
	}
	for (let i = 0; i < HUBS.length; i++) {
		for (let j = i + 1; j < HUBS.length; j++) {
			const k = linkKey(HUBS[i], HUBS[j]);
			const v = traffic.get(k) ?? Math.random() * 0.5;
			traffic.set(k, Math.min(1, Math.max(0, v + (Math.random() - 0.5) * 0.22)));
		}
	}
}

function hexLerp(a: string, b: string, t: number): string {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function statusColor(ms: number, kind: Kind): string {
	if (kind === "you") return YOU;
	if (ms < 40) return "#2b856c";
	if (ms < 90) return "#d8a93b";
	return "#d4589d";
}

function pinkShade(ms: number): string {
	const t = Math.min(1, Math.max(0, 1 - (ms - 5) / 115));
	return hexLerp("#6e1f4c", "#f7a8cc", t);
}

function geoDist(a: Hub, b: Hub): number {
	const dLat = (a.lat - b.lat) * D2R;
	let dLon = Math.abs(a.lon - b.lon) * D2R;
	if (dLon > Math.PI) dLon = Math.PI * 2 - dLon;
	const mLat = ((a.lat + b.lat) / 2) * D2R;
	return Math.hypot(dLat, dLon * Math.cos(mLat));
}

function linkLat(a: Hub, b: Hub): number {
	const ha = sparkFor(a), hb = sparkFor(b);
	return (ha[ha.length - 1] + hb[hb.length - 1]) / 2 + geoDist(a, b) * 30;
}

const shuffled = PEER_POOL.slice();
for (let i = shuffled.length - 1; i > 0; i--) {
	const j = Math.floor(Math.random() * (i + 1));
	[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const peerCount = 5 + Math.floor(Math.random() * 6);
const peers: Hub[] = shuffled
	.slice(0, peerCount * 2)
	.sort((a, b) => a.lat - b.lat)
	.filter((_, i) => i % 2 === 0)
	.slice(0, peerCount)
	.map((p) => ({ ...p, kind: "peer" as const }));
HUBS.push(...peers);

const youHub: Hub = { name: "you", city: "", lat: 0, lon: -150, kind: "you" };

const POP_PIN: Record<string, string> = {
	SYD: "VPS sydney", MEL: "VPS melbourne", BNE: "VPS brisbane", PER: "VPS perth",
	AKL: "VPS auckland", SIN: "AZURE southeastasia", HKG: "VPS hong-kong",
	NRT: "AWS ap-northeast-1", HND: "AWS ap-northeast-1", KIX: "VPS osaka",
	ICN: "VPS seoul", TPE: "VPS taipei", MNL: "VPS manila", BKK: "VPS bangkok",
	SGN: "VPS hanoi", JKT: "VPS jakarta", BOM: "VPS mumbai", DEL: "VPS delhi",
	DXB: "VPS dubai", DOH: "VPS dubai", RUH: "VPS riyadh",
	IST: "VPS istanbul", DME: "VPS moscow", CAI: "VPS cairo",
	FRA: "AWS eu-central-1", AMS: "AZURE westeurope", LHR: "AZURE westeurope",
	CDG: "VPS paris", MAD: "VPS madrid", MXP: "VPS milan", ZRH: "VPS zurich",
	ARN: "VPS stockholm", OSL: "VPS oslo", LIS: "VPS lisbon", KEF: "VPS reykjavik",
	NBO: "VPS nairobi", LOS: "VPS lagos", JNB: "VPS johannesburg", CPT: "VPS cape-town",
	GRU: "VPS sao-paulo", EZE: "VPS buenos-aires", SCL: "VPS santiago",
	LIM: "VPS lima", BOG: "VPS bogota", MEX: "VPS mexico-city",
	JFK: "VPS new-york", EWR: "VPS new-york", ORD: "VPS chicago",
	DFW: "VPS dallas", SEA: "VPS seattle", YVR: "VPS vancouver",
	YYZ: "VPS ontario", YUL: "VPS montreal", IAD: "AWS us-east-1",
	DEN: "AWS us-west-2", HNL: "VPS honolulu",
};

function setYou(hub: Hub, via: string) {
	youHub.lat = hub.lat;
	youHub.lon = hub.lon;
	youHub.city = `via ${via}`;
	HUBS.push(youHub);
}

async function placeYou() {
	try {
		const res = await fetch(`${dataUrl("data/land-110m.json")}?edge-probe=${Date.now()}`, { method: "HEAD", cache: "no-store" });
		const ray = res.headers.get("cf-ray") ?? "";
		const pop = ray.split("-").pop()?.toUpperCase() ?? "";
		const srv = (res.headers.get("server") ?? "").toUpperCase();
		const code = POP_PIN[pop] ? pop : Object.keys(POP_PIN).find((k) => srv.includes(k));
		if (code) {
			const pin = HUBS.find((h) => h.name === POP_PIN[code]) ?? HUBS[0];
			setYou(pin, code);
			draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
			return;
		}
	} catch {
	}
	try {
		const ranked = HUBS.filter((h) => h.kind === "cloud")
			.map((h) => ({ h, ping: 14 + ([...h.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 40) }))
			.sort((a, b) => a.ping - b.ping)[0];
		const r = mulberry32(Date.now() % 2147483647);
		const jitter = (r() - 0.5) * 8;
		const via = `${ranked.h.city} ≈${Math.max(4, ranked.ping + jitter).toFixed(0)}ms`;
		setYou(ranked.h, via);
		draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
		return;
	} catch {
	}
	youHub.city = "via mid-Pacific relay";
	HUBS.push(youHub);
	draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
}

let land: Array<Array<[number, number]>> = [];
let landReady = false;

async function loadLand() {
	try {
		const res = await fetch(dataUrl("data/land-110m.json"));
		const topo = await res.json();
		const t = topo.transform;
		const sx = t.scale[0], sy = t.scale[1];
		const tx = t.translate[0], ty = t.translate[1];
		const arcs: Array<Array<[number, number]>> = topo.arcs.map(
			(arc: Array<[number, number]>) => {
				let x = 0, y = 0;
				return arc.map(([dx, dy]) => {
					x += dx; y += dy;
					return [x * sx + tx, y * sy + ty] as [number, number];
				});
			},
		);
		const polys: Array<Array<[number, number]>> = [];
		for (const geom of topo.objects.land.geometries) {
			const rings: number[][][] =
				geom.type === "Polygon" ? [geom.arcs] : geom.arcs;
			for (const poly of rings) {
				for (const ring of poly) {
					const pts: Array<[number, number]> = [];
					for (const idx of ring) {
						const ai = idx >= 0 ? idx : ~idx;
						const arc = arcs[ai].slice();
						if (idx < 0) arc.reverse();
						for (let i = 0; i < arc.length - 1; i++) pts.push(arc[i]);
					}
					if (pts.length > 2) {
						pts.push(pts[0]);
						polys.push(pts);
					}
				}
			}
		}
		land = polys;
		landReady = true;
		draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
	} catch {
	}
}

 	let scrollK = 0;
let scrollTarget = 0;
function currentScrollTarget(): number | null {
	const st = document.getElementById("stage");
	const holdEl = document.getElementById("planner");
	if (!st) return null;
	const dwell = holdEl ? Math.max(0, holdEl.offsetHeight - window.innerHeight) : 0;
	const max = Math.max(1, st.offsetHeight - window.innerHeight + dwell);
	return Math.min(Math.max(window.scrollY, 0), max) / max;
}
let settledFired = false;

function yawFacing(lonDeg: number): number {
	return lonDeg * D2R;
}
function angDiff(a: number, b: number): number {
	let d = (b - a) % (Math.PI * 2);
	if (d > Math.PI) d -= Math.PI * 2;
	if (d < -Math.PI) d += Math.PI * 2;
	return d;
}

function layout() {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	W = Math.max(1, window.innerWidth);
	H = Math.max(1, window.innerHeight);
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	const cosT = Math.cos(TILT);

	const poleX = 0.75 * W;
	const poleY = H / 6;
	const dx = W - poleX;
	const dy0 = H - poleY;
	const A = 1 - cosT * cosT;
	const B = -2 * dy0 * cosT;
	const C = dx * dx + dy0 * dy0;
	const disc = B * B - 4 * A * C;
	R = disc > 0
		? (-B - Math.sqrt(disc)) / (2 * A)
		: dy0 + dx;
	cx = poleX;
	cy = poleY + R * cosT;
	
	if (W < 760) {
		const heroEl = document.getElementById("hero");
		const heroLine = heroEl
			? heroEl.offsetTop + heroEl.offsetHeight
			: H / 2;
		const gutter = 16;
		const rGap = (5 * W) / 8;
		const rBase = Math.max(90, rGap);
		const cyBase = heroLine + gutter + rBase;
		const lift = Math.min(100, Math.max(0, (cyBase + rBase) - H));
		R = rBase;
		cx = W - R / 3;
		cy = cyBase - lift;
	}

	if (W >= 760) {
		const reserve = W <= 1200 ? Math.min(470, W * 0.44) : Math.min(360, W * 0.36);
		const rHero = poleX - reserve;
		if (R > rHero) {
			R = Math.max(rHero, 120);
			cx = poleX;
			cy = poleY + R * cosT;
		}
	}

	const k = scrollK;
	const heroCx = cx, heroCy = cy, heroR = R;
	let sideR: number, sideCx: number, sideCy: number;
	if (W < 760) {
		sideR = Math.min(W * 0.55, H * 0.26, 280);
		sideCx = W / 2;
		sideCy = H * 0.30;
	} else {
		sideR = Math.min(H * 0.42, 325);
		const sideRClipped = sideR * 2 / 3;
		sideCx = sideRClipped;
		sideCy = H / 2;
	}
	const MID_R = Math.max(heroR, sideR, Math.min(W, H) * 0.36);
	const midCx = W / 2, midCy = H * (W < 760 ? 0.40 : 0.5);
	const leg1 = sstep(0, 0.42, k);
	const leg2 = sstep(0.62, 1, k);
	cx = heroCx + (midCx - heroCx) * leg1 + (sideCx - midCx) * leg2;
	cy = heroCy + (midCy - heroCy) * leg1 + (sideCy - midCy) * leg2;
	R = heroR + (MID_R - heroR) * leg1 + (sideR - MID_R) * leg2;
	const edgeL = Math.round(sideCx - sideR);
	const edgeR = Math.round(sideCx + sideR);
	const root = document.documentElement.style;
	root.setProperty("--globe-edge", `${edgeR}px`);
	root.setProperty("--globe-left", `${edgeL}px`);
}

function proj(lat: number, lon: number, cosY: number, sinY: number, cosT: number, sinT: number) {
	const x = Math.cos(lat) * Math.sin(lon);
	const y = Math.sin(lat);
	const z = Math.cos(lat) * Math.cos(lon);
	const x1 = x * cosY - z * sinY;
	const z1 = x * sinY + z * cosY;
	const y2 = y * cosT - z1 * sinT;
	const z2 = y * sinT + z1 * cosT;
	return { sx: cx + x1 * R, sy: cy - y2 * R, front: z2 > 0 };
}

function traceLine(
	fixed: number,
	isLat: boolean,
	cosY: number, sinY: number, cosT: number, sinT: number,
	yawNow: number,
	path: Path2D,
	reveal = 1,
) {
	const N = 128;
	let px = 0, py = 0, started = false;
	for (let i = 0; i <= N; i++) {
		let lat: number, lon: number;
		if (isLat) {
			lon = -yawNow - Math.PI / 2 + (i / N) * Math.PI * 2;
			lat = fixed;
		} else {
			const f = i / N;
			lat = Math.PI / 2 - f * Math.PI;
			lon = fixed;
		}
		const prog = i / N;
		if (prog > reveal) break;
		const p = proj(lat, lon, cosY, sinY, cosT, sinT);
		if (!started) {
			px = p.sx; py = p.sy;
			started = true;
			continue;
		}
		const jx = p.sx - px, jy = p.sy - py;
		if (jx * jx + jy * jy > R * R) {
			px = p.sx; py = p.sy;
			continue;
		}
		if (p.front) {
			path.moveTo(px, py);
			path.lineTo(p.sx, p.sy);
		}
		px = p.sx; py = p.sy;
	}
}

function tracePoly(
	ring: Array<[number, number]>,
	cosY: number, sinY: number, cosT: number, sinT: number,
	path: Path2D,
	reveal = 1,
) {
	let top = -Infinity;
	for (const [, latDeg] of ring) {
		if (latDeg > top) top = latDeg;
	}
	const waterline = 90 - reveal * 125;
	if (top < waterline) return;
	let px = 0, py = 0, started = false;
	for (const [lonDeg, latDeg] of ring) {
		if (latDeg < waterline - 8) {
			started = false;
			continue;
		}
		const p = proj(latDeg * D2R, lonDeg * D2R, cosY, sinY, cosT, sinT);
		if (!started) {
			px = p.sx; py = p.sy;
			started = true;
			continue;
		}
		const dx = p.sx - px, dy = p.sy - py;
		if (dx * dx + dy * dy > R * R) {
			px = p.sx; py = p.sy;
			continue;
		}
		if (p.front) {
			path.moveTo(px, py);
			path.lineTo(p.sx, p.sy);
		}
		px = p.sx; py = p.sy;
	}
}

function easeOutExpo(x: number): number {
	return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function draw(t: number) {
	ctx.clearRect(0, 0, W, H);
	const gt = Math.min(1, t / GLOBE_END);
	const ge = easeOutExpo(gt);
	const rNow = R * (0.82 + 0.18 * ge);
	const cyNow = cy + (1 - ge) * H * 0.12;
	
	const holdBias = sstep(0, 0.42, scrollK) * (1 - sstep(0.62, 1, scrollK));
	const cruiseYaw = yaw - (1 - ge) * YAW_SWEEP;
	const faceBias = angDiff(cruiseYaw, yawFacing(youHub.lon)) * holdBias;
	const yawNow = holdBias > 0.999 ? yawFacing(youHub.lon) : cruiseYaw + faceBias;
	const globeAlpha = Math.min(1, t / 0.6);
	const cosY = Math.cos(yawNow), sinY = Math.sin(yawNow);
	const cosT = Math.cos(TILT), sinT = Math.sin(TILT);

	const savedCx = cx, savedCy = cy, savedR = R;
	const effR = scrollK > 0.001 ? Math.max(rNow, R) : rNow;
	cx = savedCx; cy = cyNow; R = effR;

	const grat = new Path2D();
	const landPath = new Path2D();

	for (const lat of LATS) {
		const poleFirst = (90 - Math.abs(lat)) / 90;
		const start = 0.25 + (1 - poleFirst) * 0.4;
		const local = Math.min(1, Math.max(0, (gt - start) / (1 - start)));
		traceLine(lat * D2R, true, cosY, sinY, cosT, sinT, yawNow, grat, easeOutExpo(local));
	}
	for (const lon of LONS) {
		const local = Math.min(1, Math.max(0, gt / 0.75));
		traceLine(lon * D2R, false, cosY, sinY, cosT, sinT, yawNow, grat, easeOutExpo(local));
	}

	if (landReady) {
		const landE = easeOutExpo(Math.min(1, Math.max(0, (gt - 0.12) / 0.88)));
		for (const ring of land) {
			tracePoly(ring, cosY, sinY, cosT, sinT, landPath, landE);
		}
	}

	ctx.globalAlpha = globeAlpha;
	ctx.lineWidth = 1;
	ctx.strokeStyle = FRONT;
	ctx.stroke(grat);
	ctx.strokeStyle = LAND_FRONT;
	ctx.stroke(landPath);

	ctx.beginPath();
	ctx.arc(cx, cy, rNow, 0, Math.PI * 2);
	ctx.strokeStyle = FRONT;
	ctx.stroke();

	const me = easeOutExpo(Math.min(1, Math.max(0, (t - GLOBE_END) / (MESH_END - GLOBE_END))));
	const alpha = Math.min(1, t / 0.9) * (0.25 + 0.75 * me);
	const meshOn = Math.min(1, Math.max(0, (t - GLOBE_END) / (MESH_END - GLOBE_END))) * me;

const dotR = Math.max(2, rNow * 0.008);
nodePts.length = 0;
const seenKeys = new Set<string>();
for (const hub of HUBS) {
	const key = hubKey(hub);
	if (seenKeys.has(key)) continue;
	seenKeys.add(key);
	const p = proj(hub.lat * D2R, hub.lon * D2R, cosY, sinY, cosT, sinT);
	const col = hub.kind === "you" ? YOU : hub.kind === "cloud" ? CLOUD : PEER;
	if (!p.front) {
		nodePts.push({ hub, x: p.sx, y: p.sy, r: dotR, alpha: 0, col, front: false });
		continue;
	}
	const dx = (p.sx - cx) / rNow, dy = (p.sy - cy) / rNow;
	const depth = Math.max(0, 1 - dx * dx - dy * dy);
	const a = Math.min(1, meshOn * (0.25 + 0.75 * depth));
	if (a <= 0.01) continue;
	nodePts.push({ hub, x: p.sx, y: p.sy, r: dotR, alpha: a, col, front: true });
}
ctx.globalAlpha = 1;

	const scored: Array<{ a: number; b: number; lat: number; tr: number }> = [];
	for (let i = 0; i < nodePts.length; i++) {
		for (let j = i + 1; j < nodePts.length; j++) {
			const aN = nodePts[i], bN = nodePts[j];
			const lat = linkLat(aN.hub, bN.hub);
			const tr = traffic.get(linkKey(aN.hub, bN.hub)) ?? 0;
			scored.push({ a: i, b: j, lat, tr });
		}
	}
	const farLinks: typeof scored = [];
	const nearLinks: typeof scored = [];
	for (const e of scored) {
		(nodePts[e.a].front && nodePts[e.b].front ? nearLinks : farLinks).push(e);
	}

	const settleK = sstep(0.62, 1, scrollK);
	const userNodeNames = new Set<string>(["you", ...userNodes.map((n) => hubKey(n))]);
	const nodeGate = (hub: Hub) => {
		if (hub.kind === "you") return 1;
		if (userNodeNames.has(hubKey(hub))) {
			return outageActive && outageNodes.has(hubKey(hub)) ? 0 : 1;
		}
		return 1 - settleK;
	};
	const nodeVisible = (hub: Hub) => nodeGate(hub) > 0.01;
	const gateMul = (e: { a: number; b: number }) =>
		nodeGate(nodePts[e.a].hub) * nodeGate(nodePts[e.b].hub);

	ctx.strokeStyle = "rgba(212, 88, 157, 1)";
	ctx.lineWidth = 0.7;
	for (const e of farLinks) {
		const g = gateMul(e);
		if (g <= 0.01) continue;
		ctx.globalAlpha = meshOn * g * 0.10 * Math.min(0.5, Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.5);
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}

	const nearScored = nearLinks.filter((e) => gateMul(e) > 0.01);
	const byLat = nearScored.slice().sort((x, y) => x.lat - y.lat);
	const KEEP = Math.min(byLat.length, Math.max(8, nodePts.length));
	const perNode = new Map<number, number>();
	const fastIdx: typeof byLat = [];
	for (const e of byLat) {
		if (fastIdx.length >= KEEP) break;
		const ca = perNode.get(e.a) ?? 0, cb = perNode.get(e.b) ?? 0;
		if (ca >= 3 || cb >= 3) continue;
		perNode.set(e.a, ca + 1);
		perNode.set(e.b, cb + 1);
		fastIdx.push(e);
	}
	const fast = new Set(fastIdx.map((e) => linkKey(nodePts[e.a].hub, nodePts[e.b].hub)));
	ctx.strokeStyle = "rgba(241, 234, 244, 1)";
	ctx.lineWidth = 1.6;
	for (const e of fastIdx) {
		const g = gateMul(e);
		ctx.globalAlpha = Math.min(1, meshOn * g * 1.0 * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.08 * meshOn * g);
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}

	const BUSY = 0.72;

	const busy = nearScored.filter(
	(e) => e.tr >= BUSY && !fast.has(linkKey(nodePts[e.a].hub, nodePts[e.b].hub)),
);
	const youKey = (e: (typeof scored)[number]) =>
		nodePts[e.a].hub.kind === "you" || nodePts[e.b].hub.kind === "you";
	ctx.lineWidth = 1.8;
	for (const e of busy) {
		const you = youKey(e);
		const bothFront = nodePts[e.a].front && nodePts[e.b].front;
		const g = gateMul(e);
		ctx.globalAlpha = Math.min(1, meshOn * g * (you ? 0.6 : 0.95) * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.05 * meshOn * g);
		ctx.strokeStyle = you
			? bothFront ? "rgba(43, 133, 108, 1)" : "rgba(43, 133, 108, 0.45)"
			: "rgba(212, 88, 157, 1)";
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}
	ctx.lineWidth = 1.6;
	for (const e of fastIdx) {
		if (!youKey(e)) continue;
		const bothFront = nodePts[e.a].front && nodePts[e.b].front;
		const g = gateMul(e);
		ctx.globalAlpha = Math.min(1, meshOn * g * (bothFront ? 1.0 : 0.45) * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.05 * meshOn * g);
		ctx.strokeStyle = bothFront ? "rgba(43, 133, 108, 1)" : "rgba(43, 133, 108, 0.45)";
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;

	const tickSpin = t * 0.9;
	for (const n of nodePts) {
		const g = n.hub.kind === "you" ? 1 : nodeGate(n.hub);
		if (!n.front || meshOn <= 0.01 || g <= 0.01) continue;
		const a = Math.max(n.alpha, n.hub.kind === "you" ? 1 : 0) * g;
		const ncol = n.hub.kind === "you" ? YOU : n.hub.kind === "peer" ? "#f1eaf4" : n.col;
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.arc(n.x, n.y, Math.max(1.4, n.r * 0.55), 0, Math.PI * 2);
		ctx.fillStyle = ncol;
		ctx.fill();
		const hh = [...hubKey(n.hub)].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) >>> 0;
		const phase = (hh % 628) / 100 + tickSpin * (n.hub.kind === "you" ? 1.6 : 1);
		const tr = n.r * 2.1;
		ctx.globalAlpha = a * 0.95;
		ctx.strokeStyle = ncol;
		ctx.lineWidth = Math.max(1.2, n.r * 0.32);
		ctx.lineCap = "butt";
		ctx.beginPath();
		ctx.arc(n.x, n.y, tr, phase, phase + 1.15);
		ctx.stroke();
		ctx.globalAlpha = a * 0.45;
		ctx.beginPath();
		ctx.arc(n.x, n.y, tr, phase + Math.PI, phase + Math.PI + 0.5);
		ctx.stroke();
		if (pingKey !== null && hubKey(n.hub) === pingKey && pingT0 > 0) {
			const age = (t - pingT0) / 0.9;
			if (age >= 0 && age <= 1) {
				ctx.globalAlpha = (1 - age) * 0.9 * g;
				ctx.strokeStyle = ncol;
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r * (2.6 + age * 1.4), 0, Math.PI * 2);
				ctx.stroke();
			}
		}
	}
	const youCand = nodePts.find((n) => n.hub.kind === "you" && n.front);
	if (youCand) {
		const pulse = sstep(0, 0.42, scrollK) * (1 - sstep(0.62, 1, scrollK));
		if (pulse > 0.01 && meshOn > 0.01) {
			const rr = youCand.r * (3.2 + (1 - pulse) * 2.0);
			ctx.globalAlpha = pulse * 0.9;
			ctx.strokeStyle = YOU;
			ctx.lineWidth = 1.3;
			ctx.beginPath();
			ctx.arc(youCand.x, youCand.y, rr, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = pulse * 0.45;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(youCand.x, youCand.y, rr * 0.72, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;

	if (t - lastPingT >= 0.5 || lastPingT < 0) {
		lastPingT = t;
		tickPings();
	}
	for (const n of nodePts) {
		const h = sparkFor(n.hub);
		const ms = h[h.length - 1];
		n.col = n.hub.kind === "you" ? YOU : pinkShade(n.hub.kind === "cloud" ? ms * 0.7 : ms);
	}
	ctx.textBaseline = "middle";
	const fs = Math.max(8, Math.min(13, Math.min(W, H) * 0.016));
	const frontOnly = nodePts
		.filter((n) => n.front && n.alpha * nodeGate(n.hub) > 0.01)
		.sort((a, b) => b.r * b.alpha - a.r * a.alpha);
	const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
	for (const n of frontOnly) {
		const isYou = n.hub.kind === "you";
		const lfs = isYou ? fs + 3 : fs;
		ctx.font = `${lfs}px "Space Grotesk", "M PLUS Rounded 1c", sans-serif`;
		const nKey = hubKey(n.hub);
		const label = isYou ? `you ${n.hub.city}` : n.hub.name;
		const w = ctx.measureText(label).width;
		const sw = Math.max(28, w);
		const lh = lfs + 14;
		const hb = [...nKey].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
		const rot = (hb >>> 3) % 4;
		const order = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (k + rot * 2) % 8);
		const slotPos = (q: number): { x: number; y: number } => {
			const side = q % 4;
			const far = q >= 4;
			const dy = far ? (side <= 1 ? (side === 0 ? -(lh + 4) : lh + 4) : 0) : 0;
			const dx = far && side <= 1 ? 0 : 0;
			if (side === 0) return { x: n.x + n.r + 5 + dx, y: n.y + dy };
			if (side === 1) return { x: n.x - n.r - 5 - w + dx, y: n.y + dy };
			if (side === 2) return { x: n.x - w / 2, y: n.y - n.r - 9 + (far ? -(lh + 4) : 0) };
			return { x: n.x - w / 2, y: n.y + n.r + 9 + (far ? lh + 4 : 0) };
		};
		const overlaps = (x: number, y: number): boolean => {
			for (const p of placed) {
				const ox = Math.max(0, Math.min(x + w + 10, p.x + p.w + 4) - Math.max(x - 10, p.x - 4));
				const oy = Math.max(0, Math.min(y + lh / 2 + 2, p.y + p.h / 2 + 2) - Math.max(y - lh / 2 - 2, p.y - p.h / 2 - 2));
				if (ox * oy > 0) return true;
			}
			for (const m of frontOnly) {
				if (m === n) continue;
				const nx0 = x - 4, nx1 = x + w + 4;
				const ny0 = y - lh / 2 - 2, ny1 = y + lh / 2 + 2;
				const cdx = Math.max(nx0 - m.x, 0, m.x - nx1);
				const cdy = Math.max(ny0 - m.y, 0, m.y - ny1);
				if (cdx * cdx + cdy * cdy < (m.r + 2) * (m.r + 2)) return true;
			}
			const dxl = (x + w / 2 - cx) / rNow;
			const dyl = (y - cy) / rNow;
			return dxl * dxl + dyl * dyl > 0.94;
		};
		const kept = winQuad.get(nKey);
		let qi = kept ?? order[0];
		if (kept === undefined || overlaps(slotPos(kept).x, slotPos(kept).y)) {
			qi = order[0];
			for (const q of order) {
				const s = slotPos(q);
				if (!overlaps(s.x, s.y)) {
					qi = q;
					break;
				}
			}
			winQuad.set(nKey, qi);
		}
		const raw = slotPos(qi);
		const prev = labelSm.get(nKey);
		const k = 0.22;
		const nx = prev === undefined ? raw.x : prev.x + (raw.x - prev.x) * k;
		const ny = prev === undefined ? raw.y : prev.y + (raw.y - prev.y) * k;
		labelSm.set(nKey, { x: nx, y: ny });
		placed.push({ x: nx, y: ny, w, h: lh });
		const la = Math.min(1, n.alpha + 0.15) * meshOn * (isYou ? 1 : nodeGate(n.hub));
		const lcol = n.hub.kind === "you" ? YOU : statusColor(sparkFor(n.hub).slice(-1)[0], n.hub.kind);
		ctx.globalAlpha = la;
		ctx.strokeStyle = lcol;
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		const stub = n.r + 2;
		const anchorX = nx + (nx + w / 2 < n.x ? w : 0);
		const elbowX = n.x + Math.sign(anchorX - n.x || 1) * stub * 3;
		ctx.moveTo(n.x + Math.sign(elbowX - n.x || 1) * stub, n.y);
		ctx.lineTo(elbowX, ny);
		ctx.lineTo(anchorX, ny);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.globalAlpha = la * 0.82;
		ctx.fillStyle = "rgba(22, 14, 44, 0.85)";
		const padX = 4, swH = lh;
		ctx.fillRect(nx - padX, ny - swH / 2, w + padX * 2, swH);
		const hist = sparkFor(n.hub);
		const msNow = hist[hist.length - 1];
		if (hist.length > 1) {
			const max = Math.max(...hist) * 1.15 || 1;
			ctx.globalAlpha = la;
			ctx.strokeStyle = statusColor(msNow, n.hub.kind);
			ctx.lineWidth = 2;
			ctx.beginPath();
			const lineW = sw * 0.62;
			hist.forEach((v, i) => {
				const x = nx + (i / (hist.length - 1)) * lineW;
				const y = ny + lfs / 2 + 5 - (v / max) * 8;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			});
			ctx.stroke();
		}

		ctx.globalAlpha = la;
		ctx.fillStyle = statusColor(msNow, n.hub.kind);
		ctx.font = `${Math.max(7, lfs - 2)}px "Space Grotesk", "M PLUS Rounded 1c", sans-serif`;
		ctx.fillText(`${msNow.toFixed(0)}ms`, nx + sw * 0.62 + 5, ny + lfs / 2 + 1);
		ctx.globalAlpha = la;
		ctx.fillStyle = "#f1eaf4";
		ctx.font = `${lfs}px "Space Grotesk", "M PLUS Rounded 1c", sans-serif`;
		ctx.fillText(label, nx, ny - 5);
	}
	ctx.globalAlpha = 1;
	cx = savedCx; cy = savedCy; R = savedR;
}

let last = performance.now() / 1000;
function frame() {
	if (!running) return;
	const now = performance.now() / 1000;
	const dt = Math.min(0.05, now - last);
	last = now;
	yaw += dt * SPEED;
	const before = scrollK;
	scrollK += (scrollTarget - scrollK) * 0.14;
	if (Math.abs(scrollTarget - scrollK) < 0.001) scrollK = scrollTarget;
	if (scrollK !== before) layout();
	const settled = scrollK > 0.9;
	if (settled && !settledFired) {
		settledFired = true;
		window.dispatchEvent(new Event("iroha:globe-settled"));
	} else if (!settled) {
		settledFired = false;
	}
	draw(now - t0);
	requestAnimationFrame(frame);
}

let dataBase = "/";
function dataUrl(p: string): string {
	return `${dataBase}${p}`.replace(/([^:])\/+/g, "$1/");
}

export interface GlobeAPI {
	addNode(id: string, label: string, lat: number, lon: number): void;
	removeNode(id: string): void;
	simulateOutage(active: boolean): void;
	getProgress(): number;
	getLatency(key: string): number | null;
	getHistory(key: string): number[] | null;
	pingNode(key: string | null): void;
	nodeAt(px: number, py: number): { key: string; label: string; lat: number; lon: number } | null;
}

export function startGlobe(base: string): GlobeAPI {
	dataBase = base.endsWith("/") ? base : `${base}/`;

	const heroEl = document.getElementById("hero");
	const stageEl = document.getElementById("stage");
	window.addEventListener("scroll", () => {
		if (!stageEl) return;
		const holdEl = document.getElementById("planner");
		const dwell = holdEl ? Math.max(0, holdEl.offsetHeight - window.innerHeight) : 0;
		const max = Math.max(1, stageEl.offsetHeight - window.innerHeight + dwell);
		scrollTarget = Math.min(Math.max(window.scrollY, 0), max) / max;
	}, { passive: true });

	const seeded = currentScrollTarget();
	if (seeded !== null) {
		scrollK = seeded;
		scrollTarget = seeded;
	}

	const holdPeer = document.getElementById("planner");
	const visState = { hero: true, stage: false, hold: false };
	const kickLoop = () => {
		if (reduceMotion.matches) return;
		const vis = visState.hero || visState.stage || visState.hold;
		if (vis && !running) {
			running = true;
			last = performance.now() / 1000;
			requestAnimationFrame(frame);
		} else if (!vis) {
			running = false;
		}
	};
	new IntersectionObserver((entries) => {
		visState.hero = entries[0].isIntersecting;
		kickLoop();
	}).observe(heroEl ?? stage);
	if (stageEl) {
		new IntersectionObserver((entries) => {
			visState.stage = entries[0].isIntersecting;
			kickLoop();
		}, { threshold: 0.01 }).observe(stageEl);
	} else {
		visState.stage = true;
	}
	if (holdPeer) {
		new IntersectionObserver((entries) => {
			visState.hold = entries[0].isIntersecting;
			kickLoop();
		}, { threshold: 0.01 }).observe(holdPeer);
	} else {
		visState.hold = true;
	}

	document.addEventListener("visibilitychange", () => {
		if (reduceMotion.matches) return;
		if (!document.hidden && !running) {
			running = true;
			last = performance.now() / 1000;
			requestAnimationFrame(frame);
		} else if (document.hidden) {
			running = false;
		}
	});

	new ResizeObserver(() => {
		layout();
		draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
	}).observe(document.body);

	function drawStatic() {
		draw(30);
	}

	layout();
	loadLand();
	placeYou();

	if (document.fonts?.ready) {
		document.fonts.ready.then(() => {
			layout();
			draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
		});
	}
	if (reduceMotion.matches) {
		drawStatic();
	} else {
		draw(0);
		frame();
	}

	return {
		addNode(id: string, label: string, lat: number, lon: number) {
			if (HUBS.some((h) => hubKey(h) === id)) return;
			const hub: Hub = { id, name: label, city: label, lat, lon, kind: "peer" };
			HUBS.push(hub);
			userNodes.push(hub);
			sparkFor(hub);
			tickPings();
			draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
		},

		removeNode(id: string) {
			const idx = HUBS.findIndex((h) => hubKey(h) === id);
			if (idx >= 0) HUBS.splice(idx, 1);
			const uidx = userNodes.findIndex((h) => hubKey(h) === id);
			if (uidx >= 0) userNodes.splice(uidx, 1);
			outageNodes.delete(id);
			draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
		},

		simulateOutage(active: boolean) {
			outageActive = active;
			outageNodes.clear();
			if (active) {
				const candidates = HUBS.filter((h) => h.kind !== "you");
				const count = Math.min(candidates.length, 2 + Math.floor(Math.random() * 2));
				const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
				for (let i = 0; i < count; i++) outageNodes.add(hubKey(shuffled[i]));
			}
			draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
		},

		getProgress() {
			return scrollK;
		},

		getLatency(key: string) {
			const h = pingBase.get(key);
			return h ? h[h.length - 1] : null;
		},

		getHistory(key: string) {
			const h = pingBase.get(key);
			return h ? [...h] : null;
		},

		pingNode(key: string | null) {
			pingKey = key;
			pingT0 = key === null ? 0 : performance.now() / 1000 - t0;
		},

		nodeAt(px: number, py: number) {
			const sk = sstep(0.62, 1, scrollK);
			const names = new Set<string>(["you", ...userNodes.map((n) => hubKey(n))]);
			const gate = (hub: Hub) => {
				if (hub.kind === "you") return 1;
				if (names.has(hubKey(hub))) {
					return outageActive && outageNodes.has(hubKey(hub)) ? 0 : 1;
				}
				return 1 - sk;
			};
			let best: { key: string; label: string; lat: number; lon: number; d: number } | null = null;
			for (const n of nodePts) {
				if (!n.front || n.alpha * gate(n.hub) <= 0.05) continue;
				const d = Math.hypot(n.x - px, n.y - py);
				const hitR = Math.max(12, n.r + 8);
				if (d <= hitR && (!best || d < best.d)) {
					best = {
						key: hubKey(n.hub),
						label: n.hub.kind === "you" ? `you ${n.hub.city}` : n.hub.name,
						lat: n.hub.lat,
						lon: n.hub.lon,
						d,
					};
				}
			}
			return best ? { key: best.key, label: best.label, lat: best.lat, lon: best.lon } : null;
		},
	};
}
		
