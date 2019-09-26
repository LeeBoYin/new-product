<template>
	<div class="container">
		<h1>Single Date Product</h1>
		<a @click="resetAll" class="link">重選</a>
		<div class="row">
			<div v-if="specs.date" class="col-md-6">
				<Calendar
					v-model="selected.combo.date"
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
					<!--<template v-if="name !== multiSpec">-->
						<div
							v-for="value in values"
							:key="'spec-name-' + value"
							:class="{ selected: selected.combo[name] === value, disabled: !skuStatus[name][value].selectable }"
							class="spec-value" @click="onClickSpec(name, value)">
							<div>{{ value }}</div>
							<div v-if="['date'].indexOf(name) !== -1" class="lowest-price">
								<template v-if="skuStatus[name][value].lowestPrice === null">-</template>
								<template v-else>from ${{ skuStatus[name][value].lowestPrice * selected.amount }}</template>
							</div>
						</div>
					<!--</template>-->
					<!--<template v-else>-->
						<!--<div-->
							<!--v-for="value in values"-->
							<!--:key="'spec-name-' + value">-->
							<!--<label>-->
								<!--{{ value }}-->
								<!--<input class="amount-input" type="number" min="0" :max="skuStatus[name][value].maxAmount" />-->
							<!--</label>-->
						<!--</div>-->
					<!--</template>-->
				</div>
				<div class="spec-row">
					<div class="spec-name">Amount</div>
					<div>
						<input class="amount-input" type="number" v-model="selected.amount" min="1" :max="statistics.maxAmount" />
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
		let a;
		switch (combo.age) {
			case '成人': a = 100; break;
			case '兒童': a = 30; break;
			case '老人': a = 50; break;
		}
		return a * Math.abs(specs.arrive.indexOf(combo.arrive) - specs.depart.indexOf(combo.depart));
	},
});

const skuCalculator = new SkuCalculator(specs, skus);
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
		};
	},
	watch: {
		selected: {
			deep: true,
			handler() {
				skuCalculator.setSelected(this.selected);
				this.skuStatus = _.cloneDeep(skuCalculator.skuStatus);
				this.statistics = _.cloneDeep(skuCalculator.statistics);
			}
		},
	},
	created() {
		this.selected = {
			combo: {},
			amount: 1,
		};
		_.forEach(this.specs, (values, name) => {
			Vue.set(this.selected.combo, name, null);
		});
	},
	methods: {
		onClickSpec(name, value) {
			if (!this.skuStatus[name][value].selectable) {
				return;
			}

			if (this.selected.combo[name] === value) {
				this.selected.combo[name] = null;
			} else {
				this.selected.combo[name] = value;
			}
		},
		onDateChange(date) {
			this.selected.combo['date'] = date;
		},
		resetAll() {
			_.forEach(this.selected.combo, (value, name) => {
				this.selected.combo[name] = null;
			});
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
			const price = _.get(this.skuStatus, ['date', dateObj.format('YYYY-MM-DD'), 'lowestPrice']);
			return {
				text: price ? `$${ price * this.selected.amount }` : '-',
				class: 'price',
			};
		},
	},
	mounted() {
		// console.log(JSON.stringify(this.skus));
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
