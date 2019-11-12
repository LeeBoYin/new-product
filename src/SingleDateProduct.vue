<template>
	<div class="container">
		<h1>Single Date Product</h1>
		<a @click="resetAll" class="link">重選</a>
		<div class="row">
			<div v-if="specs.date" class="col-md-6">
				<Calendar
					v-model="selectedSpec.date"
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
							:title="getSpecHint(name, value)"
							:key="'spec-name-' + value"
							:class="{ selected: selectedSpec[name] === value, disabled: !checkIsSpecSelectable(name, value) }"
							class="spec-value" @click="onClickSpec(name, value)">
							<div>{{ value }}</div>
						</div>
					</template>
					<template v-else>
						<div
							v-for="value in values"
							:key="'spec-name-' + value">
							<label>
								{{ value }} ${{ specStatus[name][value].lowestPrice }} ~ ${{ specStatus[name][value].highestPrice }}
								<input class="amount-input" type="number" v-model="amount[value]" min="0" :max="specStatus[name][value].maxAmount" />
								<sub>(max: {{ specStatus[name][value].maxAmount }})</sub>
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
		<div>Roughly {{ statistics.loopCount }} loops.</div>

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
	isValid(spec) {
		return spec.depart !== spec.arrive;
	},
	getAmount(spec) {
		return _.random(0, 5);
	},
	getPrice(spec) {
		let price;
		switch (spec.age) {
			case '成人': price = 100; break;
			case '學生': price = 80; break;
			case '老人': price = 50; break;
			case '兒童': price = 30; break;
		}

		// price is proportional to distance from depart to arrive
		price = price * Math.abs(specs.arrive.indexOf(spec.arrive) - specs.depart.indexOf(spec.depart));

		// double price on weekends
		if(_.includes([6, 0], moment(spec.date).day())) {
			price = price * 2;
		}

		// add some random number
		price += _.random(0, 20) * 5;

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

export default {
	components: {
		Calendar,
	},
	data() {
		return {
			specs: specs,
			skus: skus,
			selectedSpec: {},
			specStatus: skuCalculator.specStatus,
			statistics: skuCalculator.statistics,
			multiSpec: 'age',
			amount: null,
		};
	},
	computed: {
		isMultiSku() {
			return _.includes(_.keys(this.specs), this.multiSpec);
		},
		selectionArray() {
			let selectionArray = [];
			if(this.isMultiSku) {
				_.forEach(this.specs[this.multiSpec], (specValue) => {
					const amount = +_.get(this.amount, specValue, 0);
					if(amount === 0) {
						return;
					}
					const spec = _.clone(this.selectedSpec);
					spec[this.multiSpec] = specValue;
					selectionArray.push({
						spec,
						amount,
					});
				});

				if(selectionArray.length === 0) {
					selectionArray.push({
						spec: _.clone(this.selectedSpec),
						amount: 0,
					});
				}

				// filter duplicate combination
				selectionArray = _.uniqBy(selectionArray, (selection) => {
					return JSON.stringify(selection.spec);
				});
			} else {
				// 選擇至少一個規格
				if(!_.every(this.selectedSpec, _.isNil)) {
					selectionArray.push({
						spec: _.clone(this.selectedSpec),
						amount: +this.amount,
					});
				}
			}

			// 只留下有選 spec 的
			selectionArray = _.filter(selectionArray, (selection) => {
				return selection.amount > 0 || _.some(selection.spec, (value) => {
					return !_.isNil(value);
				});
			});

			return selectionArray;
		},
	},
	watch: {
		selectionArray() {
			skuCalculator.setSelectionArray(this.selectionArray);
			this.specStatus = _.cloneDeep(skuCalculator.specStatus);
			this.statistics = _.cloneDeep(skuCalculator.statistics);
		},
	},
	created() {
		this.resetAll();
	},
	methods: {
		checkIsDateValid(dateObj) {
			if(!moment.isMoment(dateObj)) {
				return false;
			}

			return this.checkIsSpecSelectable('date', dateObj.format('YYYY-MM-DD'));
		},
		checkIsSpecSelectable(specName, specValue) {
			return _.get(this.specStatus, [specName, specValue, 'selectable'], false) && !_.get(this.specStatus, [specName, specValue, 'insufficient'], false);
		},
		getPriceInfo(dateObj) {
			if(!moment.isMoment(dateObj)) {
				return false;
			}
			let text;
			if(this.checkIsDateValid(dateObj)) {
				const lowestPrice = _.get(this.specStatus, ['date', dateObj.format('YYYY-MM-DD'), 'lowestPricePrimary']) || _.get(this.specStatus, ['date', dateObj.format('YYYY-MM-DD'), 'lowestPrice']);
				const highestPrice = _.get(this.specStatus, ['date', dateObj.format('YYYY-MM-DD'), 'highestPricePrimary']) || _.get(this.specStatus, ['date', dateObj.format('YYYY-MM-DD'), 'highestPrice']);
				text = `$${ lowestPrice }` + (lowestPrice < highestPrice ? '起' : '');
			} else {
				text = '-';
			}
			return {
				text: text,
				class: 'price',
			};
		},
		getSpecHint(specName, specValue) {
			if(!_.get(this.specStatus, [specName, specValue, 'selectable'])) {
				return '組合不存在';
			} else if(_.get(this.specStatus, [specName, specValue, 'insufficient'])) {
				return '庫存不足';
			}

			return null;
		},
		onClickSpec(name, value) {
			if(!this.checkIsSpecSelectable(name, value)) {
				return;
			}

			if (this.selectedSpec[name] === value) {
				this.selectedSpec[name] = null;
			} else {
				this.selectedSpec[name] = value;
			}
		},
		onDateChange(date) {
			this.selectedSpec['date'] = date;
		},
		resetAll() {
			this.selectedSpec = {};

			// init selected
			_.forEach(this.specs, (values, name) => {
				if(this.isMultiSku && name === this.multiSpec) {
					return;
				}
				Vue.set(this.selectedSpec, name, null);
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
