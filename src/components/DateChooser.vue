<template>
	<div class="datechooser">
        <div class="datechooser-nav">
            <label>{{label}}:</label>
            <input :value="output" placeholder="YYYY-MM-DD" @input="selected = $event.target.value /* don't pass to `output` directly - check validity in `selected` setter!*/">
            <button @click="selected = null /* don't pass to `output` directly - needs to be emitted in `selected` setter! */">X</button>
        </div>

        <div v-show="view == 'years'">
            <div class="datechooser-nav">
                <button @click="viewed.subtract(10, 'years'); update();">&lt;</button>
                <strong>{{viewedYears[0]}} &ndash; {{viewedYears[9]}}</strong>
                <button @click="viewed = viewed.add(10, 'years'); update();">&gt;</button>
            </div>
            <ol>
                <li v-for="year in viewedYears" :key="year" @click="viewed.year(year); view = 'months'; update();">{{year}}</li>
            </ol>
        </div>

        <div v-show="view == 'months'">
            <div class="datechooser-nav">
                <button @click="viewed.subtract(1, 'year'); update();">&lt;</button>
                <strong @click="view = 'years'">{{viewed.format('YYYY')}}</strong>
                <button @click="viewed = viewed.add(1, 'year'); update();">&gt;</button>
            </div>
            <ol>
                <li v-for="month in months" :key="month" @click="viewed.month(month); view = 'days'; update();">{{month}}</li>
            </ol>
        </div>

        <div v-show="view == 'days'">
            <div class="datechooser-nav">
                <button @click="viewed.subtract(1, 'month'); update();">&lt;</button>
                <strong @click="view = 'months'">{{viewed.format('MMMM YYYY')}}</strong>
                <button @click="viewed = viewed.add(1, 'month'); update();">&gt;</button>
            </div>
            <table>
                <tr>
                    <th v-for="day in weekdays" :key="day">{{day}}</th>
                </tr>
                <tr v-for="week in viewedWeeks" :key="week[0].format('MM-DD')">
                    <td v-for="day in week" :key="day.format('MM-DD')"
                        @click="selected = day.format('YYYY-MM-DD'); update();"
                        :class="{'not-in-current-month': day.month() != viewed.month(), 'selected': day.format('YYYY-MM-DD') == output}">
                        {{day.date()}}
                    </td>
                </tr>
            </table>
        </div>
	</div>
</template>

<script>
import * as moment from 'moment';

export default {
	name: 'DateChooser',
    props: ['value', 'label'],
    data() {
        return {
            view: 'days',
            viewed: moment(this.value || undefined),  // pass `undefined` if value is null
            output: this.value,
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            forceRecomputeCounter: 0  // see `update()` method below
        }
    },
    computed: {
        selected: {
            get: function() {
                return this.output;  // `selected` essentially mirrors `output`, but makes sure only valid values are stored in it
            },
            set: function(newVal) {
                // if reset to "no date" or valid date in YYYY-MM-DD format (28-31 days tolerated for any month)
                if(newVal === null || newVal.match(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|(1|2)[0-9]|30|31)$/)) {
                    // store valid value in `output`
                    this.output = newVal;
                    // enable use of `v-model` directive
                    this.$emit('input', this.output);
                    // refresh `viewed` (neccessary when input came from parsing the input field)
                    if(newVal != null) {  // but leave `viewed` as it was when the date is reset
                        this.viewed = moment(newVal);
                    }
                }
            }
        },
        viewedWeeks: function() {
            this.forceRecomputeCounter;  // "use" data to make refresh work, see below
            return new Array(6)
                .fill('dummy')  // `map` doesn't work when the slots are empty
                // `clone()` to avoid mutating the original `viewed`; use `isoWeek` so it's always a Monday (`week` is locale-dependent)
                .map((c, index) => this.viewed.clone().startOf('month').subtract(1,'day').startOf('isoWeek').add(index,'weeks'))
                .map((weekStartDay, i) => new Array(7).fill('dummy').map((c,index) => weekStartDay.clone().add(index,'days')))
        },
        viewedYears: function() {
            this.forceRecomputeCounter;  // "use" data to make refresh work, see below
            return new Array(10).fill('dummy').map((c,index) => (this.viewed.year()+'').substr(0,3) + index);
        }
    },
    methods: {
        update() {
            // hack to refresh computed properties, see https://github.com/vuejs/vue/issues/214#issuecomment-400591973
            this.forceRecomputeCounter++;
        }
    }
}
</script>

<style scoped>
    div.datechooser {
        width: 300px;
    }
    td, strong, li {
        cursor: pointer;
        padding: 5px;
        border: 1px solid transparent;
    }
    td:hover, strong:hover, li:hover {
        border: 1px solid black;
    }
    div.datechooser-nav {
        display: flex;
        align-items: center;
    }
    div.datechooser-nav strong,
    div.datechooser-nav input {
        flex: 1;
        text-align: center;
    }
    input {
        /* to make flex-shrink work, see https://stackoverflow.com/a/42421490/3746543 */
        min-width: 0;
    }
    label {
        margin-right: 5px;
    }
	ol {
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
    }
    li {
        list-style: none;
        width: 25%;
        padding: 10px;
        text-align: center;
    }
    table {
        width: 100%;
        text-align: center;
        table-layout: fixed;
    }
    td.not-in-current-month {
        color: lightgray;
    }
    td.selected {
        background-color: darkgray;
    }
</style>
