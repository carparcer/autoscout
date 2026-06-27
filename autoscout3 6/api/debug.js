export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const BEE_KEY = process.env.SCRAPINGBEE_KEY;
  if (!BEE_KEY) return res.status(500).json({ error: 'No key' });

  const targetUrl = 'https://www.autotrader.co.uk/car-search?make=BMW&model=Z4&price-to=8000&sort=relevance';

  const beeParams = new URLSearchParams({
    api_key: BEE_KEY,
    url: targetUrl,
    render_js: 'false',
    country_code: 'gb',
  });

  const resp = await fetch(`https://app.scrapingbee.com/api/v1/?${beeParams}`);
  const html = await resp.text();

  // Extract useful snippets to understand structure
  const priceMatches = [...html.matchAll(/[\£][\d,]+/g)].slice(0, 10).map(m => m[0]);
  const dataAttrs = [...html.matchAll(/data-[a-z-]+="[^"]{1,40}"/g)].slice(0, 20).map(m => m[0]);
  const jsonLdCount = (html.match(/<script type="application\/ld\+json">/g) || []).length;
  const h3s = [...html.matchAll(/<h3[^>]*>([^<]{5,60})<\/h3>/g)].slice(0, 10).map(m => m[1]);
  const articleCount = (html.match(/<article/g) || []).length;
  const liCount = (html.match(/<li /g) || []).length;

  res.json({
    status: resp.status,
    html_length: html.length,
    prices_found: priceMatches,
    data_attrs: dataAttrs,
    json_ld_count: jsonLdCount,
    h3s,
    article_count: articleCount,
    li_count: liCount,
    html_snippet: html.slice(0, 800),
  });
}
