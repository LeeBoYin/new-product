<template>
	<div class="calendar">
		<div class="header">
			<div :class="{ disabled: isOnMinMonth }" class="change-month prev-month" @click="prevMonth">
				<i class="fa fa-angle-left"></i>
			</div>
			<div :class="{ disabled: isOnMaxMonth }" class="change-month next-month" @click="nextMonth">
				<i class="fa fa-angle-right"></i>
			</div>
			<div class="current-month">
				{{ currentMonthText }}
			</div>
		</div>
		<table class="date-table">
			<thead>
			<tr class="row-day">
				<th v-for="day in days" class="cell-day">{{ day }}</th>
			</tr>
			</thead>
			<tbody>
			<tr v-for="row in dates" class="row-date">
				<td
					v-for="dateObj in row"
					:class="dateObj && getCellClass(dateObj)"
					class="cell-date"
					@click="onDateClick(dateObj)"
					@mouseenter="onDateMouseEnter(dateObj)"
					@mouseleave="onDateMouseLeave(dateObj)">
					<template v-if="dateObj">
						<div class="date-num">
							{{ dateObj.date() }}
						</div>
						<div v-if="datesInfo" :class="datesInfo[dateObj.date()].class">{{ datesInfo[dateObj.date()].text }}</div>
						<div v-if="dateObj.isSame(hoveringDateObj, 'day') && hint" class="selecting-hint">{{ hint }}</div>
					</template>
				</td>
			</tr>
			</tbody>
		</table>
	</div>
</template>

<script>
import moment from 'moment';
import _ from 'lodash';
import '@fortawesome/fontawesome-free/js/fontawesome';
import '@fortawesome/fontawesome-free/js/solid';
import '@fortawesome/fontawesome-free/js/regular';
import '@fortawesome/fontawesome-free/js/brands';

const ERROR_CODES = {
	BELOW_MIN: 1,
	ABOVE_MAX: 2,
	HAS_INVALID: 3,
};

