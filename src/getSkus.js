import moment from 'moment';

const date = [];
const dateCursor = moment();
for (let i = 0; i < 90; i++) {
	if([0, 1, 2, 3, 4, 5, 6].indexOf(dateCursor.day()) !== -1) {
		date.push(dateCursor.format('YYYY-MM-DD'));
	}
	dateCursor.add(1, 'd');
}

const time = [
	'09:00',
	'10:00',
	'11:00',
	'12:00',
	'13:00',
	'14:00',
	'15:00',
	'16:00',
	'17:00',
	'18:00',
];

function getSkuCombos(_specs, _prefix = {}) {
	const types = _.keys(_specs);
	if (!types.length) {
		return _prefix;
	}

	const firstType = types[0];
	const firstSpec = _specs[firstType];

	let skuCombos = [];
	_.forEach(firstSpec, (value) => {
		const otherSecs = _.cloneDeep(_specs);
		delete otherSecs[firstType];
		skuCombos = _.concat(skuCombos, getSkuCombos(otherSecs, _.assign({[firstType]: value}, _prefix)));
	});
	return skuCombos;
}

function getPriceByEventTime(date, time) {
	const d = new Date(date + ' ' + time);
	return (d.getTime() / 3600000 % 9 + 2) * 5;
}

function getRandomPrice() {
	return _.random(1, 10) * 10;
}

function getRandomAmount() {
	return _.random(1, 100) === 1 ? _.random(1, 5) : 0;
}

function getSkus(specs, options) {
	options = options || {};
	if(options.hasDate) {
		specs.date = date;
	}
	if(options.hasTime) {
		specs.time = time;
	}

	const skuCombos = getSkuCombos(specs);
	const skus = [];
	_.forEach(skuCombos, (combo) => {
		if(options.isValid && !options.isValid(combo)) {
			return;
		}
		skus.push({
			spec: combo,
			amount: options.getAmount ? options.getAmount(combo) : getRandomAmount(),
			price: options.getPrice ? options.getPrice(combo) : getRandomPrice(),
		});
	});

	return skus;
}

export default getSkus;
