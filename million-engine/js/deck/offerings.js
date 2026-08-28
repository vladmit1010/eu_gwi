/** Mastercard offerings — source: data/client/offerings.json */

let OFFERINGS = {};

export async function loadOfferings(url = "data/client/offerings.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load offerings.json");
  OFFERINGS = await res.json();
  return OFFERINGS;
}

export function setOfferings(data) {
  OFFERINGS = data || {};
}

export function offeringsFor(passionId, countryCode) {
  const list = OFFERINGS[passionId] || [];
  return list
    .filter((o) => !o.countries || o.countries.indexOf(countryCode) >= 0)
    .map((o) => o.text);
}
