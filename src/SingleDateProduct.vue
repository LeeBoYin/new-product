<template>
	<div class="container">
		<h1>Single Date Product</h1>
		<a @click="resetAll" class="link">重選</a>
		<div class="row">
			<div v-if="specs.date" class="col-md-6">
				<Calendar
					v-model="selected.date"
					@input="onDateChange"
					:start-week-day="1"
					:is-multiple-date="false"
					:check-is-valid="checkIsDateValid"
					:get-info="getPriceInfo"
					:date-format="'YYYY-MM-DD'">
				</Calendar>
			</div>
			<div class="col-md-6">
				<div v-for="(values, name) in specs" v-if="name !== 'date'" :key="'spec-row-' + name" class="spec-row">
					<div class="spec-name">{{ name }}</div>
					<template v-if="!isMultiSku || name !== multiSpec">
						<div
							v-for="value in values"
							:key="'spec-name-' + value"
							:class="{ selected: selected[name] === value, disabled: !skuStatus[name][value].selectable }"
							class="spec-value" @click="onClickSpec(name, value)">
							<div>{{ value }}</div>
						</div>
					</template>
					<template v-else>
						<div
							v-for="value in values"
							:key="'spec-name-' + value">
							<label>
								{{ value }} ${{ skuStatus[name][value].lowestPrice }} ~ ${{ skuStatus[name][value].highestPrice }}
								<input class="amount-input" type="number" v-model="amount[value]" min="0" :max="skuStatus[name][value].maxAmount" />
							</label>
						</div>
					</template>
				</div>
				<div v-if="!isMultiSku" class="spec-row">
					<div class="spec-name">Amount</div>
					<div>
						<input class="amount-input" type="number" v-model="amount" min="1" :max="statistics.maxAmount" />
					</div>
				</div>
			</div>
		</div>
		<div>There are {{ statistics.validSkusIdx.length }} units you can choose from.</div>
		<!--<ul v-if="false">-->
			<!--<li v-for="idx in validSkusIdx">{{ skus[idx] | skuDisplayText }}</li>-->
		<!--</ul>-->
	</div>
</template>

<script>
import Vue from 'vue';
import moment from 'moment';
import _ from 'lodash';
import Calendar from './Calendar.vue';
import specData from './specData.js';
import getSkus from './getSkus.js';
import SkuCalculator from './skuCalculator.js';

const specs = specData.THSR;
const skus = getSkus(specs, {
	hasDate: true,
	// hasTime: true,
	isValid(combo) {
		return combo.depart !== combo.arrive;
	},
	getAmount(combo) {
		return _.random(1, 5);
	},
	getPrice(combo) {
		let price;
		switch (combo.age) {
			case '成人': price = 100; break;
			case '兒童': price = 30; break;
			case '老人': price = 50; break;
		}

		price = price * Math.abs(specs.arrive.indexOf(combo.arrive) - specs.depart.indexOf(combo.depart));

		if(_.includes([6, 0], moment(combo.date).day())) {
			price = price * 2;
		}

		return price;
	},
});
console.log(skus);
console.log(JSON.stringify(skus));
const skuCalculator = new SkuCalculator({
	specs,
	skus,
	primarySpecs: {
		'age': '成人',
	},
	hasAmount: true,
	multiSpecs: ['age'],
});
window.ss = skuCalculator;

