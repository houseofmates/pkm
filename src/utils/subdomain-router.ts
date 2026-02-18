
export const getSubdomain = () => {
  const hostname = window.location.hostname;

  // handle localhost and ip addresses
  if (hostname.includes('localhost') || hostname.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
  const parts = hostname.split('.');
  // if we have something like "dupe.localhost"
  if (parts.length > 1 && parts[0] !== 'www' && !hostname.match(/^\d/)) {
  return parts[0];
  }
  return null;
  }

  const parts = hostname.split('.');

  // if we have "dupe.houseofmates.space" (length 3)
  if (parts.length === 3) {
  if (parts[0] === 'www') return null;
  return parts[0];
  }

  // if we have "some.sub.houseofmates.space" (length > 3)
  if (parts.length > 3) {
  return parts[0];
  }

  // root domain ("houseofmates.space")
  return null;
};

export const isPublicDomain = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const search = window.location.search;

  // allow overriding public detection during development by passing ?mode=private
  if (search.includes('mode=private')) {
    console.log('[Router] Override: mode=private detected');
    return false;
  }

  // explicit include: port 3010/3001 is always public builder
  if (port === '3010' || port === '3001') {
  console.log(`[Router] Public by Port: ${port}`);
  return true;
  }

  const subdomain = getSubdomain();

  // explicit exclusion: pkm is always the private app
  if (subdomain === 'pkm') {
  console.log('[Router] Private: PKM subdomain detected');
  return false;
  }

  // for local dev, we can use a query param
  if (search.includes('mode=public')) return true;

  // treat local ip or localhost as public if it's on the specific ports
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
  return port === '3010' || port === '3001';
  }

  // root domain ("houseofmates.space") is public
  if (hostname === 'houseofmates.space') {
  console.log('[Router] Public: Root domain houseofmates.space detected');
  return true;
  }

  // any other subdomain on houseofmates.space (except pkm) is public
  if (hostname.endsWith('.houseofmates.space')) {
  console.log(`[Router] Public: Subdomain ${subdomain} on houseofmates.space detected`);
  return true;
  }

  return false;
};
