function getAllSpecCombinations(_specs, _prefix = {}) {
	const types = _.keys(_specs);
	if (!types.length) {
		return _prefix;
	}

	const firstType = types[0];
	const firstSpec = _specs[firstType];

	let combinations = [];
	_.forEach(firstSpec, (value) => {
		const otherSecs = _.cloneDeep(_specs);
		delete otherSecs[firstType];
		combinations = _.concat(combinations, getAllSpecCombinations(otherSecs, _.assign({[firstType]: value}, _prefix)));
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
	if(options.date) {
		specs.date = options.date;
	}
	if(options.time) {
		specs.time = options.time;
	}

	const allSpecs = getAllSpecCombinations(specs);
	const skus = [];
	_.forEach(allSpecs, (spec) => {
		if(options.isValid && !options.isValid(spec)) {
			return;
		}
		skus.push({
			spec: spec,
			amount: options.getAmount ? options.getAmount(spec) : getRandomAmount(),
			price: options.getPrice ? options.getPrice(spec) : getRandomPrice(),
		});
	});

	return skus;
}

export default getSkus;
