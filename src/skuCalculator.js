import _ from 'lodash';

const SkuCalculator = function(options) {
	const specs = options.specs || {};
	const skus = options.skus || [];
	const primarySpecs = options.primarySpecs || null;
	const hasAmount = options.hasAmount || false;
	const multiSpecs = options.multiSpecs || [];

	let selectedArray = [];
	const skuStatus = {};
	const statistics = {};

	const statisticsOfAll = {
		maxAmount: hasAmount ? 0 : null,
		lowestPrice: Infinity,
		lowestPricePrimary: null,
		highestPrice: 0,
		highestPricePrimary: null,
		validSkusIdx: _.keys(skus),
		cheapestSkusIdx: [],
	};

	const statisticsOfSpec = {};
	_.forEach(skus, (sku, skuIdx) => {
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
					cheapestSkusIdx: [],
				};
			}

			const statisticsOfThisSpec = statisticsOfSpec[specName][specValue];

			if(hasAmount) {
				if(sku.amount) {
					statisticsOfThisSpec.selectable = true;
				}
				if(sku.amount > statisticsOfThisSpec.maxAmount) {
					statisticsOfThisSpec.maxAmount = sku.amount;
				}
				if(sku.amount > statisticsOfAll.maxAmount) {
					statisticsOfAll.maxAmount = sku.amount;
				}
			} else {
				statisticsOfThisSpec.selectable = true;
			}

			if(sku.price < statisticsOfThisSpec.lowestPrice) {
				statisticsOfThisSpec.lowestPrice = sku.price;
				statisticsOfThisSpec.cheapestSkusIdx = [skuIdx];
			} else if(sku.price === statisticsOfThisSpec.lowestPrice) {
				statisticsOfThisSpec.cheapestSkusIdx.push(skuIdx);
				statisticsOfThisSpec.cheapestSkusIdx = _.uniq(statisticsOfThisSpec.cheapestSkusIdx);
			}
			if(sku.price < statisticsOfAll.lowestPrice) {
				statisticsOfAll.lowestPrice = sku.price;
				statisticsOfAll.cheapestSkusIdx = [skuIdx];
			} else if(sku.price === statisticsOfAll.lowestPrice) {
				statisticsOfAll.cheapestSkusIdx.push(skuIdx);
				statisticsOfAll.cheapestSkusIdx = _.uniq(statisticsOfAll.cheapestSkusIdx);
			}
			if(sku.price > statisticsOfThisSpec.highestPrice) {
				statisticsOfThisSpec.highestPrice = sku.price;
			}
			if(sku.price > statisticsOfAll.highestPrice) {
				statisticsOfAll.highestPrice = sku.price;
			}

			// primary price
			if(sku.isPrimary) {
				// lowest price primary
				if(_.isNil(statisticsOfThisSpec.lowestPricePrimary) || sku.price < statisticsOfThisSpec.lowestPricePrimary) {
					statisticsOfThisSpec.lowestPricePrimary = sku.price;
				}
				if(_.isNil(statisticsOfAll.lowestPricePrimary) || sku.price < statisticsOfAll.lowestPricePrimary) {
					statisticsOfAll.lowestPricePrimary = sku.price;
				}
				// highest price primary
				if(_.isNil(statisticsOfThisSpec.highestPricePrimary) || sku.price > statisticsOfThisSpec.highestPricePrimary) {
					statisticsOfThisSpec.highestPricePrimary = sku.price;
				}
				if(_.isNil(statisticsOfAll.highestPricePrimary) || sku.price > statisticsOfAll.highestPricePrimary) {
					statisticsOfAll.highestPricePrimary = sku.price;
				}
			}
		});
	});

	const statisticsDefault = {
		maxAmount: null,
		lowestPrice: null,
		lowestPricePrimary: null,
		highestPrice: null,
		highestPricePrimary: null,
		targetedAmount: null,
		validSkusIdx: statisticsOfAll.validSkusIdx,
		cheapestSkusIdx: statisticsOfAll.cheapestSkusIdx,
	};

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
		// 記錄完全符合 selected 的 sku
		const targetedAmount = {};
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
						cheapestSkusIdx: [],
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
				const isAllMatch = _.every(selected.combo, (specValue, specName) => {
					return !_.isNil(specValue) && specValue === sku.spec[specName];
				});
				if(isAllMatch) {
					targetedAmount[skuIdx] = selected.amount;
				}

				if(hasAmount) {
					// 跳過數量不足的 sku
					if(!sku.amount) {
						return;
					}

					let isValid;
					if(_.isEmpty(multiSpecs)) {
						isValid = _.every(selected.combo, (specValue, specName) => {
							return _.isNil(specValue) || specValue === sku.spec[specName];
						});
					} else {
						isValid = _.every(multiSpecs, (specName) => {
							return _.isNil(selected.combo[specName]) || selected.combo[specName] === sku.spec[specName];
						});
					}

					// 如果 selected 已經有決定數量，要看此 sku 是否有足夠數量
					if(selected.amount && isValid) {
						// 此 sku 符合目前這個 selected 的 spec 條件，但是數量不足
						if(sku.amount < selected.amount) {
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
						statusOfThisSelected.cheapestSkusIdx = [skuIdx];
					} else if(sku.price === statusOfThisSelected.lowestPrice) {
						statusOfThisSelected.cheapestSkusIdx.push(skuIdx);
						statusOfThisSelected.cheapestSkusIdx = _.uniq(statusOfThisSelected.cheapestSkusIdx);
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

				if(!isSkuValidByThisSelected) {
					return;
				}

				validSkusIdx[selectedIdx].push(skuIdx);
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
					statusOfThisSpec.cheapestSkusIdx = null;
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

				// cheapest skus idx
				statusOfThisSpec.cheapestSkusIdx = _.union(..._.map(_.filter(_.values(tempStatus), (status) => {
					return status[specName][specValue].lowestPrice === statusOfThisSpec.lowestPrice;
				}), (status) => {
					return _.get(status, [specName, specValue, 'cheapestSkusIdx'], []);
				}));
			});
		});

		// compute statistics
		// reset default
		_.assign(statistics, statisticsDefault);
		if(_.isEmpty(selectedArray)) {
			_.assign(statistics, statisticsOfAll);
		} else {
			_.forEach(selectedArray, (selected, selectedIdx) => {
				// 所有 selected spec max amount 的最小值
				if(hasAmount) {
					// maxAmount: 一個 selected 的 selected specs 取 min，每個 selected 之中取 max
					const maxAmountOfSelected = _.min([statisticsOfAll.maxAmount, ..._.map(selected.combo, (specValue, specName) => {
						return _.get(skuStatus, [specName, specValue, 'maxAmount'], null);
					})]);
					statistics.maxAmount = _.max([maxAmountOfSelected, statistics.maxAmount]);
				}

				// lowestPrice: 一個 selected 的 selected specs 取 max，每個 selected 之中取 min
				const lowestPriceOfSelected = _.max([statisticsOfAll.lowestPrice, ..._.map(selected.combo, (specValue, specName) => {
					return _.get(skuStatus, [specName, specValue, 'lowestPrice'], null);
				})]);
				if(!_.every(selected.combo, _.isNil) && !_.isNil(lowestPriceOfSelected)) {
					// cheapest skus idx
					const cheapestSkusIdx = _.reduce(selected.combo, (result, specValue, specName) => {
						if(_.get(skuStatus, [specName, specValue, 'lowestPrice']) === lowestPriceOfSelected) {
							result = _.uniq(result.concat(_.get(skuStatus, [specName, specValue, 'cheapestSkusIdx'])));
						}
						return result;
					}, []);

					if(_.isNil(statistics.lowestPrice) || lowestPriceOfSelected < statistics.lowestPrice) {
						statistics.cheapestSkusIdx = cheapestSkusIdx;
					} else if(lowestPriceOfSelected === statistics.lowestPrice) {
						statistics.cheapestSkusIdx = _.uniq(statistics.cheapestSkusIdx.concat(cheapestSkusIdx));
					}
				}
				statistics.lowestPrice = _.min([lowestPriceOfSelected, statistics.lowestPrice]);

				// highestPrice: 一個 selected 的 selected specs 取 min，每個 selected 之中取 max
				const highestPriceOfSelected = _.min([statisticsOfAll.highestPrice, ..._.map(selected.combo, (specValue, specName) => {
					return _.get(skuStatus, [specName, specValue, 'highestPrice'], null);
				})]);
				statistics.highestPrice = _.max([highestPriceOfSelected, statistics.highestPrice]);

				const isSelectedPrimary = primarySpecs && _.every(selected.combo, (specValue, specName) => {
					return _.isNil(specValue) || _.isNil(primarySpecs[specName]) || primarySpecs[specName] === specValue;
				});
				if(isSelectedPrimary) {
					// lowestPricePrimary: 一個 selected 的 selected specs 取 max，每個 selected 之中取 min
					const lowestPricePrimaryOfSelected = _.max(_.map(selected.combo, (specValue, specName) => {
						return _.get(skuStatus, [specName, specValue, 'lowestPricePrimary']);
					}));
					statistics.lowestPricePrimary = _.min([lowestPricePrimaryOfSelected, statistics.lowestPricePrimary]);

					// highestPricePrimary: 一個 selected 的 selected specs 取 min，每個 selected 之中取 max
					const highestPricePrimaryOfSelected = _.min(_.map(selected.combo, (specValue, specName) => {
						return _.get(skuStatus, [specName, specValue, 'highestPricePrimary']);
					}));
					statistics.highestPricePrimary = _.max([highestPricePrimaryOfSelected, statistics.highestPricePrimary]);
				}
			});
		}

		// validSkusIdx: 所有 selected valid sku 的交集
		statistics.validSkusIdx = _.intersection(..._.values(validSkusIdx));
		statistics.targetedAmount = targetedAmount;
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