export default {
	components: {
		Calendar,
	},
	data() {
		return {
			specs: specs,
			skus: skus,
			selected: {},
			skuStatus: skuCalculator.skuStatus,
			statistics: skuCalculator.statistics,
			multiSpec: 'age',
			amount: null,
		};
	},
	computed: {
		isMultiSku() {
			return _.includes(_.keys(this.specs), this.multiSpec);
		},
		selectedArray() {
			let selectedArray = [];
			if(this.isMultiSku) {
				_.forEach(this.specs[this.multiSpec], (specValue) => {
					const amount = +_.get(this.amount, specValue, 0);
					if(amount === 0) {
						return;
					}
					const combo = _.clone(this.selected);
					combo[this.multiSpec] = specValue;
					selectedArray.push({
						combo,
						amount,
					});
				});

				if(selectedArray.length === 0) {
					selectedArray.push({
						combo: _.clone(this.selected),
						amount: 0,
					});
				}

				// filter duplicate combination
				selectedArray = _.uniqBy(selectedArray, (selected) => {
					return JSON.stringify(selected.combo);
				});
			} else {
				// 選擇至少一個規格
				if(!_.every(this.selected, _.isNil)) {
					selectedArray.push({
						combo: _.clone(this.selected),
						amount: +this.amount,
					});
				}
			}

			return selectedArray;
		},
	},
	watch: {
		selectedArray() {
			skuCalculator.setSelectedArray(this.selectedArray);
			this.skuStatus = _.cloneDeep(skuCalculator.skuStatus);
			this.statistics = _.cloneDeep(skuCalculator.statistics);
		},
	},
	created() {
		this.resetAll();
	},
	methods: {
		onClickSpec(name, value) {
			if (!this.skuStatus[name][value].selectable) {
				return;
			}

			if (this.selected[name] === value) {
				this.selected[name] = null;
			} else {
				this.selected[name] = value;
			}
		},
		onDateChange(date) {
			this.selected['date'] = date;
		},
		resetAll() {
			this.selected = {};

			// init selected
			_.forEach(this.specs, (values, name) => {
				if(this.isMultiSku && name === this.multiSpec) {
					return;
				}
				Vue.set(this.selected, name, null);
			});

			// init amount
			if(this.isMultiSku) {
				this.amount = {};
				_.forEach(this.specs[this.multiSpec], (value) => {
					Vue.set(this.amount, value, 0);
				});
			} else {
				this.amount = 1;
			}
		},
		checkIsDateValid(dateObj) {
			if(!moment.isMoment(dateObj)) {
				return false;
			}

			return !!_.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'selectable']);
		},
		getPriceInfo(dateObj) {
			if(!moment.isMoment(dateObj)) {
				return false;
			}
			const lowestPrice = _.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'lowestPricePrimary']) || _.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'lowestPrice']);
			const highestPrice = _.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'highestPricePrimary']) || _.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'highestPrice']);
			return {
				text: lowestPrice ? `$${ lowestPrice }` + (lowestPrice < highestPrice ? '起' : '') : '-',
				class: 'price',
			};
		},
	},
	mounted() {
		console.log('There are ' + this.skus.length + ' possible sku combinations');
	},
};
</script>

<style scoped>
.spec-row {
	margin-bottom: 5px;
}
.spec-name {
	font-size: 18px;
	margin-right: 10px;
	margin-bottom: 10px;
	color: #666;
}
.spec-value {
	display: inline-block;
	text-align: center;
	padding: 8px 16px;
	margin-right: 10px;
	margin-bottom: 15px;
	border: 1px solid #CCC;
	border-radius: 4px;
	cursor: pointer;
}
.spec-value.selected {
	position: relative;
	background-color: #26bec9;
	border-color: #26bec9;
	color: #fff;
}
.spec-value.selected:after {
	content: '';
	position: absolute;
	top: 3px;
	right: 3px;
	border-width: 5px;
	border-style: solid;
	border-color: #fff #fff transparent transparent;
}
.spec-value.disabled {
	border-color: #eee;
	cursor: default;
	color: #ccc;
}
.lowest-price {
	color: #666;
	font-size: 12px;
}
.spec-value.selected .lowest-price {
	color: #fff;
	opacity: 0.8;
}
.spec-value.disabled .lowest-price {
	color: #CCC;
}
.amount-input {
	height: 42px;
	width: 82px;
	padding: 8px 12px;
	border-radius: 4px;
	box-shadow: none;
	border: 1px solid #e1e1e1;
	font-size: 22px;
	text-align: center;
	outline: none;
	margin-left: 10px;
	margin-bottom: 10px;
}
.amount-input:focus {
	border-color: #26bec9;
}
</style>
