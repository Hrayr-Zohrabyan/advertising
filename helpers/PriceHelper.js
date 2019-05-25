export default class PriceHelper {
  static calculate(priceComponents, listing, optionalFeatures = []) {
    let raw = listing.price;
    let commission = raw * ((priceComponents.commission) / 100);
    let fixed = priceComponents.fixed;
    let features = 0;
    for (let feature of optionalFeatures) {
      features += feature.amount;
    }
    let final = raw + commission + fixed + features;
    return {
      raw: raw.toFixed(2),
      commission: commission.toFixed(2),
      fixed: fixed.toFixed(2),
      features: features.toFixed(2),
      final: final.toFixed(2),
    };
  }

  static calculateFromFinal(priceComponents, listing, final, optionalFeatures = []) {
    let raw = final / listing.quantity;
    for (let feature of optionalFeatures) {
      raw -= feature.amount;
    }
    raw -= priceComponents.fixed;
    raw = raw / ((100 + priceComponents.commission) / 100);
    return raw;
  }
}