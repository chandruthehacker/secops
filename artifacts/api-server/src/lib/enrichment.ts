import { db, assetsTable } from "@workspace/db";

let assetCache: Map<string, { criticality: string; tags: string[] }> = new Map();
let assetCacheLoadedAt = 0;
let geoipLite: any = null;
let geoipAvailable = false;

const ASSET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Lazily load geoip-lite without crashing if database is missing
async function getGeoip(): Promise<any> {
  if (geoipLite !== null) return geoipAvailable ? geoipLite : null;
  try {
    geoipLite = (await import("geoip-lite")).default;
    geoipAvailable = true;
  } catch {
    geoipLite = false;
    geoipAvailable = false;
  }
  return geoipAvailable ? geoipLite : null;
}

export async function loadAssetCache(): Promise<void> {
  try {
    const assets = await db.select().from(assetsTable);
    assetCache = new Map();
    for (const asset of assets) {
      const meta = { criticality: asset.criticality ?? "medium", tags: asset.tags ?? [] };
      assetCache.set(asset.hostname.toLowerCase(), meta);
      if (asset.ip) assetCache.set(asset.ip, meta);
    }
    assetCacheLoadedAt = Date.now();
  } catch {
    // silently fail if assets table doesn't exist yet
  }
}

export async function enrichEvent(event: Record<string, any>): Promise<Record<string, any>> {
  // Reload asset cache if stale
  if (Date.now() - assetCacheLoadedAt > ASSET_CACHE_TTL) {
    await loadAssetCache();
  }

  // GeoIP enrichment
  const ipToLookup = event.srcIp;
  if (ipToLookup && !isPrivateIp(ipToLookup)) {
    try {
      const geoip = await getGeoip();
      if (geoip) {
        const geo = geoip.lookup(ipToLookup);
        if (geo) {
          event.geoCountry = geo.country;
          event.geoCity = geo.city;
        }
      }
    } catch {}
  }

  // Asset enrichment
  const hostKey = event.sourceHost?.toLowerCase();
  const ipKey = event.srcIp;
  const assetMeta = (hostKey ? assetCache.get(hostKey) : null) ?? (ipKey ? assetCache.get(ipKey) : null);
  if (assetMeta) {
    event.assetCriticality = assetMeta.criticality;
    event.assetTags = assetMeta.tags;
  }

  return event;
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const n = parseInt(parts[0]);
  const n1 = parseInt(parts[1]);
  if (n === 10) return true;
  if (n === 172 && n1 >= 16 && n1 <= 31) return true;
  if (n === 192 && n1 === 168) return true;
  if (n === 127) return true;
  return false;
}
