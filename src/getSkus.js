function getAllSpecCombinations(_specs, _prefix = {}) {
  const types = _.keys(_specs);
  if (!types.length) {
    return _prefix;
  }

  const firstType = types[0];
  const firstSpec = _specs[firstType];

  let combinations = [];
  _.forEach(firstSpec, value => {
    const otherSecs = _.cloneDeep(_specs);
    delete otherSecs[firstType];
    combinations = _.concat(
      combinations,
      getAllSpecCombinations(
        otherSecs,
        _.assign({ [firstType]: value }, _prefix)
      )
    );
  });
  return combinations;
}

function getRandomAmount() {
  return _.random(1, 5) === 1 ? _.random(1, 5) : 0;
}

function getRandomPrice() {
  return _.random(1, 10) * 10;
}

function getSkus(specs, options) {
  options = options || {};
  if (options.date) {
    specs.date = options.date;
  }
  if (options.time) {
    specs.time = options.time;
  }

  const allSpecs = getAllSpecCombinations(specs);
  const skus = [];
  _.forEach(allSpecs, spec => {
    if (options.isValid && !options.isValid(spec)) {
      return;
    }
    skus.push({
      spec: spec,
      amount: options.getAmount ? options.getAmount(spec) : getRandomAmount(),
      price: options.getPrice ? options.getPrice(spec) : getRandomPrice()
    });
  });

  return skus;
}

export function getDummySKUS(specs, options) {
  const dummyData = [
    "2019|12|14|05:00|台北|南港|成人|10|900",
    "2019|12|15|05:00|台北|南港|成人|10|430",
    "2019|12|16|05:00|台北|南港|兒童|9|120",
    "2019|12|17|05:00|台北|南港|兒童|2|490",
    "2019|12|18|05:00|台北|南港|老人|6|250",
    "2019|12|19|05:00|台北|南港|成人|99|320",
    "2019|12|19|05:00|台中|南港|兒童|99|320",
    "2019|12|20|05:00|台中|南港|成人|1|670",
    "2019|12|20|05:00|台中|南港|兒童|1|300",
    "2019|12|20|08:00|台中|南港|成人|5|400"
  ];
  options = options || {};
  if (options.date) {
    specs.date = options.date;
  }
  if (options.time) {
    specs.time = options.time;
  }
  const skus = dummyData.map(sku => {
    const tokens = sku.split("|");
    const date = `${tokens[0]}-${tokens[1]}-${tokens[2]}`;
    const time = tokens[3];
    const depart = tokens[4];
    const arrive = tokens[5];
    const age = tokens[6];
    const amount = tokens[7];
    const price = tokens[8];
    let spec = {
      date,
      time,
      depart,
      arrive,
      age
    };
    return {
      spec,
      amount,
      price
    };
  });
  console.log("sku------");
  console.log(skus[0]);

  return skus;
}

export default getSkus;
