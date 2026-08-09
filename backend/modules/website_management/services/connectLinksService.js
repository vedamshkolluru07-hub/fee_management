// modules/website_management/services/connectLinksService.js

const repo = require('../repositories/connectLinksRepository.js');

const VALID_PLATFORMS = new Set([
  'whatsapp', 'instagram', 'facebook', 'email', 'phone', 'youtube', 'linkedin', 'twitter',
]);

/**
 * Builds the actual clickable link/href for a platform from whatever
 * flexible value the admin entered (a raw number/handle, or a full URL).
 */
function buildHref(platform, value) {
  const v = String(value || '').trim();
  if (!v) return null;

  // Already a full URL / mailto / tel — use as-is
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v) || /^tel:/i.test(v)) {
    return v;
  }

  switch (platform) {
    case 'whatsapp': {
      const digits = v.replace(/[^0-9]/g, '');
      return `https://wa.me/${digits}`;
    }
    case 'phone':
      return `tel:${v.replace(/[^0-9+]/g, '')}`;
    case 'email':
      return `mailto:${v}`;
    case 'instagram':
      return `https://instagram.com/${v.replace(/^@/, '')}`;
    case 'facebook':
      return `https://facebook.com/${v.replace(/^@/, '')}`;
    case 'youtube':
      return `https://youtube.com/${v.replace(/^@/, '@')}`;
    case 'linkedin':
      return `https://linkedin.com/in/${v.replace(/^@/, '')}`;
    case 'twitter':
      return `https://x.com/${v.replace(/^@/, '')}`;
    default:
      return v;
  }
}

/**
 * ======================================================
 * 🔹 PUBLIC — enabled links only, with resolved hrefs
 * ======================================================
 */
async function getEnabledLinks() {
  const result = await repo.findEnabled();
  if (!result.success) return result;

  return {
    success: true,
    data: result.data.map((row) => ({
      platform: row.platform,
      href: buildHref(row.platform, row.value),
    })),
  };
}

/**
 * ======================================================
 * 🔹 ADMIN — all platforms
 * ======================================================
 */
async function getAllLinks() {
  return repo.findAll();
}

/**
 * ======================================================
 * 🔹 ADMIN — update one platform
 * ======================================================
 */
async function updateLink(platform, changes) {
  if (!VALID_PLATFORMS.has(platform)) {
    return { success: false, message: 'Unknown platform' };
  }
  return repo.upsert(platform, changes);
}

module.exports = { getEnabledLinks, getAllLinks, updateLink, buildHref };
