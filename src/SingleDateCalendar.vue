<template>
	<div class="container">
		<h1>Single Date</h1>
		<button @click="singleDate = '2019/09/01'">2019/09/01</button>
		<button @click="singleDate = '2019/09/04'">2019/09/04</button>
		<Calendar
			v-model="singleDate"
			ref="calendar"
			:start-week-day="1"
			min-date="2019-08-02"
			max-date="2019-12-05"
			:check-is-valid="checkIsDateValid">
		</Calendar>
		<p v-if="singleDate">
			{{ singleDate }} selected.
			<button @click="singleDate = null">X</button>
			<br>
			<button @click="$refs.calendar.showStartDateMonth">Show selected month</button>
		</p>
	</div>
</template>

<script>
import moment from 'moment';
import _ from 'lodash';
import Calendar from './Calendar.vue';
export default {
	components: {
		Calendar,
	},
	data() {
		return {
			singleDate: null,
		};
	},
	methods: {
		checkIsDateValid(dateObj) {
			if(!moment.isMoment(dateObj)) {
				return false;
			}

			return dateObj.day() !== 3;
		},
	},
}
</script>

<style scoped>

</style>