export default {
	props: {
		value: {
			type: [String, Object],
			default: null,
		},
		startWeekDay: {
			type: Number,
			default: 0,
		},
		dateFormat: {
			type: String,
			default: 'YYYY/MM/DD',
		},
		isMultipleDate: {
			type: Boolean,
			default: false,
		},
		minDate: {
			type: String,
			default: null,
		},
		maxDate: {
			type: String,
			default: null,
		},
		minSpan: {
			type: Number,
			default: null,
		},
		maxSpan: {
			type: Number,
			default: null,
		},
		checkIsValid: {
			type: Function,
			default: null,
		},
		getInfo: {
			type: Function,
			default: null,
		},
	},
	data() {
		return {
			displayMoment: moment(),
			startDateObj: null,
			endDateObj: null,
			hoveringDateObj: null,
			errorCode: null,
		};
	},
	computed: {
		days() {
			return _.times(7).map((d) => {
				return moment().day(this.startWeekDay + d).format('dd');
			});
		},
		dates() {
			const dateArray = [];
			const dateObjCursor = this.displayMoment.clone();
			let dayCursor = this.startWeekDay;
			let dateCursor = 1;
			let weekCursor = 0;

			while(dateCursor <= this.displayMoment.daysInMonth()) {
				dateObjCursor.date(dateCursor);
				// create new date row
				if(dateArray.length === weekCursor) {
					dateArray.push([]);
				}

				if(dateObjCursor.day() === dayCursor) {
					dateArray[weekCursor].push(dateObjCursor.clone());
					dateCursor++;
				} else {
					dateArray[weekCursor].push(null);
				}

				dayCursor = (dayCursor + 1) % 7;
				if(dateArray[weekCursor].length === 7) {
					weekCursor++;
				}
			}

			return dateArray;
		},
		datesInfo() {
			if(!_.isFunction(this.getInfo)) {
				return null;
			}
			return _.reduce(_.times(this.displayMoment.daysInMonth()), (result, value) => {
				const dateObj = this.displayMoment.clone().date(value + 1);
				result[value + 1] = this.getInfo(dateObj);
				return result;
			}, {});
		},
		currentMonthText() {
			// TODO locale
			return this.displayMoment.format('YYYY 年 M 月');
		},
		isSelecting() {
			return !!(this.isMultipleDate && this.startDateObj && !this.endDateObj);
		},
		isSelected() {
			return !!(this.startDateObj && this.endDateObj);
		},
		emitValue() {
			if (!this.isSelected) {
				return null;
			}
			if(this.isMultipleDate) {
				return {
					startDate: this.startDateObj.format(this.dateFormat),
					endDate: this.endDateObj.format(this.dateFormat),
				};
			} else {
				return this.startDateObj.format(this.dateFormat);
			}
		},
		hint() {
			if(!this.isSelecting) {
				return null;
			}

			switch (this.errorCode) {
				// TODO locale
				case ERROR_CODES.BELOW_MIN:
					return `最少 ${ this.minSpan } 天`;
				case ERROR_CODES.ABOVE_MAX:
					return `最多 ${ this.maxSpan } 天`;
				case ERROR_CODES.HAS_INVALID:
					return '包含無法選擇的日期';
				default:
					// return '請選擇結束日期';
					return null;
			}
		},
		isOnMinMonth() {
			return !!(this.minDate && this.displayMoment.isSameOrBefore(moment(this.minDate, this.dateFormat), 'month'));
		},
		isOnMaxMonth() {
			return !!(this.maxDate && this.displayMoment.isSameOrAfter(moment(this.maxDate, this.dateFormat), 'month'));
		},
	},
	watch: {
		emitValue() {
			this.$emit('input', this.emitValue);
		},
		value(value) {
			// set date from value props
			if(this.isMultipleDate) {
				const startDate = _.get(value, 'startDate');
				const endDate =_.get(value, 'endDate') ;
				if(startDate === _.get(this.emitValue, 'startDate') && endDate === _.get(this.emitValue, 'endDate')) {
					return;
				}
				if(startDate && endDate) {
					const startDateObj = moment(startDate, this.dateFormat);
					const endDateObj = moment(endDate, this.dateFormat);
					this.setSelectedDates(startDateObj, endDateObj);
				} else {
					this.setSelectedDates(null);
				}
			} else {
				if(value === this.emitValue) {
					return;
				}
				if(value) {
					const dateObj = moment(value, this.dateFormat);
					this.setSelectedDates(dateObj);
				} else {
					this.setSelectedDates(null);
				}
			}
			this.$emit('input', this.emitValue);
		},
		startDateObj() {
			if(this.isSelecting) {
				this.checkRangeValid(this.startDateObj, this.hoveringDateObj);
			}
		},
		hoveringDateObj() {
			if(this.isSelecting) {
				this.checkRangeValid(this.startDateObj, this.hoveringDateObj);
			}
		},
	},
	methods: {
		prevMonth() {
			if(this.isOnMinMonth) {
				return;
			}
			this.displayMoment = this.displayMoment.subtract(1, 'M').clone();
		},
		nextMonth() {
			if(this.isOnMaxMonth) {
				return;
			}
			this.displayMoment = this.displayMoment.add(1, 'M').clone();
		},
		showStartDateMonth() {
			if(!this.startDateObj) {
				return;
			}
			this.displayMoment = this.startDateObj.clone();
		},
		onDateClick(dateObj) {
			if(!this.checkSelectable(dateObj)) {
				return;
			}

			if(this.isMultipleDate) {
				if(this.isSelected || !this.startDateObj || dateObj.isBefore(this.startDateObj, 'day')) {
					// set startDate
					this.setSelectedDates(dateObj, null);
				} else {
					// complete range
					this.setSelectedDates(this.startDateObj, dateObj);
				}
			} else { // single date
				if(this.isSelected && dateObj.isSame(this.startDateObj, 'day')) {
					// clear
					this.setSelectedDates(null, null);
				} else {
					// set date
					this.setSelectedDates(dateObj, dateObj);
				}
			}
		},
		onDateMouseEnter(dateObj) {
			if(this.isSelecting) {
				this.hoveringDateObj = dateObj;
			}
		},
		onDateMouseLeave(dateObj) {
			if(this.isSelecting) {
				this.hoveringDateObj = null;
			}
		},
		setSelectedDates(startDateObj, endDateObj) {
			// reset
			this.startDateObj = this.endDateObj = null;
			if(!startDateObj) {
				return;
			}
			if(!this.isMultipleDate) {
				endDateObj = startDateObj.clone();
			}
			if(startDateObj && !endDateObj && this.checkSelectable(startDateObj)) {
				this.startDateObj = startDateObj;
			} else if(startDateObj && endDateObj && this.checkRangeValid(startDateObj, endDateObj)) {
				this.startDateObj = startDateObj;
				this.endDateObj = endDateObj;
			}
		},
		checkSelectable(dateObj) {
			if(!dateObj) {
				return false;
			}
			if(this.minDate && dateObj.isBefore(moment(this.minDate, this.dateFormat))) {
				return false;
			}
			if(this.maxDate && dateObj.isAfter(moment(this.maxDate, this.dateFormat))) {
				return false;
			}
			if(_.isFunction(this.checkIsValid)) {
				return !!this.checkIsValid(dateObj);
			}
			return true;
		},
		checkRangeValid(startDateObj, endDateObj) {
			this.errorCode = null;
			if(!startDateObj || !endDateObj) {
				return false;
			}
			if(startDateObj.isAfter(endDateObj, 'day')) {
				return false;
			}

			const dateObjCursor = startDateObj.clone();
			while(dateObjCursor && dateObjCursor.isSameOrBefore(endDateObj, 'day')) {
				if(!this.checkSelectable(dateObjCursor)) {
					this.errorCode = ERROR_CODES.HAS_INVALID;
					return false;
				}
				dateObjCursor.add(1, 'd');
			}

			const span = endDateObj.diff(startDateObj, 'days') + 1;
			if(this.minSpan > 0 && this.minSpan > span) {
				this.errorCode = ERROR_CODES.BELOW_MIN;
				return false;
			}
			if(this.maxSpan > 0 && this.maxSpan < span) {
				this.errorCode = ERROR_CODES.ABOVE_MAX;
				return false;
			}

			return true;
		},
		getCellClass(dateObj) {
			if(!dateObj) {
				return ['empty'];
			}

			const classList = [];

			// selectable, disabled
			if(this.checkSelectable(dateObj)) {
				classList.push('selectable');
			} else {
				classList.push('disabled');
			}

			// selected
			if(dateObj.isSame(this.startDateObj, 'day') || dateObj.isSameOrAfter(this.startDateObj, 'day') && dateObj.isSameOrBefore(this.endDateObj, 'day')) {
				classList.push('selected');
			}

			// selected-start
			if(dateObj.isSame(this.startDateObj, 'day')) {
				classList.push('selected-start');
			}

			// selected-end
			if(dateObj.isSame(this.endDateObj, 'day')) {
				classList.push('selected-end');
			}

			// selecting
			if(this.isSelecting && this.hoveringDateObj && dateObj.isSameOrAfter(this.startDateObj, 'day') && dateObj.isSameOrBefore(this.hoveringDateObj, 'day')) {
				classList.push('selecting');
				if(this.errorCode) {
					classList.push('invalid');
				}
			}

			return classList;
		},
	},
	mounted() {
		// cancel selecting when click outside of calendar
		document.addEventListener('click', event => {
			if (!this.$el.contains(event.target)) {
				if(this.isSelecting) {
					this.setSelectedDates(null, null);
				}
			}
		});
	},
}
</script>

