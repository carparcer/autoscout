export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const {
    make = 'BMW', model = 'Z4',
    price_to = '10000', mileage_to = '100000',
    year_from = '2005', year_to = '2024',
    postcode = 'SW1A 1AA'
  } = req.query;

  const APIFY_KEY = process.env.APIFY_KEY;
  if (!APIFY_KEY) {
    return res.status(500).json({ ok: false, error: 'APIFY_KEY not set' });
  }

  try {
    const input = {
      postcode,
      make,
      model,
      maxPrice: parseInt(price_to),
      maxMileage: parseInt(mileage_to),
      minYear: parseInt(year_from),
      maxYear: parseInt(year_to),
      maxItems: 10,
      scrapeDetails: false,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'GB'
      }
    };

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/haketa~autotrader-scraper/run-sync-get-dataset-items?token=${APIFY_KEY}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(58000),
      }
    );

    const items = await runRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        ok: true, count: 0, listings: [],
        sources: { autotrader_count: 0, ebay_count: 0 },
        debug: { status: runRes.status, items_type: typeof items }
      });
    }

    const listings = items.slice(0, 10).map(item => ({
      source: 'AutoTrader',
      title: item.title || `${item.year || ''} ${item.make || make} ${item.model || model}`.trim(),
      price: item.price || 0,
      mileage: item.mileage ? `${Number(item.mileage).toLocaleString()} miles` : '',
      year: String(item.year || ''),
      location: item.location || 'UK',
      url: item.url || 'https://www.autotrader.co.uk',
      dealer: item.dealerName || item.sellerType || '',
      priceIndicator: item.priceIndicator || '',
      transmission: item.transmission || '',
      fuel: item.fuelType || '',
    })).filter(l => l.price > 0);

    return res.status(200).json({
      ok: true,
      count: listings.length,
      listings,
      sources: { autotrader_count: listings.length, ebay_count: 0 }
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
