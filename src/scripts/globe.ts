const stage = document.getElementById("stage") as HTMLElement;
const canvas = document.getElementById("globe") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const D2R = Math.PI / 180;
const TILT = 0.38; // tilt the globe so we look slightly from above
const SPEED = 0.07; // steady spin speed
const FRONT = "rgba(241, 234, 244, 0.6)";
const LAND_FRONT = "rgba(254, 234, 228, 0.75)";
const CLOUD = "#d4589d";
const PEER = "#f1eaf4";
const YOU = "#2b856c";

// intro timeline (seconds): globe draws first, then nodes/mesh fade in

const GLOBE_END = 1.6;
const MESH_END = 2.6;

// latitude/longitude lines
const LATS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
const LONS = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];

let W = 0, H = 0;
let cx = 0, cy = 0, R = 200;

const YAW_OPEN = -0.5; // open facing Europe/Africa
const YAW_SWEEP = 1.1; // spin by 1.1 radians
let yaw = YAW_OPEN + YAW_SWEEP;
let running = true;
const t0 = performance.now() / 1000;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const nodePts: Array<{ hub: Hub; x: number; y: number; r: number; alpha: number; col: string; front: boolean }> = [];
const winQuad = new Map<string, number>();
const labelSm = new Map<string, { x: number; y: number }>();

// illustration purposes (cloud regions + random VPS locations)

type Kind = "cloud" | "peer" | "you";
interface Hub { name: string; city: string; lat: number; lon: number; kind: Kind }
const HUBS: Hub[] = [
	// major cloud regions
	{ name: "aws us-east-1", city: "N. Virginia", lat: 38.9072, lon: -77.0369, kind: "cloud" },
	{ name: "aws us-west-2", city: "Oregon", lat: 45.5152, lon: -122.6784, kind: "cloud" },
	{ name: "aws eu-central-1", city: "Frankfurt", lat: 50.1109, lon: 8.6821, kind: "cloud" },
	{ name: "aws ap-northeast-1", city: "Tokyo", lat: 35.6762, lon: 139.6503, kind: "cloud" },
	{ name: "azure eastus", city: "Virginia", lat: 37.4316, lon: -78.6569, kind: "cloud" },
	{ name: "azure westeurope", city: "Amsterdam", lat: 52.3676, lon: 4.9041, kind: "cloud" },
	{ name: "azure southeastasia", city: "Singapore", lat: 1.3521, lon: 103.8198, kind: "cloud" },
	{ name: "azure australiaeast", city: "Sydney", lat: -33.8688, lon: 151.2093, kind: "cloud" },
];

