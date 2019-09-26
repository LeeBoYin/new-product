import _ from 'lodash';

const SkuCalculator = function (specs, skus) {
	let selected = {
		combo: {},
		amount: 0,
	};
	const skuStatus = {};
	const statistics = {
		maxAmount: 0,
		validSkusIdx: [],
	};
	const skusIdx = _.map(skus, (sku, idx) => {
		return idx;
	});

	function refresh() {
		let loopCount = 0;

		const noneEmptySpecs = _.reduce(selected.combo, (result, value, key) => {
			if (value !== null) {
				result[key] = value;
			}
			return result;
		}, {});

		// reset statistics
		statistics.validSkusIdx = [];
		statistics.maxAmount = 0;

		// rest sku status
		_.forEach(specs, (values, name) => {
			skuStatus[name] = {};
			_.forEach(values, (value) => {
				skuStatus[name][value] = {
					selectable: false,
					maxAmount: 0,
					lowestPrice: null,
					highestPrice: null,
				};
			});
		});

		// scan all possible sku
		_.forEach(skusIdx, (idx) => {
			const sku = skus[idx];

			// 跳過數量不足的 sku
			if (sku.amount < selected.amount) {
				return;
			}

			let isValid = false;
			let isAllValid = false;
			_.forEach(_.keys(specs), (name) => {
				const specValue = sku.spec[name];

				// 符合其他 spec 的 sku 就算是 valid
				// 這個 spec 其他選項能不能選，由其他 spec 來決定
				const otherSpecs = _.clone(noneEmptySpecs);
				_.unset(otherSpecs, name);

				// check if other specs match current selected
				const isOtherValid = _.every(otherSpecs, (otherValue, otherName) => {
					loopCount++;
					return otherValue !== null && otherValue === sku.spec[otherName];
				});

				if (!isOtherValid) {
					return;
				}
				isValid = true;
				isAllValid = isValid && (_.isNil(selected.combo[name]) || specValue === selected.combo[name]);

				// enabled spec
				skuStatus[name][specValue].selectable = true;

				// max amount
				if (sku.amount > skuStatus[name][specValue].maxAmount) {
					skuStatus[name][specValue].maxAmount = sku.amount;
				}

				// lowest price
				if (_.isNil(skuStatus[name][specValue].lowestPrice) || skuStatus[name][specValue].lowestPrice > sku.price) {
					skuStatus[name][specValue].lowestPrice = sku.price;
				}

				// highest price
				if (_.isNil(skuStatus[name][specValue].highestPrice) || skuStatus[name][specValue].highestPrice < sku.price) {
					skuStatus[name][specValue].highestPrice = sku.price;
				}
			});

			if (!isValid) {
				return;
			}

			statistics.validSkusIdx.push(idx);
			if (isAllValid && sku.amount > statistics.maxAmount) {
				statistics.maxAmount = sku.amount;
			}
		});

		console.log('refreshed after ' + loopCount + ' loops');
	}

	// init
	refresh();

	// public properties
	this.setSelected = function(_selected) {
		selected = _selected;
		refresh();
	};
	this.skuStatus = skuStatus;
	this.statistics = statistics;

};

export default SkuCalculator;
