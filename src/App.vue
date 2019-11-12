<template>
	<div id="app">
		<a
			v-for="component in components"
			:class="{ active: activeComponent === component }"
			class="component-tab"
			@click="activeComponent = component">
			{{ component }}
		</a>
		<component v-if="activeComponent" :is="activeComponent"></component>
	</div>
</template>

<script>
import SingleDateCalendar from './SingleDateCalendar.vue';
import MultiDateCalendar from './MultiDateCalendar.vue';
import SingleDateProduct from './SingleDateProduct.vue';
export default {
	components: {
		SingleDateCalendar,
		MultiDateCalendar,
		SingleDateProduct,
	},
	data() {
		return {
			activeComponent: 'SingleDateProduct',
			components: ['SingleDateCalendar', 'MultiDateCalendar', 'SingleDateProduct'],
		};
	},
}
</script>

<style>
	* {
		box-sizing: border-box;
	}
	.container {
		max-width: 1170px;
		margin: 0 auto;
		padding: 40px 15px;
		position: relative;
	}
	.row {
		margin-left: -15px;
		margin-right: -15px;
	}
	.row:before, .row:after {
		display: table;
		content: " ";
	}
	.col-md-6 {
		padding-left: 15px;
		padding-right: 15px;
		width: 50%;
		float: left;
	}
	@media (max-width: 1024px) {
		.col-md-6 {
			width: 100%;
		}
	}
	.link {
		color: #138184;
		font-size: 18px;
		text-decoration: none;
		position: absolute;
		top: 70px;
		right: 15px;
		cursor: pointer;
	}
	.component-tab {
		cursor: pointer;
		color: #333333;
		display: inline-block;
		padding: 10px 20px;
		margin: 0px 5px;
		background-color: #EEEEEE;
		border-radius: 4px;
	}
	.component-tab.active {
		color: #FFFFFF;
		background-color: #26bdc9;
	}

	.calendar .price {
		font-size: 12px;
		color: #666666;
	}
	.calendar .selected.selected-start .price,
	.calendar .selected.selected-end .price {
		color: #FFFFFF;
	}
	.calendar .disabled .price {
		font-size: 12px;
		color: #AAAAAA;
	}
</style>
