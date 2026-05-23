/**
 * AccessTrade affiliate link generator
 * Publisher: 6964549063767105843
 */

const PUBLISHER_ID = '6964549063767105843';

const CAMPAIGN_IDS: Record<string, string> = {
  watsons: '5701062214502283005',
  tiki:    '4348614231480407268',
};

/**
 * Lấy platform key từ tên sàn
 * platform_name trong DB: 'watsons', 'Tiki', 'tiki', ...
 */
function getPlatformKey(platformName: string): string | null {
  const lower = platformName.toLowerCase();
  if (lower.includes('watsons')) return 'watsons';
  if (lower.includes('tiki'))    return 'tiki';
  return null;
}

/**
 * Generate affiliate link cho product URL
 * Nếu sàn không có affiliate → trả về original URL
 */
export function toAffiliateLink(productUrl: string, platformName: string): string {
  if (!productUrl) return productUrl;

  const key = getPlatformKey(platformName);
  if (!key) return productUrl; // Sàn chưa có affiliate → link gốc

  const campaignId = CAMPAIGN_IDS[key];
  const encoded = btoa(productUrl)
    .replace(/\+/g, '%2B')
    .replace(/=/g, '%3D')
    .replace(/\//g, '%2F');

return `https://go.isclix.com/deep_link/v5/${PUBLISHER_ID}/${campaignId}?sub1=pricehawk&sub4=pricehawk&url_enc=${encoded}`;  
}