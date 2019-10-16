import _ from 'lodash';

const SkuCalculator = function(options) {
	const specs = options.specs || {};
	const skus = options.skus || [];
	const primarySpecs = options.primarySpecs || null;
	const hasAmount = options.hasAmount || false;
	const multiSpecs = options.multiSpecs || [];

	let selectedArray = [];
	const skuStatus = {};
	let statistics = {};

	const statisticsOfAll = {
		maxAmount: hasAmount ? 0 : null,
		lowestPrice: Infinity,
		lowestPricePrimary: null,
		highestPrice: 0,
		highestPricePrimary: null,
		validSkusIdx: _.keys(skus),
	};

	const statisticsOfSpec = {};
	_.forEach(skus, (sku) => {
		sku.isPrimary = checkIsSkuPrimary(sku);

		// 計算每個 spec value 的初始統計
		_.forEach(sku.spec, (specValue, specName) => {
			// init data structure
			if(_.isNil(statisticsOfSpec[specName])) {
				statisticsOfSpec[specName] = {};
			}
			if(_.isNil(statisticsOfSpec[specName][specValue])) {
				statisticsOfSpec[specName][specValue] = {
					selectable: false,
					maxAmount: hasAmount ? 0 : null,
					lowestPrice: Infinity,
					lowestPricePrimary: null,
					highestPrice: 0,
					highestPricePrimary: null,
				};
			}

			if(hasAmount) {
				if(sku.amount) {
					statisticsOfSpec[specName][specValue].selectable = true;
				}
				if(sku.amount > statisticsOfSpec[specName][specValue].maxAmount) {
					statisticsOfSpec[specName][specValue].maxAmount = sku.amount;
				}
				if(sku.amount > statisticsOfAll.maxAmount) {
					statisticsOfAll.maxAmount = sku.amount;
				}
			} else {
				statisticsOfSpec[specName][specValue].selectable = true;
			}

			if(sku.price < statisticsOfSpec[specName][specValue].lowestPrice) {
				statisticsOfSpec[specName][specValue].lowestPrice = sku.price;
			}
			if(sku.price < statisticsOfAll.lowestPrice) {
				statisticsOfAll.lowestPrice = sku.price;
			}
			if(sku.price > statisticsOfSpec[specName][specValue].highestPrice) {
				statisticsOfSpec[specName][specValue].highestPrice = sku.price;
			}
			if(sku.price > statisticsOfAll.highestPrice) {
				statisticsOfAll.highestPrice = sku.price;
			}

			// primary price
			if(sku.isPrimary) {
				// lowest price primary
				if(_.isNil(statisticsOfSpec[specName][specValue].lowestPricePrimary) || sku.price < statisticsOfSpec[specName][specValue].lowestPricePrimary) {
					statisticsOfSpec[specName][specValue].lowestPricePrimary = sku.price;
				}
				if(_.isNil(statisticsOfAll.lowestPricePrimary) || sku.price < statisticsOfAll.lowestPricePrimary) {
					statisticsOfAll.lowestPricePrimary = sku.price;
				}
				// highest price primary
				if(_.isNil(statisticsOfSpec[specName][specValue].highestPricePrimary) || sku.price > statisticsOfSpec[specName][specValue].highestPricePrimary) {
					statisticsOfSpec[specName][specValue].highestPricePrimary = sku.price;
				}
				if(_.isNil(statisticsOfAll.highestPricePrimary) || sku.price > statisticsOfAll.highestPricePrimary) {
					statisticsOfAll.highestPricePrimary = sku.price;
				}
			}
		});
	});

	function checkIsSkuPrimary(sku) {
		return primarySpecs ? _.every(primarySpecs, (specValue, specName) => {
			return sku.spec[specName] === specValue;
		}) : false;
	}

	function refresh() {
		// 每個 selected 建立一套 spec value 的統計結果
		const tempStatus = {};
		// 每個 selected 建立一套 valid sku idx
		const validSkusIdx = {};
		// 記錄已選擇的 spec
		let selectedSpecs = [];
		_.forEach(selectedArray, (selected, selectedIdx) => {
			tempStatus[selectedIdx] = {};
			validSkusIdx[selectedIdx] = [];
			_.forEach(specs, (values, specName) => {
				tempStatus[selectedIdx][specName] = {};
				_.forEach(values, (specValue) => {
					tempStatus[selectedIdx][specName][specValue] = {
						selectable: false,
						maxAmount: hasAmount ? 0 : null,
						lowestPrice: Infinity,
						lowestPricePrimary: null,
						highestPrice: 0,
						highestPricePrimary: null,
					};
				});

				// 記錄已選擇的 spec
				if(!_.isNil(selected.combo[specName])) {
					selectedSpecs.push([specName, selected.combo[specName]]);
				}
			});
		});

		// 過濾重複的 selected spec
		selectedSpecs = _.uniqBy(selectedSpecs, (selectedSpec) => {
			return _.join(selectedSpec);
		});

		// 比對每個 sku
		// scan all possible sku
		_.forEach(skus, (sku, skuIdx) => {
			// scan all selected sku combinations
			_.forEach(selectedArray, (selected, selectedIdx) => {
				if(hasAmount) {
					// 跳過數量不足的 sku
					if(!sku.amount) {
						return;
					}

					// 如果 selected 已經有決定數量，要看此 sku 是否有足夠數量
					if(selected.amount) {
						const isAllMatch = _.every(selected.combo, (specValue, specName) => {
							return _.isNil(specValue) || !_.includes(multiSpecs, specName) || specValue === sku.spec[specName];
						});

						// 此 sku 符合目前這個 selected 的 spec 條件，但是數量不足
						if(isAllMatch && sku.amount < selected.amount) {
							return;
						}
					}
				}

				let isSkuValidByThisSelected = false;
				_.forEach(_.keys(specs), (specName) => {
					const specValue = sku.spec[specName];

					// 符合其他 spec 的 sku 就算是 valid
					// 這個 spec 其他選項能不能選，由其他 spec 來決定
					const otherSpecs = _.reduce(selected.combo, (result, value, key) => {
						if(key !== specName && !_.isNil(value)) {
							result[key] = value;
						}
						return result;
					}, {});

					// check if other specs match current selected
					const isOtherSpecsValid = _.isEmpty(otherSpecs) || _.every(otherSpecs, (otherSpecValue, otherSpecName) => {
						return otherSpecValue === sku.spec[otherSpecName];
					});

					if(!isOtherSpecsValid) {
						return;
					}

					// 只要有一個 spec 被排除後，其他 spec 符合 selected 條件，就算是這個 sku 可以被選取
					isSkuValidByThisSelected = true;

					const statusOfThisSelected = tempStatus[selectedIdx][specName][specValue];
					statusOfThisSelected.selectable = true;

					// max amount
					if(hasAmount && sku.amount > statusOfThisSelected.maxAmount) {
						statusOfThisSelected.maxAmount = sku.amount;
					}

					// lowest price
					if(sku.price < statusOfThisSelected.lowestPrice) {
						statusOfThisSelected.lowestPrice = sku.price;
					}

					// highest price
					if(sku.price > statusOfThisSelected.highestPrice) {
						statusOfThisSelected.highestPrice = sku.price;
					}

					if(sku.isPrimary) {
						// lowest price
						if(_.isNil(statusOfThisSelected.lowestPricePrimary) || sku.price < statusOfThisSelected.lowestPricePrimary) {
							statusOfThisSelected.lowestPricePrimary = sku.price;
						}

						// highest price
						if(_.isNil(statusOfThisSelected.highestPricePrimary) || sku.price > statusOfThisSelected.highestPricePrimary) {
							statusOfThisSelected.highestPricePrimary = sku.price;
						}
					}
				});

				if(isSkuValidByThisSelected) {
					validSkusIdx[selectedIdx].push(skuIdx);
				}
			});
		});

		// compute skuStatus
		_.forEach(specs, (values, specName) => {
			skuStatus[specName] = {};
			_.forEach(values, (specValue) => {
				// reset sku status
				const statusOfThisSpec = skuStatus[specName][specValue] = _.clone(statisticsOfSpec[specName][specValue]);

				if(_.isEmpty(tempStatus)) {
					return;
				}

				// selectable: spec is selectable if all spec is valid for all selected conditions
				statusOfThisSpec.selectable = _.every(tempStatus, (status) => {
					return status[specName][specValue].selectable;
				});

				if(!statusOfThisSpec.selectable) {
					statusOfThisSpec.maxAmount = hasAmount ? 0 : null;
					statusOfThisSpec.lowestPrice = null;
					statusOfThisSpec.highestPrice = null;
					statusOfThisSpec.lowestPricePrimary = null;
					statusOfThisSpec.highestPricePrimary = null;
					return;
				}

				// max amount
				if(hasAmount) {
					statusOfThisSpec.maxAmount = _.get(_.minBy(_.values(tempStatus), (status) => {
						return status[specName][specValue].maxAmount;
					}), [specName, specValue, 'maxAmount'], 0);
				}

				// lowest price
				statusOfThisSpec.lowestPrice = _.get(_.minBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].lowestPrice;
				}), [specName, specValue, 'lowestPrice'], null);

				// highest price
				statusOfThisSpec.highestPrice = _.get(_.maxBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].highestPrice;
				}), [specName, specValue, 'highestPrice'], null);

				// lowest price primary
				statusOfThisSpec.lowestPricePrimary = _.get(_.minBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].lowestPricePrimary;
				}), [specName, specValue, 'lowestPricePrimary'], null);

				// highest price primary
				statusOfThisSpec.highestPricePrimary = _.get(_.maxBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].highestPricePrimary;
				}), [specName, specValue, 'highestPricePrimary'], null);
			});
		});

		// compute statistics
		if(_.isEmpty(selectedArray)) {
			statistics = _.cloneDeep(statisticsOfAll);
		} else {
			// 所有 selected valid sku 的交集
			statistics.validSkusIdx = _.intersection(..._.values(validSkusIdx));

			// 所有 selected spec max amount 的最小值
			if(hasAmount) {
				statistics.maxAmount = _.reduce(selectedSpecs, (result, selectedSpec) => {
					const maxAmountOfSpec = _.get(skuStatus, [...selectedSpec, 'maxAmount']);
					return maxAmountOfSpec < result ? maxAmountOfSpec : result;
				}, statisticsOfAll.maxAmount);
			}

			// 所有 selected spec lowest price 的最小值
			statistics.lowestPrice = _.reduce(selectedSpecs, (result, selectedSpec) => {
				const lowestPriceOfSpec = _.get(skuStatus, [...selectedSpec, 'lowestPrice']);
				return lowestPriceOfSpec < result ? lowestPriceOfSpec : result;
			}, statisticsOfAll.lowestPrice);

			// 所有 selected spec highest price 的最大值
			statistics.highestPrice = _.reduce(selectedSpecs, (result, selectedSpec) => {
				const highestPriceOfSpec = _.get(skuStatus, [...selectedSpec, 'highestPrice']);
				return highestPriceOfSpec > result ? highestPriceOfSpec : result;
			}, statisticsOfAll.highestPrice);

			// lowest price primary
			statistics.lowestPricePrimary = _.reduce(selectedSpecs, (result, selectedSpec) => {
				const lowestPricePrimaryOfSpec = _.get(skuStatus, [...selectedSpec, 'lowestPricePrimary']);
				if(_.isNil(lowestPricePrimaryOfSpec)) {
					return result;
				}
				if(_.isNil(result)) {
					return lowestPricePrimaryOfSpec;
				}
				return lowestPricePrimaryOfSpec < result ? lowestPricePrimaryOfSpec : result;
			}, statisticsOfAll.lowestPricePrimary);

			// highest price Primary
			statistics.highestPricePrimary = _.reduce(selectedSpecs, (result, selectedSpec) => {
				const highestPricePrimaryOfSpec = _.get(skuStatus, [...selectedSpec, 'highestPricePrimary']);

				if(_.isNil(highestPricePrimaryOfSpec)) {
					return result;
				}
				if(_.isNil(result)) {
					return highestPricePrimaryOfSpec;
				}
				return highestPricePrimaryOfSpec > result ? highestPricePrimaryOfSpec : result;
			}, statisticsOfAll.highestPricePrimary);
		}
	}

	// init
	refresh();

	// public properties
	this.setSelectedArray = function(_selectedArray) {
		// 只留下有選 spec 的
		_selectedArray = _.filter(_selectedArray, (selected) => {
			return (hasAmount && selected.amount > 0) || _.some(selected.combo, (value) => {
				return !_.isNil(value);
			});
		});
		selectedArray = _selectedArray;
		refresh();
	};
	this.skuStatus = skuStatus;
	this.statistics = statistics;
};

export default SkuCalculator;