<style scoped>
.calendar {
	background-color: #FFF;
	border: 1px solid #DDD;
	border-radius: 4px;
	max-width: 600px;
}

.header {
	text-align: center;
	background-color: #EEEEEE;
	border-bottom: 1px solid #DDDDDD;
}
.header > * {
	padding: 10px;
}
.change-month {
	color: #333;
	cursor: pointer;
	font-size: 22px;
	user-select: none;
}
.change-month.disabled {
	color: #AAA;
	cursor: default;
}
.prev-month {
	float: left;
}
.next-month {
	float: right;
}
.current-month {
	overflow: hidden;
	font-weight: bold;
}
.date-table {
	width: 100%;
	border-spacing: 0;
	table-layout: fixed;
}
.cell-day {
	color: #666666;
	border-bottom: 1px solid #DDDDDD;
	background-color: #F8F8F8;
	padding: 5px 0;
}
.cell-date {
	position: relative;
	padding: 10px 0;
	text-align: center;
}
.cell-date.selectable {
	cursor: pointer;
}
.cell-date.selectable:hover {
	background-color: #F8F8F8;
}
.cell-date.selected,
.cell-date.selecting,
.cell-date.selected:hover,
.cell-date.selecting:hover{
	background-color: #dbfafc;
}
.cell-date.selected.selected-start,
.cell-date.selected.selected-end {
	color: #FFFFFF;
	background-color: #26bdc9;
}
.cell-date.selected.selected-start {
	border-top-left-radius: 8px;
	border-bottom-left-radius: 8px;
}
.cell-date.selected.selected-end {
	border-top-right-radius: 8px;
	border-bottom-right-radius: 8px;
	position: relative;
}
.cell-date.selected.selected-end:after {
	content: '';
	position: absolute;
	top: 6px;
	right: 6px;
	border-width: 5px;
	border-style: solid;
	border-color: #fff #fff transparent transparent;
}
.cell-date.selecting.invalid {
	background-color: #EEEEEE;
	cursor: default;
}
.cell-date.selecting.invalid.selected-start {
	background-color: #666666;
}

.date-num {
	font-size: 16px;
	font-weight: bold;
}
.selecting-hint {
	position: absolute;
	color: #FFFFFF;
	font-size: 12px;
	padding: 5px 10px;
	background-color: #666666;
	border-radius: 4px;
	box-shadow: 0px 3px 5px 0px rgba(0, 0, 0, 0.3);
	white-space: nowrap;
	top: -37px;
	left: 50%;
	transform: translateX(-50%);
}

.cell-date .selecting-hint:after {
	content: '';
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	border: 8px solid transparent;
	border-top-color: #666666;
}

/* disabled */
.cell-date.disabled {
	cursor: default;
	color: #AAAAAA;
	background-color: transparent !important;
}
.cell-date.disabled .date-num {
	text-decoration: line-through;
}
</style>
