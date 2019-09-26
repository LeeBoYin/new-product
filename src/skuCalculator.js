import _ from 'lodash';

const SkuCalculator = function (specs, skus, multiSpecs = []) {
	let selectedArray = [];
	const skuStatus = {};
	const statistics = {
		maxAmount: 0,
		validSkusIdx: [],
	};

	const defaultStatus = _.reduce(skus, (result, sku) => {
		// if(sku.amount > result.maxAmount) {
		// 	result.maxAmount = sku.amount;
		// }
		if(sku.price < result.lowestPrice) {
			result.lowestPrice = sku.price;
		}
		if(sku.price > result.highestPrice) {
			result.highestPrice = sku.price;
		}

		return result;
	}, {
		selectable: false,
		maxAmount: 0,
		lowestPrice: Infinity,
		highestPrice: 0,
	});

	function refresh() {
		let loopCount = 0;

		// reset statistics
		statistics.validSkusIdx = [];
		statistics.maxAmount = defaultStatus.maxAmount;

		// reset sku status
		_.forEach(specs, (values, name) => {
			skuStatus[name] = {};
			_.forEach(values, (value) => {
				skuStatus[name][value] = _.clone(defaultStatus);
			});
		});

		// scan all possible sku
		_.forEach(skus, (sku, skuIdx) => {

			// scan all selected sku combinations
			let isSkuValid = true; // 只要有一個 selected 不允許這個 sku，就設為 false
			_.forEach(selectedArray, (selected, selectedIdx) => {
				if(!isSkuValid) {
					return;
				}

				// 跳過數量不足的 sku
				if (!sku.amount) {
// console.log('invalid due to amount: ' + JSON.stringify(sku));
					isSkuValid = false;
					return;
				}
				if(selected.amount) {
// console.log(' ');
// console.log('Compare');
// console.log(JSON.stringify(selected.combo));
// console.log(JSON.stringify(sku.spec));
					const isAllMatch = _.every(selected.combo, (specValue, specName) => {
						return _.isNil(specValue) || specValue === sku.spec[specName];
					});
// console.log('selected.amount: ' + selected.amount + ', isAllMatch: ' + isAllMatch);
					if(isAllMatch && sku.amount < selected.amount) {
// console.log('invalid due to amount: ' + JSON.stringify(sku));
						isSkuValid = false;
						return;
					}
				}

				let isSkuValidByThisSelected = true;
				_.forEach(_.keys(specs), (specName) => {
					// 提早離開
					if(!isSkuValidByThisSelected) {
						return;
					}

					// const specValue = sku.spec[specName];

					// 符合其他 spec 的 sku 就算是 valid
					// 這個 spec 其他選項能不能選，由其他 spec 來決定
// console.log(JSON.stringify(selected.combo));
					const otherSpecs = _.reduce(selected.combo, (result, value, key) => {
						if (key !== specName && !_.isNil(value)) {
							result[key] = value;
						}
						return result;
					}, {});
// console.log(JSON.stringify(sku));
// console.log(JSON.stringify(otherSpecs));
					// check if other specs match current selected
					const isOtherSpecsValid = _.every(otherSpecs, (otherSpecValue, otherSpecName) => {
						loopCount++;
						if(_.includes(multiSpecs, otherSpecName)) {
// console.log(otherSpecName + ': ' + otherSpecValue + ' in multiSpecs');
							return true;
						}
						return !_.isNil(otherSpecValue) && otherSpecValue === sku.spec[otherSpecName];

					});

					if (!isOtherSpecsValid) {
// console.log('When checking ' + specName + ', other specs are not valid');
// console.log(JSON.stringify(sku.spec));
// console.log(' ');
						isSkuValidByThisSelected = false;
						return;
					}

				});

				if(!isSkuValidByThisSelected) {
					isSkuValid = false;
				}
			});

			if (!isSkuValid) {
				return;
			}
console.log('valid sku:');
console.log(JSON.stringify(sku));
			_.forEach(sku.spec, (specValue, specName) => {
				skuStatus[specName][specValue].selectable = true;

				// max amount
				if (sku.amount > skuStatus[specName][specValue].maxAmount) {
					skuStatus[specName][specValue].maxAmount = sku.amount;
				}

				// lowest price
				if (sku.price < skuStatus[specName][specValue].lowestPrice) {
					skuStatus[specName][specValue].lowestPrice = sku.price;
				}

				// highest price
				if (sku.price > skuStatus[specName][specValue].highestPrice) {
					skuStatus[specName][specValue].highestPrice = sku.price;
				}

				// statistics max amount
				if (sku.amount > statistics.maxAmount) {
					statistics.maxAmount = sku.amount;
				}
			});

			statistics.validSkusIdx.push(skuIdx);
		});

		console.log('refreshed after ' + loopCount + ' loops');
	}

	// init
	refresh();

	// public properties
	this.setSelectedArray = function(_selectedArray) {
		selectedArray = _selectedArray;
		refresh();
	};
	this.skuStatus = skuStatus;
	this.statistics = statistics;

};

export default SkuCalculator;
