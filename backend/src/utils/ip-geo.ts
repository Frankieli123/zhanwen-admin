import geoip from 'geoip-lite';

export interface GeoFields {
  countryCode?: string;
  country?: string;
  region?: string;
  city?: string;
  location?: string;
}

const CN_REGION_CODE_TO_NAME: Record<string, string> = {
  '11': '北京',
  '12': '天津',
  '13': '河北',
  '14': '山西',
  '15': '内蒙古',
  '21': '辽宁',
  '22': '吉林',
  '23': '黑龙江',
  '31': '上海',
  '32': '江苏',
  '33': '浙江',
  '34': '安徽',
  '35': '福建',
  '36': '江西',
  '37': '山东',
  '41': '河南',
  '42': '湖北',
  '43': '湖南',
  '44': '广东',
  '45': '广西',
  '46': '海南',
  '50': '重庆',
  '51': '四川',
  '52': '贵州',
  '53': '云南',
  '54': '西藏',
  '61': '陕西',
  '62': '甘肃',
  '63': '青海',
  '64': '宁夏',
  '65': '新疆',
  '71': '台湾',
  '81': '香港',
  '82': '澳门',
};

const COUNTRY_CODE_TO_ZH: Record<string, string> = {
  CN: '中国',
  HK: '中国香港',
  MO: '中国澳门',
  TW: '中国台湾',
  US: '美国',
  GB: '英国',
  DE: '德国',
  FR: '法国',
  JP: '日本',
  KR: '韩国',
  SG: '新加坡',
  RU: '俄罗斯',
  CA: '加拿大',
  AU: '澳大利亚',
};

export function normalizeClientIp(raw?: string | null): string | undefined {
  const s = String(raw || '').trim();
  if (!s) return undefined;
  const first = s.split(',')[0]?.trim();
  if (!first) return undefined;

  // IPv6 bracket form: [::1]:1234
  const bracket = first.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket?.[1]) return stripIpv6Mapped(bracket[1]);

  // IPv4:port
  const v4WithPort = first.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (v4WithPort?.[1]) return v4WithPort[1];

  return stripIpv6Mapped(first);
}

function stripIpv6Mapped(ip: string): string {
  const s = String(ip || '').trim();
  if (!s) return '';
  const m = s.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return m?.[1] ? m[1] : s;
}

function isPrivateIp(ip: string): boolean {
  const v = stripIpv6Mapped(ip);
  if (!v) return true;
  if (v === '127.0.0.1' || v === '::1') return true;
  if (v.startsWith('10.')) return true;
  if (v.startsWith('192.168.')) return true;
  if (v.startsWith('169.254.')) return true;
  const m172 = v.match(/^172\.(\d{1,3})\./);
  if (m172) {
    const n = Number(m172[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

function formatLocation(countryCode?: string, region?: string, city?: string): string | undefined {
  const cc = (countryCode || '').trim().toUpperCase();
  const c = cc ? (COUNTRY_CODE_TO_ZH[cc] || cc) : '';
  const rRaw = String(region || '').trim();
  const r = cc === 'CN' && CN_REGION_CODE_TO_NAME[rRaw] ? CN_REGION_CODE_TO_NAME[rRaw] : rRaw;
  const cityStr = String(city || '').trim();

  const parts = [c, r, cityStr].filter(Boolean);
  return parts.length ? parts.join('-') : undefined;
}

export function geoFromIp(ip?: string | null): GeoFields | undefined {
  const normalized = normalizeClientIp(ip);
  if (!normalized) return undefined;

  if (isPrivateIp(normalized)) {
    return { location: '本地/内网', countryCode: 'LAN', country: '本地/内网' };
  }

  const hit: any = geoip.lookup(normalized);
  if (!hit) return undefined;

  const countryCode = typeof hit.country === 'string' ? hit.country : undefined;
  const region = typeof hit.region === 'string' ? hit.region : undefined;
  const city = typeof hit.city === 'string' ? hit.city : undefined;
  const country = countryCode ? (COUNTRY_CODE_TO_ZH[countryCode] || countryCode) : undefined;
  const location = formatLocation(countryCode, region, city);

  const out: GeoFields = {};
  if (countryCode) out.countryCode = countryCode;
  if (country) out.country = country;
  if (region) out.region = region;
  if (city) out.city = city;
  if (location) out.location = location;
  return Object.keys(out).length ? out : undefined;
}

