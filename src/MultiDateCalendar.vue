<template>
	<div class="container">
		<h1>Multi Date</h1>
		<button @click="dateRange = { startDate: '2019/10/03', endDate: '2019/10/05' }">2019/10/03 - 2019/10/05</button>
		<button @click="dateRange = { startDate: '2019/10/08', endDate: '2019/10/10' }">2019/10/08 - 2019/10/10</button>
		<Calendar
			v-model="dateRange"
			:start-week-day="1"
			:is-multiple-date="true"
			:min-span="2"
			:max-span="5"
			:check-is-valid="checkIsDateValid"
			>
		</Calendar>
		<p v-if="dateRange">
			{{ dateRange.startDate }} - {{ dateRange.endDate }} selected.
			<button @click="dateRange = null">X</button>
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
			dateRange: null,
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