// 50-city pool
const PEER_POOL: Array<{ name: string; city: string; lat: number; lon: number }> = [				{ name: "vps guangzhou", city: "Guangzhou", lat: 23.1291, lon: 113.2644 },
	{ name: "vps ontario", city: "Toronto", lat: 43.6532, lon: -79.3832 },
	{ name: "vps mexico-city", city: "Mexico City", lat: 19.4326, lon: -99.1332 },
	{ name: "vps sydney", city: "Sydney", lat: -33.8688, lon: 151.2093 },
	{ name: "vps osaka", city: "Osaka (residential)", lat: 34.6937, lon: 135.5023 },
	{ name: "vps sao-paulo", city: "São Paulo", lat: -23.5558, lon: -46.6396 },
	{ name: "vps cape-town", city: "Cape Town", lat: -33.9249, lon: 18.4241 },
	{ name: "vps seoul", city: "Seoul", lat: 37.5665, lon: 126.978 },
	{ name: "vps mumbai", city: "Mumbai", lat: 19.076, lon: 72.8777 },
	{ name: "vps jakarta", city: "Jakarta", lat: -6.2088, lon: 106.8456 },
	{ name: "vps manila", city: "Manila", lat: 14.5995, lon: 120.9842 },
	{ name: "vps bangkok", city: "Bangkok", lat: 13.7563, lon: 100.5018 },
	{ name: "vps hanoi", city: "Hanoi", lat: 21.0278, lon: 105.8342 },
	{ name: "vps taipei", city: "Taipei", lat: 25.033, lon: 121.5654 },
	{ name: "vps hong-kong", city: "Hong Kong", lat: 22.3193, lon: 114.1694 },
	{ name: "vps shanghai", city: "Shanghai", lat: 31.2304, lon: 121.4737 },
	{ name: "vps beijing", city: "Beijing", lat: 39.9042, lon: 116.4074 },
	{ name: "vps delhi", city: "Delhi", lat: 28.6139, lon: 77.209 },
	{ name: "vps dubai", city: "Dubai", lat: 25.2048, lon: 55.2708 },
	{ name: "vps riyadh", city: "Riyadh", lat: 24.7136, lon: 46.6753 },
	{ name: "vps istanbul", city: "Istanbul", lat: 41.0082, lon: 28.9784 },
	{ name: "vps moscow", city: "Moscow", lat: 55.7558, lon: 37.6173 },
	{ name: "vps berlin", city: "Berlin", lat: 52.52, lon: 13.405 },
	{ name: "vps paris", city: "Paris", lat: 48.8566, lon: 2.3522 },
	{ name: "vps madrid", city: "Madrid", lat: 40.4168, lon: -3.7038 },
	{ name: "vps milan", city: "Milan", lat: 45.4642, lon: 9.19 },
	{ name: "vps zurich", city: "Zurich", lat: 47.3769, lon: 8.5417 },
	{ name: "vps stockholm", city: "Stockholm", lat: 59.3293, lon: 18.0686 },
	{ name: "vps oslo", city: "Oslo", lat: 59.9139, lon: 10.7522 },
	{ name: "vps nairobi", city: "Nairobi", lat: -1.2921, lon: 36.8219 },
	{ name: "vps lagos", city: "Lagos", lat: 6.5244, lon: 3.3792 },
	{ name: "vps cairo", city: "Cairo", lat: 30.0444, lon: 31.2357 },
	{ name: "vps johannesburg", city: "Johannesburg", lat: -26.2041, lon: 28.0473 },
	{ name: "vps buenos-aires", city: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
	{ name: "vps santiago", city: "Santiago", lat: -33.4489, lon: -70.6693 },
	{ name: "vps lima", city: "Lima", lat: -12.0464, lon: -77.0428 },
	{ name: "vps bogota", city: "Bogotá", lat: 4.711, lon: -74.0721 },
	{ name: "vps new-york", city: "New York", lat: 40.7128, lon: -74.006 },
	{ name: "vps chicago", city: "Chicago", lat: 41.8781, lon: -87.6298 },
	{ name: "vps dallas", city: "Dallas", lat: 32.7767, lon: -96.797 },
	{ name: "vps seattle", city: "Seattle", lat: 47.6062, lon: -122.3321 },
	{ name: "vps vancouver", city: "Vancouver", lat: 49.2827, lon: -123.1207 },
	{ name: "vps montreal", city: "Montreal", lat: 45.5019, lon: -73.5674 },
	{ name: "vps auckland", city: "Auckland", lat: -36.8485, lon: 174.7633 },
	{ name: "vps perth", city: "Perth", lat: -31.9505, lon: 115.8605 },
	{ name: "vps melbourne", city: "Melbourne", lat: -37.8136, lon: 144.9631 },
	{ name: "vps brisbane", city: "Brisbane", lat: -27.4698, lon: 153.0251 },
	{ name: "vps honolulu", city: "Honolulu", lat: 21.3099, lon: -157.8581 },
	{ name: "vps reykjavik", city: "Reykjavik", lat: 64.1466, lon: -21.9426 },
	{ name: "vps lisbon", city: "Lisbon", lat: 38.7223, lon: -9.1393 },
];

function mulberry32(seed: number) {
	return function () {
		seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// fake latency for each node
const pingBase = new Map<string, number[]>();

const pingMean = new Map<string, number>();
function sparkFor(hub: Hub): number[] {
	let h = pingBase.get(hub.name);
	if (!h) {
		const r = mulberry32(
			[...hub.name].reduce((a, c) => a + c.charCodeAt(0) * 31, 7),
		);
		const base = hub.kind === "cloud" ? 14 + r() * 22 : hub.kind === "you" ? 8 + r() * 10 : 30 + r() * 70;
		pingMean.set(hub.name, base);
		h = Array.from({ length: 20 }, () => base + (r() - 0.5) * base * 0.5);
		pingBase.set(hub.name, h);
	}
	return h;
}

let liveTick = 0;
let lastPingT = -1;
// fake per-node-link traffic
const traffic = new Map<string, number>();
function linkKey(a: Hub, b: Hub): string {
	return a.name < b.name ? `${a.name}|${b.name}` : `${b.name}|${a.name}`;
}
function tickPings() {
	liveTick++;
	for (const [name, h] of pingBase) {
		const lastV = h[h.length - 1];
		const mean = pingMean.get(name) ?? lastV;
		// drift towards baseline to avoid only climbing latency
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

// latency line colour by delay, green <40ms, amber <90ms, pink >90ms
function statusColor(ms: number, kind: Kind): string {
	if (kind === "you") return YOU;
	if (ms < 40) return "#2b856c";
	if (ms < 90) return "#d8a93b";
	return "#d4589d";
}

// colour dot by latency, light pink - fast | dark - slow
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

// link latency = endpoint latency + distance between endpoints
function linkLat(a: Hub, b: Hub): number {
	const ha = sparkFor(a), hb = sparkFor(b);
	return (ha[ha.length - 1] + hb[hb.length - 1]) / 2 + geoDist(a, b) * 30;
}

// pick 5–10 random VPS locations spread out across latitudes
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

// user node location based on response headers
// best alternative when you don't want to take people's IP ig.

const youHub: Hub = { name: "you", city: "", lat: 0, lon: -150, kind: "you" };

// use airport code to get nearest pin
const POP_PIN: Record<string, string> = {
	SYD: "vps sydney", MEL: "vps melbourne", BNE: "vps brisbane", PER: "vps perth",
	AKL: "vps auckland", SIN: "azure southeastasia", HKG: "vps hong-kong",
	NRT: "aws ap-northeast-1", HND: "aws ap-northeast-1", KIX: "vps osaka",
	ICN: "vps seoul", TPE: "vps taipei", MNL: "vps manila", BKK: "vps bangkok",
	SGN: "vps hanoi", JKT: "vps jakarta", BOM: "vps mumbai", DEL: "vps delhi",
	DXB: "vps dubai", DOH: "vps dubai", RUH: "vps riyadh",
	IST: "vps istanbul", DME: "vps moscow", CAI: "vps cairo",
	FRA: "aws eu-central-1", AMS: "azure westeurope", LHR: "azure westeurope",
	CDG: "vps paris", MAD: "vps madrid", MXP: "vps milan", ZRH: "vps zurich",
	ARN: "vps stockholm", OSL: "vps oslo", LIS: "vps lisbon", KEF: "vps reykjavik",
	NBO: "vps nairobi", LOS: "vps lagos", JNB: "vps johannesburg", CPT: "vps cape-town",
	GRU: "vps sao-paulo", EZE: "vps buenos-aires", SCL: "vps santiago",
	LIM: "vps lima", BOG: "vps bogota", MEX: "vps mexico-city",
	JFK: "vps new-york", EWR: "vps new-york", ORD: "vps chicago",
	DFW: "vps dallas", SEA: "vps seattle", YVR: "vps vancouver",
	YYZ: "vps ontario", YUL: "vps montreal", IAD: "aws us-east-1",
	DEN: "aws us-west-2", HNL: "vps honolulu",
};

function setYou(hub: Hub, via: string) {
	youHub.lat = hub.lat;
	youHub.lon = hub.lon;
	youHub.city = `via ${via}`;
	HUBS.push(youHub);
}

// place user location
async function placeYou() {
	// 1) pray that CDN response headers work
	try {
		const res = await fetch(`/data/land-110m.json?edge-probe=${Date.now()}`, { method: "HEAD", cache: "no-store" });
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
		// prayer was not heard
	}
	// 2) fake it and keep praying (snap to lowest-baseline cloud pin)
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
		// prayer was not heard
	}
	// 3) damn man you must have been relayed by that one in the middle of the Pacific Ocean
	youHub.city = "via mid-Pacific relay";
	HUBS.push(youHub);
	draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
}

// country outlines, decoded from TopoJSON file
let land: Array<Array<[number, number]>> = [];
let landReady = false;

async function loadLand() {
	try {
		const res = await fetch("/data/land-110m.json");
		const topo = await res.json();
		const t = topo.transform;
		const sx = t.scale[0], sy = t.scale[1];
		const tx = t.translate[0], ty = t.translate[1];
		// convert arcs to deltas in TopoJSON and traslate to longitude latitude.
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
						// duplicated joint point removed
						for (let i = 0; i < arc.length - 1; i++) pts.push(arc[i]);
					}
					// close the ring
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
		// bro i didn't even pray for this one
	}
}

function layout() {
	const rect = stage.getBoundingClientRect();
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	W = Math.max(1, rect.width);
	H = Math.max(1, rect.height);
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

	// North pole as reference point no matter of R, pole screen pos = cy − R·cos(TILT) so cy = poleY + R·cos(TILT)
	const cosT = Math.cos(TILT);
	
	// Desktop rule: smallest disc that covers the bottom-right corner
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
		: dy0 + dx; // degenerate aspect: generous fallback
	cx = poleX;
	cy = poleY + R * cosT;
	
	// Mobile rule: hero in top half, globe hugs bottom / right
	if (W < 760) {
		const heroEl = document.getElementById("hero");
		const heroLine = heroEl
			? heroEl.getBoundingClientRect().bottom - stage.getBoundingClientRect().top
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

	// Mid widths: shrink the disc a little to not overlap with hero
	if (W >= 760) {
		const reserve = W <= 1200 ? Math.min(470, W * 0.44) : Math.min(360, W * 0.36);
		const rHero = poleX - reserve;
		if (R > rHero) {
			R = Math.max(rHero, 120);
			cx = poleX;
			cy = poleY + R * cosT;
		}
	}
}

// project lat/lon point onto the tilted, spinning globe
function proj(lat: number, lon: number, cosY: number, sinY: number, cosT: number, sinT: number) {
	const x = Math.cos(lat) * Math.sin(lon);
	const y = Math.sin(lat);
	const z = Math.cos(lat) * Math.cos(lon);
	// spin about Y, then tilt about X
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
		// every stroke starts at the pole => globe drawn topdown
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

// trace land
function tracePoly(
	ring: Array<[number, number]>,
	cosY: number, sinY: number, cosT: number, sinT: number,
	path: Path2D,
	reveal = 1,
) {
	// land is slightly behind longitude reveal speed,
	// skip landmasses still below the reveal line
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
		// pen lifting
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
	// animation part 1
	const gt = Math.min(1, t / GLOBE_END);
	const ge = easeOutExpo(gt);
	const rNow = R * (0.82 + 0.18 * ge);
	const cyNow = cy + (1 - ge) * H * 0.12;
	
	// spin easing
	const yawNow = yaw - (1 - ge) * YAW_SWEEP;
	const globeAlpha = Math.min(1, t / 0.6);
	const cosY = Math.cos(yawNow), sinY = Math.sin(yawNow);
	const cosT = Math.cos(TILT), sinT = Math.sin(TILT);

	// draw with the intro-adjusted size/position
	const savedCx = cx, savedCy = cy, savedR = R;
	cx = savedCx; cy = cyNow; R = rNow;

	const grat = new Path2D();
	const landPath = new Path2D();

	// long/lats first, then latitudes pole→equator, land last
	for (const lat of LATS) {
		const poleFirst = (90 - Math.abs(lat)) / 90; // poles => 1
		const start = 0.25 + (1 - poleFirst) * 0.4;
		const local = Math.min(1, Math.max(0, (gt - start) / (1 - start)));
		traceLine(lat * D2R, true, cosY, sinY, cosT, sinT, yawNow, grat, easeOutExpo(local));
	}
	for (const lon of LONS) {
		const local = Math.min(1, Math.max(0, gt / 0.75));
		traceLine(lon * D2R, false, cosY, sinY, cosT, sinT, yawNow, grat, easeOutExpo(local));
	}

	if (landReady) {
		// lag in land animation
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

	// outer rim of the disc
	ctx.beginPath();
	ctx.arc(cx, cy, rNow, 0, Math.PI * 2);
	ctx.strokeStyle = FRONT;
	ctx.stroke();

	// animation part 2
	const me = easeOutExpo(Math.min(1, Math.max(0, (t - GLOBE_END) / (MESH_END - GLOBE_END))));
	const alpha = Math.min(1, t / 0.9) * (0.25 + 0.75 * me);
	const meshOn = Math.min(1, Math.max(0, (t - GLOBE_END) / (MESH_END - GLOBE_END))) * me;

// hubs (nodes)
const dotR = Math.max(2, rNow * 0.008);
nodePts.length = 0;
for (const hub of HUBS) {
	const p = proj(hub.lat * D2R, hub.lon * D2R, cosY, sinY, cosT, sinT);
	const col = hub.kind === "you" ? YOU : hub.kind === "cloud" ? CLOUD : PEER;
	if (!p.front) {
		nodePts.push({ hub, x: p.sx, y: p.sy, r: dotR, alpha: 0, col, front: false });
		continue;
	}
	// fade dots near the edge and more opaque at centre
	const dx = (p.sx - cx) / rNow, dy = (p.sy - cy) / rNow;
	const depth = Math.max(0, 1 - dx * dx - dy * dy);
	const a = Math.min(1, meshOn * (0.25 + 0.75 * depth));
	if (a <= 0.01) continue;
	nodePts.push({ hub, x: p.sx, y: p.sy, r: dotR, alpha: a, col, front: true });
}
ctx.globalAlpha = 1;

	// Mesh link colours (fast -> white, slow -> pink)
	const scored: Array<{ a: number; b: number; lat: number; tr: number }> = [];
	for (let i = 0; i < nodePts.length; i++) {
		for (let j = i + 1; j < nodePts.length; j++) {
			const aN = nodePts[i], bN = nodePts[j];
			const lat = linkLat(aN.hub, bN.hub);
			const tr = traffic.get(linkKey(aN.hub, bN.hub)) ?? 0;
			scored.push({ a: i, b: j, lat, tr });
		}
	}
	// generate far-side links first (dimmed pink behind the planet) so it layers correctly
	const farLinks: typeof scored = [];
	const nearLinks: typeof scored = [];
	for (const e of scored) {
		(nodePts[e.a].front && nodePts[e.b].front ? nearLinks : farLinks).push(e);
	}

	ctx.strokeStyle = "rgba(212, 88, 157, 1)";
	ctx.lineWidth = 0.7;
	for (const e of farLinks) {
		ctx.globalAlpha = meshOn * 0.10 * Math.min(0.5, Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.5);
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}

	// nearlinks
	const nearScored = nearLinks;
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
		ctx.globalAlpha = Math.min(1, meshOn * 1.0 * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.08 * meshOn);
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}

	// "you" links are green
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
		ctx.globalAlpha = Math.min(1, meshOn * (you ? 0.6 : 0.95) * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.05 * meshOn);
		ctx.strokeStyle = you
			? bothFront ? "rgba(43, 133, 108, 1)" : "rgba(43, 133, 108, 0.45)"
			: "rgba(212, 88, 157, 1)";
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}
	// repaint "you" links green over white
	ctx.lineWidth = 1.6;
	for (const e of fastIdx) {
		if (!youKey(e)) continue;
		const bothFront = nodePts[e.a].front && nodePts[e.b].front;
		ctx.globalAlpha = Math.min(1, meshOn * (bothFront ? 1.0 : 0.45) * Math.min(nodePts[e.a].alpha, nodePts[e.b].alpha) + 0.05 * meshOn);
		ctx.strokeStyle = bothFront ? "rgba(43, 133, 108, 1)" : "rgba(43, 133, 108, 0.45)";
		ctx.beginPath();
		ctx.moveTo(nodePts[e.a].x, nodePts[e.a].y);
		ctx.lineTo(nodePts[e.b].x, nodePts[e.b].y);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;

	// draw dots first then the labels to layer correctly
	for (const n of nodePts) {
		if (!n.front || meshOn <= 0.01) continue;
		ctx.globalAlpha = n.alpha;
		ctx.beginPath();
		ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
		ctx.fillStyle = n.hub.kind === "peer" ? "#f1eaf4" : n.col;
		ctx.fill();
	}
	ctx.globalAlpha = 1;

	// label for front sided nodes ONLY
	// keep location right/left/above/below + near/far) unless overlap, then ease toward its slot to avoid glitching
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
	// type scales with viewport like the globe
	const fs = Math.max(8, Math.min(13, Math.min(W, H) * 0.016));
	const frontOnly = nodePts
		.filter((n) => n.front && n.alpha > 0.01)
		.sort((a, b) => b.r * b.alpha - a.r * a.alpha);
	const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
	for (const n of frontOnly) {
		ctx.font = `${fs}px NovaMono, monospace`;
		const label = n.hub.kind === "you" ? `you ${n.hub.city}` : n.hub.name;
		const w = ctx.measureText(label).width;
		const sw = Math.max(28, w);
		const lh = fs + 14;
		// 8 slots per label (4 sides × near/far) to stack clusters
		const hb = [...n.hub.name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
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
		const kept = winQuad.get(n.hub.name);
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
			winQuad.set(n.hub.name, qi);
		}
		const raw = slotPos(qi);
		const prev = labelSm.get(n.hub.name);
		const k = 0.22;
		const nx = prev === undefined ? raw.x : prev.x + (raw.x - prev.x) * k;
		const ny = prev === undefined ? raw.y : prev.y + (raw.y - prev.y) * k;
		labelSm.set(n.hub.name, { x: nx, y: ny });
		placed.push({ x: nx, y: ny, w, h: lh });
		const la = Math.min(1, n.alpha + 0.15) * meshOn;
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
				const y = ny + fs / 2 + 5 - (v / max) * 8;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			});
			ctx.stroke();
		}

		ctx.globalAlpha = la;
		ctx.fillStyle = statusColor(msNow, n.hub.kind);
		ctx.font = `${Math.max(7, fs - 2)}px NovaMono, monospace`;
		ctx.fillText(`${msNow.toFixed(0)}ms`, nx + sw * 0.62 + 5, ny + fs / 2 + 1);
		// you
		ctx.globalAlpha = la;
		ctx.fillStyle = n.hub.kind === "you" ? YOU : "#f1eaf4";
		ctx.font = `${fs}px NovaMono, monospace`;
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
	draw(now - t0);
	requestAnimationFrame(frame);
}

new IntersectionObserver((entries) => {
	const vis = entries[0].isIntersecting;
	if (reduceMotion.matches) return;
	if (vis && !running) {
		running = true;
		last = performance.now() / 1000;
		requestAnimationFrame(frame);
	} else if (!vis) {
		running = false;
	}
}).observe(stage);

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

// redraw after resizing
new ResizeObserver(() => {
	layout();
	draw(reduceMotion.matches ? 30 : performance.now() / 1000 - t0);
}).observe(stage);

function drawStatic() {
	draw(30);
}

// place everything
layout();
loadLand();
placeYou();

// redraw after fonts are ready
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
		
