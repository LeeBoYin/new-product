import _ from 'lodash';

const SkuCalculator = function (specs, skus, multiSpecs = []) {
	let selectedArray = [];
	const skuStatus = {};
	const statistics = {
		maxAmount: 0,
		validSkusIdx: [],
	};

	const statisticsOfAll = {
		maxAmount: 0,
		validSkusIdx: _.keys(skus),
	};

	// 計算每個 spec value 的初始統計
	const statisticsOfSpec = {};
	_.forEach(skus, (sku) => {
		_.forEach(sku.spec, (specValue, specName) => {
			if(_.isNil(statisticsOfSpec[specName])) {
				statisticsOfSpec[specName] = {};
			}
			if(_.isNil(statisticsOfSpec[specName][specValue])) {
				statisticsOfSpec[specName][specValue] = {
					selectable: false,
					maxAmount: 0,
					lowestPrice: Infinity,
					highestPrice: 0,
				};
			}

			if(sku.amount) {
				statisticsOfSpec[specName][specValue].selectable = true;
			}
			if(sku.amount > statisticsOfSpec[specName][specValue].maxAmount) {
				statisticsOfSpec[specName][specValue].maxAmount = sku.amount;
			}
			if(sku.price < statisticsOfSpec[specName][specValue].lowestPrice) {
				statisticsOfSpec[specName][specValue].lowestPrice = sku.price;
			}
			if(sku.price > statisticsOfSpec[specName][specValue].highestPrice) {
				statisticsOfSpec[specName][specValue].highestPrice = sku.price;
			}

			if(sku.amount > statisticsOfAll.maxAmount) {
				statisticsOfAll.maxAmount = sku.amount;
			}
		});
	});

	function refresh() {
		let loopCount = 0;

		// 每個 selected 建立一套 spec value 的統計結果
		const tempStatus  = {};
		// 每個 selected 建立一套 valid sku idx
		const validSkusIdx = {};
		// 記錄已選擇的 spec
		const selectedSpecs = [];
		_.forEach(selectedArray, (selected, selectedIdx) => {
			tempStatus[selectedIdx] = {};
			validSkusIdx[selectedIdx] = [];
			_.forEach(specs, (values, specName) => {
				tempStatus[selectedIdx][specName] = {};
				_.forEach(values, (specValue) => {
					tempStatus[selectedIdx][specName][specValue] = {
						selectable: false,
						maxAmount: 0,
						lowestPrice: Infinity,
						highestPrice: 0,
					}

				});

				// 記錄已選擇的 spec
				if(!_.isNil(selected.combo[specName])) {
					selectedSpecs.push([specName, selected.combo[specName]])
				}
			});
		});

		// 比對每個 sku
		// scan all possible sku
		_.forEach(skus, (sku, skuIdx) => {
			// scan all selected sku combinations
			_.forEach(selectedArray, (selected, selectedIdx) => {
				// 跳過數量不足的 sku
				if (!sku.amount) {
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

				let isSkuValidByThisSelected = false;
				_.forEach(_.keys(specs), (specName) => {
					const specValue = sku.spec[specName];

					// 符合其他 spec 的 sku 就算是 valid
					// 這個 spec 其他選項能不能選，由其他 spec 來決定
					const otherSpecs = _.reduce(selected.combo, (result, value, key) => {
						if (key !== specName && !_.isNil(value)) {
							result[key] = value;
						}
						return result;
					}, {});

					// check if other specs match current selected
					const isOtherSpecsValid = _.isEmpty(otherSpecs) || _.every(otherSpecs, (otherSpecValue, otherSpecName) => {
						loopCount++;
						return otherSpecValue === sku.spec[otherSpecName];

					});

					if (!isOtherSpecsValid) {
						return;
					}

					// 只要有一個 spec 被排除後，其他 spec 符合 selected 條件，就算是這個 sku 可以被選取
					isSkuValidByThisSelected = true;

					tempStatus[selectedIdx][specName][specValue].selectable = true;

					// max amount
					if (sku.amount > tempStatus[selectedIdx][specName][specValue].maxAmount) {
						tempStatus[selectedIdx][specName][specValue].maxAmount = sku.amount;
					}

					// lowest price
					if (sku.price < tempStatus[selectedIdx][specName][specValue].lowestPrice) {
						tempStatus[selectedIdx][specName][specValue].lowestPrice = sku.price;
					}

					// highest price
					if (sku.price > tempStatus[selectedIdx][specName][specValue].highestPrice) {
						tempStatus[selectedIdx][specName][specValue].highestPrice = sku.price;
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
				skuStatus[specName][specValue] = _.clone(statisticsOfSpec[specName][specValue]);

				if(_.isEmpty(tempStatus)) {
					return;
				}

				// selectable: spec is selectable if all spec is valid for all selected conditions
				skuStatus[specName][specValue].selectable = _.every(tempStatus, (status) => {
					return status[specName][specValue].selectable;
				});

				if(!skuStatus[specName][specValue].selectable) {
					skuStatus[specName][specValue].maxAmount = 0;
					skuStatus[specName][specValue].lowestPrice = null;
					skuStatus[specName][specValue].highestPrice = null;
					return;
				}

				// max amount
				skuStatus[specName][specValue].maxAmount = _.get(_.minBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].maxAmount;
				}), [specName, specValue, 'maxAmount'], 0);

				// lowest price
				skuStatus[specName][specValue].lowestPrice = _.get(_.minBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].lowestPrice;
				}), [specName, specValue, 'lowestPrice'], null);

				// highest price
				skuStatus[specName][specValue].highestPrice = _.get(_.maxBy(_.values(tempStatus), (status) => {
					return status[specName][specValue].highestPrice;
				}), [specName, specValue, 'highestPrice'], null);
			});
		});

		// compute statistics
		if(_.isEmpty(selectedArray)) {
			statistics.maxAmount = statisticsOfAll.maxAmount;
			statistics.validSkusIdx = statisticsOfAll.validSkusIdx;
		} else {
			// 所有 selected valid sku 的交集
			statistics.validSkusIdx = _.intersection(..._.values(validSkusIdx));

			// 所有 selected spec max amount 的最小值
			statistics.maxAmount = _.reduce(selectedSpecs, (result, selectedSpec) => {
				const maxAmountOfSpec = _.get(skuStatus, [...selectedSpec, 'maxAmount']);
				return maxAmountOfSpec < result ? maxAmountOfSpec : result;
			}, statisticsOfAll.maxAmount);
		}

		// console.log('refreshed after ' + loopCount + ' loops');
	}

	// init
	refresh();

	// public properties
	this.setSelectedArray = function(_selectedArray) {
		_selectedArray = _.filter(_selectedArray, (selected) => {
			return selected.amount > 0 || _.some(selected.combo, (value) => {
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
