
; (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Make globaly available as well
        define(['moment', 'jquery'], function (moment, jquery) {
            if (!jquery.fn) jquery.fn = {}; // webpack server rendering
            if (typeof moment !== 'function' && moment.hasOwnProperty('default')) moment = moment['default']
            return factory(moment, jquery);
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node / Browserify
        //isomorphic issue
        var jQuery = (typeof window != 'undefined') ? window.jQuery : undefined;
        if (!jQuery) {
            jQuery = require('jquery');
            if (!jQuery.fn) jQuery.fn = {};
        }
        var moment = (typeof window != 'undefined' && typeof window.moment != 'undefined') ? window.moment : require('moment');
        module.exports = factory(moment, jQuery);
    } else {
        // Browser globals
        root.daterangepicker = factory(root.moment, root.jQuery);
    }
}(this, function (moment, $) {
    var DateRangePicker = function (element, options, cb) {
        this.parentEl = 'body';
        this.element = $(element);
        this.startDate = null//moment().startOf('day');
        this.minDate = false;
        this.maxDate = false;
        this.minYear = moment().subtract(100, 'year').format('YYYY');
        this.maxYear = moment().add(100, 'year').format('YYYY');
        this.timePicker = true;
        this.timePicker24Hour = true;
        this.timePickerIncrement = 1;
        this.linkedCalendars = true;

        this.opens = 'right';
        if (this.element.hasClass('pull-right'))
            this.opens = 'left';

        this.drops = 'down';
        if (this.element.hasClass('dropup'))
            this.drops = 'up';

        this.buttonClasses = 'btn btn-sm';
        this.applyButtonClasses = 'btn-primary';

        this.locale = {
            direction: 'ltr',
            separator: ' - ',
            applyLabel: '确定',
            cancelLabel: '选择时间',
            weekLabel: 'W',
            customRangeLabel: 'Custom Range',
            firstDay: moment.localeData().firstDayOfWeek(),
            monthNames: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
            daysOfWeek: ["日", "一", "二", "三", "四", "五", "六"],
            format: 'YYYY-MM-DD HH:mm',
        };

        this.callback = function () { };

        //some state information
        this.isShowing = false;
        this.Calendar = {};

        //custom options from user
        if (typeof options !== 'object' || options === null)
            options = {};

        //allow setting options with data attributes
        //data-api options will be overwritten with custom javascript options
        options = $.extend(this.element.data(), options);

        //html template for the picker UI
        if (typeof options.template !== 'string' && !(options.template instanceof $))
            options.template =
                '<div class="daterangepicker">' +
                '<div class="drp-calendar left">' +
                '<div class="calendar-table"></div>' +
                '<div class="calendar-time"></div>' +
                '</div>' +
                '</div>';

        this.parentEl = (options.parentEl && $(options.parentEl).length) ? $(options.parentEl) : $(this.parentEl);
        this.container = $(options.template).appendTo(this.parentEl);

        //
        // handle all the possible options overriding defaults
        //

        if (typeof options.locale === 'object') {

            if (typeof options.locale.direction === 'string')
                this.locale.direction = options.locale.direction;

            if (typeof options.locale.format === 'string')
                this.locale.format = options.locale.format;

            if (typeof options.locale.separator === 'string')
                this.locale.separator = options.locale.separator;

            if (typeof options.locale.daysOfWeek === 'object')
                this.locale.daysOfWeek = options.locale.daysOfWeek.slice();

            if (typeof options.locale.monthNames === 'object')
                this.locale.monthNames = options.locale.monthNames.slice();

            if (typeof options.locale.firstDay === 'number')
                this.locale.firstDay = options.locale.firstDay;

            if (typeof options.locale.applyLabel === 'string')
                this.locale.applyLabel = options.locale.applyLabel;

            if (typeof options.locale.cancelLabel === 'string')
                this.locale.cancelLabel = options.locale.cancelLabel;

            if (typeof options.locale.weekLabel === 'string')
                this.locale.weekLabel = options.locale.weekLabel;

            if (typeof options.locale.customRangeLabel === 'string') {
                //Support unicode chars in the custom range name.
                var elem = document.createElement('textarea');
                elem.innerHTML = options.locale.customRangeLabel;
                var rangeHtml = elem.value;
                this.locale.customRangeLabel = rangeHtml;
            }
        }
        this.container.addClass(this.locale.direction);

        if (typeof options.startDate === 'string')
            this.startDate = moment(options.startDate, this.locale.format);

        if (typeof options.minDate === 'string')
            this.minDate = moment(options.minDate, this.locale.format);

        if (typeof options.maxDate === 'string')
            this.maxDate = moment(options.maxDate, this.locale.format);

        if (typeof options.startDate === 'object')
            this.startDate = moment(options.startDate);

        if (typeof options.minDate === 'object')
            this.minDate = moment(options.minDate);

        if (typeof options.maxDate === 'object')
            this.maxDate = moment(options.maxDate);

        // sanity check for bad options
        if (this.minDate && this.startDate && this.startDate.isBefore(this.minDate))
            this.startDate = this.minDate.clone();

        if (typeof options.applyButtonClasses === 'string')
            this.applyButtonClasses = options.applyButtonClasses;

        if (typeof options.applyClass === 'string') //backwards compat
            this.applyButtonClasses = options.applyClass;

        if (typeof options.opens === 'string')
            this.opens = options.opens;

        if (typeof options.drops === 'string')
            this.drops = options.drops;

        if (typeof options.buttonClasses === 'string')
            this.buttonClasses = options.buttonClasses;

        if (typeof options.buttonClasses === 'object')
            this.buttonClasses = options.buttonClasses.join(' ');

        if (typeof options.minYear === 'number')
            this.minYear = options.minYear;

        if (typeof options.maxYear === 'number')
            this.maxYear = options.maxYear;

        if (typeof options.quickDatePicker === 'boolean')
            this.quickDatePicker = options.quickDatePicker;

        if (typeof options.timePicker === 'boolean')
            this.timePicker = options.timePicker;

        if (typeof options.timePicker24Hour === 'boolean')
            this.timePicker24Hour = options.timePicker24Hour;

        if (typeof options.isInvalidDate === 'function')
            this.isInvalidDate = options.isInvalidDate;

        // update day names order to firstDay
        if (this.locale.firstDay != 0) {
            var iterator = this.locale.firstDay;
            while (iterator > 0) {
                this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift());
                iterator--;
            }
        }

        var start, end;

        if (typeof options.startDate === 'undefined') {
            if ($(this.element).is(':text')) {
                var val = $(this.element).val(),
                    split = val.split(this.locale.separator);

                start = end = null;

                if (split.length == 2) {
                    start = moment(split[0], this.locale.format);
                    end = moment(split[1], this.locale.format);
                } else if (val !== "") {
                    start = moment(val, this.locale.format);
                    end = moment(val, this.locale.format);
                }
                if (start !== null && end !== null) {
                    this.startDate = start
                    this.updateView();
                }
            }
        }

        if (typeof cb === 'function') {
            this.callback = cb;
        }

        this.container.addClass('single');
        this.container.find('.drp-calendar.left').addClass('single');
        this.container.find('.drp-calendar.left').show();
        this.container.addClass('opens' + this.opens);

        this.container.find('.drp-calendar')
            .on('click.daterangepicker', '.drp-buttons button.applyBtn', $.proxy(this.clickApply, this))
            .on('click.daterangepicker', '.drp-buttons button.selectDateLink', $.proxy(this.updateView, this))
            .on('click.daterangepicker', '.drp-buttons button.selectTimeLink', $.proxy(this.clickTime, this))
            .on('click.daterangepicker', '.sub-card-title .left-sub-year.is-available', $.proxy(this.clickSubOneYear, this))
            .on('click.daterangepicker', '.sub-card-title .left-add-year.is-available', $.proxy(this.clickAddOneYear, this))
            .on('click.daterangepicker', '.sub-card-title .left-sub-year-range.is-available', $.proxy(this.clickSubRangeYear, this))
            .on('click.daterangepicker', '.sub-card-title .left-add-year-range.is-available', $.proxy(this.clickAddRangeYear, this))
            .on('click.daterangepicker', '.more-months-container .month-list .month-item', $.proxy(this.clickMonthItem, this))
            .on('click.daterangepicker', '.more-years-container .year-list .year-item', $.proxy(this.clickYearItem, this))
            .on('click.daterangepicker', '.current-month', $.proxy(this.clickMonth, this))
            .on('click.daterangepicker', '.current-year', $.proxy(this.clickYear, this))
            .on('click.daterangepicker', '.left-sub-month.prev.is-available', $.proxy(this.clickPrev, this, 1))
            .on('click.daterangepicker', '.left-add-month.next.is-available', $.proxy(this.clickNext, this, 1))
            .on('click.daterangepicker', '.left-sub-year.prev.is-available', $.proxy(this.clickPrev, this, 12))
            .on('click.daterangepicker', '.left-add-year.next.is-available', $.proxy(this.clickNext, this, 12))
            .on('mousedown.daterangepicker', '.table-condensed .td.is-available', $.proxy(this.clickDate, this))
            .on('change.daterangepicker', 'select.yearselect', $.proxy(this.monthOrYearChanged, this))
            .on('change.daterangepicker', 'select.monthselect', $.proxy(this.monthOrYearChanged, this))
            .on('click.daterangepicker', '.hour-list-container ul.hourselect li,.minute-list-container ul.minuteselect li,select.secondselect,select.ampmselect', $.proxy(this.timeChanged, this));

        if (this.element.is('input') || this.element.is('button')) {
            this.element.on({
                'click.daterangepicker': $.proxy(this.show, this),
                'focus.daterangepicker': $.proxy(this.show, this),
                'keyup.daterangepicker': $.proxy(this.elementChanged, this),
                'keydown.daterangepicker': $.proxy(this.keydown, this) //IE 11 compatibility
            });
        }

        //
        // if attached to a text input, set the initial value
        //
        if (this.startDate) {
            this.updateElement();
        }
    };

    DateRangePicker.prototype = {

        constructor: DateRangePicker,

        isInvalidDate: function () {
            return false;
        },

        updateView: function () {
            this.Calendar.month = this.startDate.clone().date(2);
            this.renderCalendar();
        },
        updateCalendars: function () {

            if (this.timePicker) {
                var hour, minute;
                hour = parseInt(this.container.find('.hourselect').val(), 10);
                minute = parseInt(this.container.find('.minuteselect').val(), 10);
                if (isNaN(minute)) {
                    minute = parseInt(this.container.find('.minuteselect option:last').val(), 10);
                }
                if (!this.timePicker24Hour) {
                    var ampm = this.container.find('.ampmselect').val();
                    if (ampm === 'PM' && hour < 12)
                        hour += 12;
                    if (ampm === 'AM' && hour === 12)
                        hour = 0;
                }
                this.Calendar.month.hour(hour).minute(minute);
            }

            this.renderCalendar();
        },

        renderMonthSection: function (currentMonth, currentYear) {
            let monthListHtml = `<ul class='month-list'>`;
            for (var m = 0; m < 12; m++) {
                if (this.maxDate && currentYear == this.maxDate.year() && m > this.maxDate.month()) {
                    monthListHtml += `<li class="month-item month-item-disabled  ">${this.locale.monthNames[m]}</li>`
                } else if (this.minDate && currentYear == this.minDate.year() && m < this.minDate.month()) {
                    monthListHtml += `<li class="month-item month-item-disabled  ">${this.locale.monthNames[m]}</li>`
                } else if (m == currentMonth && this.startDate && this.startDate.year() == currentYear) {
                    monthListHtml += `<li class='month-item month-item-selected '>${this.locale.monthNames[m]}</li>`;
                } else {
                    monthListHtml += `<li class='month-item '>${this.locale.monthNames[m]}</li>`;
                }
            }

            monthListHtml += "</ul>"
            return monthListHtml
        },

        renderYearSection: function (rangeStartYear, rangeEndYear) {
            let yearListHtml = `<ul class='year-list'>`;
            let currentYear = this.startDate.year()

            for (var y = rangeStartYear; y <= rangeEndYear; y++) {
                if (this.maxDate && y > this.maxDate.year()) {
                    yearListHtml += `<li class="year-item year-item-disabled  ">${y}</li>`
                } else if (this.minDate && y < this.minDate.year()) {
                    yearListHtml += `<li class="year-item year-item-disabled  ">${y}</li>`
                } else if (y === currentYear) {
                    yearListHtml += `<li class="year-item year-item-selected ">${y}</li>`;
                } else {
                    yearListHtml += `<li class="year-item ">${y}</li>`;
                }
            }


            yearListHtml += "</ul>"
            return yearListHtml
        },

        renderCalendar: function () {
            var calendar = this.Calendar;
            var month = calendar.month.month();
            var year = calendar.month.year();
            var hour = calendar.month.hour();
            var minute = calendar.month.minute();
            var second = calendar.month.second();
            var daysInMonth = moment([year, month]).daysInMonth();
            var firstDay = moment([year, month, 1]);
            var lastDay = moment([year, month, daysInMonth]);
            var lastMonth = moment(firstDay).subtract(1, 'month').month();
            var lastYear = moment(firstDay).subtract(1, 'month').year();
            var daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();
            var dayOfWeek = firstDay.day();

            var calendar = [];
            calendar.firstDay = firstDay;
            calendar.lastDay = lastDay;

            for (var i = 0; i < 6; i++) {
                calendar[i] = [];
            }

            var startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
            if (startDay > daysInLastMonth)
                startDay -= 7;

            if (dayOfWeek == this.locale.firstDay)
                startDay = daysInLastMonth - 6;

            var curDate = moment([lastYear, lastMonth, startDay, 12, minute, second]);

            var col, row;
            for (var i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add(24, 'hour')) {
                if (i > 0 && col % 7 === 0) {
                    col = 0;
                    row++;
                }
                calendar[row][col] = curDate.clone().hour(hour).minute(minute).second(second);
                curDate.hour(12);

                if (this.minDate && calendar[row][col].format('YYYY-MM-DD') == this.minDate.format('YYYY-MM-DD') && calendar[row][col].isBefore(this.minDate)) {
                    calendar[row][col] = this.minDate.clone();
                }

            }

            this.Calendar.calendar = calendar;
            var minDate = this.minDate;
            var maxDate = this.maxDate;
            let monthYearHtml = '', moreMonthHtml = '', moreYearHtml = '';
            var currentMonth = calendar[1][1].month();
            var currentYear = calendar[1][1].year();
            let monthHtml = ''
            let yearHtml = '';
            monthYearHtml = '<div class="month-yeart-select-container"><div class="sub-card-title"></div>';
            let preMonthIsValid = (!minDate || minDate.isBefore(calendar.firstDay, 'day')) ? 'is-available' : 'is-disbaled';
            let nextMonthIsValid = (!maxDate || maxDate.isAfter(calendar.lastDay, 'day')) ? 'is-available' : 'is-disbaled';
            let preYearIsValid = (!minDate || minDate.isBefore(calendar.firstDay, 'year')) ? 'is-available' : 'is-disbaled';
            let nextYearIsValid = (!maxDate || maxDate.isAfter(calendar.lastDay, 'year')) ? 'is-available' : 'is-disbaled';
            monthHtml += `<div class="letf-monthselect-container">
                                        <span class="left-sub-month prev ${preMonthIsValid}">
                                            <i class="fa fa-angle-left" aria-hidden="true"></i>
                                        </span>
                                        <div class="current-month">
                                        ${this.locale.monthNames[currentMonth]} <i class="fa fa-caret-down" aria-hidden="true"></i>
                                        </div>
                                        <span class="left-add-month next ${nextMonthIsValid}">
                                            <i class="fa fa-angle-right" aria-hidden="true"></i>
                                        </span>
                                    </div>`;
            yearHtml += `<div class="letf-yearselect-container">
                                    <span class="left-sub-year prev ${preYearIsValid}">
                                        <i class="fa fa-angle-left" aria-hidden="true"></i>
                                    </span>
                                    <div class="current-year">
                                        ${currentYear} <i class="fa fa-caret-down" aria-hidden="true"></i>
                                    </div>
                                    <span class="left-add-year next ${nextYearIsValid}">
                                        <i class="fa fa-angle-right" aria-hidden="true"></i>
                                    </span>
                                </div>`;
            monthYearHtml += monthHtml + yearHtml + '</div>';

            // show more months or years
            moreYearHtml = `<div class="more-years-container"></div>`;

            moreMonthHtml = `<div class='more-months-container'></div>`;


            let moreTimeHtml = `<div class='more-hour-minute-container'></div>`;

            let html = '<div class="calendar-table-container"><div class="table-condensed">';
            html += '<div class="week-header-container">';
            html += '<div class="week-header-content">';

            $.each(this.locale.daysOfWeek, function (index, dayOfWeek) {
                html += '<div class="th">' + dayOfWeek + '</div>';
            });

            html += '</div>';
            html += '</div>';
            html += '<div class="more-data-container">';

            for (var row = 0; row < 6; row++) {
                html += '<div class="date-row-container">';

                for (var col = 0; col < 7; col++) {

                    var classes = [];

                    //highlight today's date
                    if (calendar[row][col].isSame(new Date(), "day"))
                        classes.push('today');

                    //highlight weekends
                    if (calendar[row][col].isoWeekday() > 5)
                        classes.push('weekend');

                    //grey out the dates in other months displayed at beginning and end of this calendar
                    if (calendar[row][col].month() != calendar[1][1].month())
                        classes.push('off', 'ends');

                    //don't allow selection of dates before the minimum date
                    if (this.minDate && calendar[row][col].isBefore(this.minDate, 'day'))
                        classes.push('off', 'disabled');

                    //don't allow selection of dates after the maximum date
                    if (maxDate && calendar[row][col].isAfter(maxDate, 'day'))
                        classes.push('off', 'disabled');

                    //don't allow selection of date if a custom function decides it's invalid
                    if (this.isInvalidDate(calendar[row][col]))
                        classes.push('off', 'disabled');

                    //highlight the currently selected start date
                    if (calendar[row][col].format('YYYY-MM-DD') == this.startDate.format('YYYY-MM-DD'))
                        classes.push('active', 'start-date');

                    var cname = '', disabled = false;
                    for (var i = 0; i < classes.length; i++) {
                        cname += classes[i] + ' ';
                        if (classes[i] == 'disabled')
                            disabled = true;
                    }
                    if (!disabled)
                        cname += 'is-available';

                    html += '<div class="date-item td ' + cname.replace(/^\s+|\s+$/g, '') + '" data-title="' + 'r' + row + 'c' + col + '">' + calendar[row][col].date() + '</div>';

                }
                html += '</div>';
            }

            html += '</div>';
            html += '</div></div>';

            let drpButtonHtml = '<div class="drp-buttons">' +
                '<span class="drp-selected"></span>' +
                '<button class="selectTimeLink btn btn-link" type="link">选择时间</button>' +
                '<button class="selectDateLink btn btn-link" type="link">选择日期</button>' +
                '<button class="applyBtn btn btn-primary" type="button">确定</button> ' +
                '</div>'

            this.container.find('.drp-calendar .calendar-table').html(monthYearHtml + moreMonthHtml + moreYearHtml + moreTimeHtml + html + drpButtonHtml);
            if (!this.timePicker) {
                this.container.find('.selectTimeLink').css({ 'display': 'none' });
            }
        },

        renderTimePicker: function () {
            var html, selected, minDate, maxDate = this.maxDate;

            selected = this.startDate.clone();
            minDate = this.minDate;
            html = '<div class="hour-list-container"><ul class="hourselect hour-list">';
            var start = this.timePicker24Hour ? 0 : 1;
            var end = this.timePicker24Hour ? 23 : 12;

            for (var i = start; i <= end; i++) {
                var i_in_24 = i;
                if (!this.timePicker24Hour)
                    i_in_24 = selected.hour() >= 12 ? (i == 12 ? 12 : i + 12) : (i == 12 ? 0 : i);

                var time = selected.clone().hour(i_in_24);
                var disabled = false;
                if (minDate && time.minute(59).isBefore(minDate))
                    disabled = true;
                if (maxDate && time.minute(0).isAfter(maxDate))
                    disabled = true;
                let padded = i < 10 ? '0' + i : i;
                if (i_in_24 == selected.hour() && !disabled) {
                    html += `<li class="hour-item selected">${padded}时</li>`;
                } else if (disabled) {
                    html += `<li class="hour-item hour-item-disabled">${padded}</li>`;
                } else {
                    html += `<li class="hour-item">${padded}</li>`;
                }
            }

            html += '</ul> </div>';

            //
            // minutes
            //

            html += '<div class="minute-list-container"><ul class="minuteselect minute-list">';

            for (var i = 0; i < 60; i += this.timePickerIncrement) {
                var padded = i < 10 ? '0' + i : i;
                var time = selected.clone().minute(i);

                var disabled = false;
                if (minDate && time.second(59).isBefore(minDate))
                    disabled = true;
                if (maxDate && time.second(0).isAfter(maxDate))
                    disabled = true;

                if (selected.minute() == i && !disabled) {
                    html += `<li  class="minute-item selected">${padded}分</li>`;
                } else if (disabled) {
                    html += `<li class="minute-item minute-item-disabled">${padded}</li>`;
                } else {
                    html += `<li class="minute-item">${padded}</li>`;
                }
            }

            html += '</ul></div> ';

            if (!this.timePicker24Hour) {
                html += '<select class="ampmselect">';

                var am_html = '';
                var pm_html = '';

                if (minDate && selected.clone().hour(12).minute(0).second(0).isBefore(minDate))
                    am_html = ' disabled="disabled" class="disabled"';

                if (maxDate && selected.clone().hour(0).minute(0).second(0).isAfter(maxDate))
                    pm_html = ' disabled="disabled" class="disabled"';

                if (selected.hour() >= 12) {
                    html += '<option value="AM"' + am_html + '>AM</option><option value="PM" selected="selected"' + pm_html + '>PM</option>';
                } else {
                    html += '<option value="AM" selected="selected"' + am_html + '>AM</option><option value="PM"' + pm_html + '>PM</option>';
                }

                html += '</select>';
            }

            this.container.find('.drp-calendar .calendar-table .more-hour-minute-container').html(html);

            setTimeout(() => {
                let activeHour = document.querySelectorAll('.hour-list-container .hourselect li.selected');
                for (let i = 0; i < activeHour.length; i++) {
                    activeHour[i].scrollIntoView({
                        block: 'center',
                        inline: 'center'
                    });
                }

                let activeminute = document.querySelectorAll('.minute-list-container .minuteselect li.selected');
                for (let i = 0; i < activeminute.length; i++) {
                    activeminute[i].scrollIntoView({
                        block: 'center',
                        inline: 'center'
                    });
                }
            }, 0);
        },

        move: function () {
            var parentOffset = { top: 2, left: 1 },
                containerTop,
                drops = this.drops;

            var parentRightEdge = $(window).width();
            if (!this.parentEl.is('body')) {
                parentOffset = {
                    top: this.parentEl.offset().top - this.parentEl.scrollTop(),
                    left: this.parentEl.offset().left - this.parentEl.scrollLeft()
                };
                parentRightEdge = this.parentEl[0].clientWidth + this.parentEl.offset().left;
            }

            switch (drops) {
                case 'auto':
                    containerTop = this.element.offset().top + this.element.outerHeight() - parentOffset.top;
                    if (containerTop + this.container.outerHeight() >= this.parentEl[0].scrollHeight) {
                        containerTop = this.element.offset().top - this.container.outerHeight() - parentOffset.top;
                        drops = 'up';
                    }
                    break;
                case 'up':
                    containerTop = this.element.offset().top - this.container.outerHeight() - parentOffset.top;
                    break;
                default:
                    containerTop = this.element.offset().top + this.element.outerHeight() - parentOffset.top;
                    break;
            }

            // Force the container to it's actual width
            this.container.css({
                top: 0,
                left: 0,
                right: 'auto'
            });
            var containerWidth = this.container.outerWidth();

            this.container.toggleClass('drop-up', drops == 'up');

            if (this.opens == 'left') {
                var containerRight = parentRightEdge - this.element.offset().left - this.element.outerWidth();
                if (containerWidth + containerRight > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        right: 'auto',
                        left: 9
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        right: containerRight,
                        left: 'auto'
                    });
                }
            } else if (this.opens == 'center') {
                var containerLeft = this.element.offset().left - parentOffset.left + this.element.outerWidth() / 2
                    - containerWidth / 2;
                if (containerLeft < 0) {
                    this.container.css({
                        top: containerTop,
                        right: 'auto',
                        left: 9
                    });
                } else if (containerLeft + containerWidth > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        left: 'auto',
                        right: 0
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        left: containerLeft,
                        right: 'auto'
                    });
                }
            } else {
                var containerLeft = this.element.offset().left - parentOffset.left;
                if (containerLeft + containerWidth > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        left: 'auto',
                        right: 0
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        left: containerLeft,
                        right: 'auto'
                    });
                }
            }
        },

        show: function (e) {
            this.element.parent().addClass('input-active');
            if (this.isShowing) return;

            // Create a click proxy that is private to this instance of datepicker, for unbinding
            this._outsideClickProxy = $.proxy(function (e) { this.outsideClick(e); }, this);

            //if startDate is null,then set current date to startDate
            if ($(this.element).prop('id') == 'startDateTime') {
                this.startDate = this.startDate ? this.startDate : moment().startOf('day');
            } else if ($(this.element).prop('id') == 'endDateTime') {
                this.startDate = this.startDate ? this.startDate : moment().endOf('day');
            } else if (!this.startDate) {
                this.startDate = moment().startOf('day');
            }
            $(document)
                .on('mousedown.daterangepicker', this._outsideClickProxy)
                .on('touchend.daterangepicker', this._outsideClickProxy)
                .on('click.daterangepicker', '[data-toggle=dropdown]', this._outsideClickProxy)
                .on('focusin.daterangepicker', this._outsideClickProxy);
            $(window).on('resize.daterangepicker', $.proxy(function (e) { this.move(e); }, this));
            this.oldStartDate = this.startDate.clone();
            this.updateView();
            this.container.show();
            this.move();
            this.element.trigger('show.daterangepicker', this);
            this.isShowing = true;
        },

        hide: function (e) {
            if (!this.isShowing) return;
            if (!this.startDate.isSame(this.oldStartDate))
                this.callback(this.startDate.clone());
            this.updateElement();

            $(document).off('.daterangepicker');
            $(window).off('.daterangepicker');
            this.container.hide();
            this.element.trigger('hide.daterangepicker', this);
            this.isShowing = false;
            if (this.element.parent() && this.element.parent().hasClass('input-active')) {
                this.element.parent().removeClass('input-active');
            }
        },

        outsideClick: function (e) {
            var target = $(e.target);
            if (
                e.type == "focusin" ||
                target.closest(this.element).length ||
                target.closest(this.container).length ||
                target.closest('.calendar-table').length
            ) return;
            this.element.parent().removeClass('input-active')

            if (this.isShowing) {
                //incomplete date selection, revert to last values
                this.startDate = this.oldStartDate.clone();

                //if a new date range was selected, invoke the user callback function
                if (!this.startDate.isSame(this.oldStartDate))
                    this.callback(this.startDate.clone(), this.chosenLabel);
                $(document).off('.daterangepicker');
                $(window).off('.daterangepicker');
                this.container.hide();
                this.element.trigger('hide.daterangepicker', this);
                this.isShowing = false;
            }
            this.element.trigger('outsideClick.daterangepicker', this);

        },

        showCalendars: function () {
            this.container.addClass('show-calendar');
            this.move();
            this.element.trigger('showCalendar.daterangepicker', this);
        },

        hideCalendars: function () {
            this.container.removeClass('show-calendar');
            this.element.trigger('hideCalendar.daterangepicker', this);
        },


        clickAddOneYear: function (e) {
            this.getNewYear(e, 'add')
        },

        clickSubOneYear: function (e) {
            this.getNewYear(e, 'sub')
        },

        clickAddRangeYear: function (e) {
            this.getNewRangeYear('add', e)
        },

        clickSubRangeYear: function (e) {
            this.getNewRangeYear('sub', e)
        },

        getNewRangeYear: function (flag, e) {
            let currentEle = $(e.target);
            let currentYearEle = currentEle.parents('.sub-card-title').find('.sub-current-year');
            let currentYearRange = currentYearEle.html().trim().split('-');
            let rangeStartYear, rangeEndYear;
            if (flag == 'add') {// 点击右边
                rangeStartYear = Number(currentYearRange[1].trim()) + 1;
                rangeEndYear = Number(currentYearRange[1].trim()) + 12;
            } else { //点击左边 
                rangeStartYear = Number(currentYearRange[0].trim()) - 12;
                rangeEndYear = Number(currentYearRange[0].trim()) - 1;
            }

            this.renderSubYearTitle(currentEle.parents('.sub-card-title'), rangeStartYear, rangeEndYear);
            let yearListHtml = this.renderYearSection(rangeStartYear, rangeEndYear);
            let delegateTarget = $(e.delegateTarget)
            delegateTarget.find('.calendar-table .more-years-container').html(yearListHtml)
        },

        getNewYear: function (e, flag) {
            let currentEle = $(e.target);
            let currentYearEle = currentEle.parents('.sub-card-title').find('.sub-current-year');
            let currentYear = Number(currentYearEle.html().trim().match(/\d+/g));
            if (flag == 'add') {
                currentYear = currentYear + 1
                currentYearEle.html(currentYear + '年');
            } else {
                currentYear = currentYear - 1
                currentYearEle.html(currentYear + '年')
            }
            this.renderSubMonthTitle(currentEle.parents('.sub-card-title'), currentYear);
            let currentMonth = moment().month();
            let monthListHtml = this.renderMonthSection(currentMonth, currentYear);
            let delegateTarget = $(e.delegateTarget)
            delegateTarget.find('.calendar-table .more-months-container').html(monthListHtml)
        },

        clickYearItem: function (e) {
            if ($(e.target).hasClass('year-item-disabled')) return;
            let currentEle = $(e.target);
            let clickedYear = currentEle.html().trim();
            let calendarTableEle = currentEle.parents('.calendar-table');
            currentEle.parents('.month-list').find('.month-item').removeClass('month-item-selected')
            currentEle.addClass('month-item-selected');
            let currentDate = this.startDate;
            this.startDate.year(Number(clickedYear));
            this.startDate = currentDate
            this.updateView();

            calendarTableEle.find('.calendar-table-container').css({ 'display': 'display-block' });
            $('.drp-buttons').css({ 'display': 'block' });
            calendarTableEle.find('.more-years-container').css({ 'display': 'none' });
            calendarTableEle.find('.month-yeart-select-container .letf-monthselect-container, .month-yeart-select-container .letf-yearselect-container').css({ 'display': 'flex' });
            calendarTableEle.find('.month-yeart-select-container .sub-card-title').css({ 'display': 'none' });
        },

        clickMonthItem: function (e) {
            if ($(e.target).hasClass('month-item-disabled')) return;
            let currentEle = $(e.target);
            let calendarTableEle = currentEle.parents('.calendar-table');
            currentEle.parents('.month-list').find('.month-item').removeClass('month-item-selected')
            currentEle.addClass('month-item-selected');
            let currentDate = moment(this.startDate);
            let selectedMonth = Number(currentEle.html().trim().match(/\d+/g)) - 1
            let selectedYear = Number((calendarTableEle.find('.month-yeart-select-container .sub-card-title .sub-current-year').html()).trim().match(/\d+/g));
            currentDate.year(selectedYear);
            currentDate.month(selectedMonth);
            this.startDate = currentDate;
            this.updateView();
            calendarTableEle.find('.calendar-table-container').css({ 'display': 'display-block' });
            $('.drp-buttons').css({ 'display': 'block' });
            calendarTableEle.find('.more-months-container').css({ 'display': 'none' });
            calendarTableEle.find('.month-yeart-select-container .letf-monthselect-container, .month-yeart-select-container .letf-yearselect-container').css({ 'display': 'flex' });
            calendarTableEle.find('.month-yeart-select-container .sub-card-title').css({ 'display': 'none' });
        },

        clickMonth: function (e) {
            
            let currentEle = $(e.target);
            let calendarTableEle = currentEle.parents('.calendar-table')
            calendarTableEle.find('.calendar-table-container').css({ 'display': 'none' });
            calendarTableEle.find('.month-yeart-select-container .letf-monthselect-container, .month-yeart-select-container .letf-yearselect-container').css({ 'display': 'none' });
            this.renderSubMonthTitle(calendarTableEle.find('.month-yeart-select-container .sub-card-title'), this.startDate.year());
            $('.drp-buttons').css({ 'display': 'none' });
            let currentMonth = this.startDate.month();
            let monthListHtml = this.renderMonthSection(currentMonth, this.startDate.year());
            calendarTableEle.find('.more-months-container').html(monthListHtml).css({ 'display': 'block' });
        },

        clickYear: function (e) {
            let currentEle = $(e.target);
            let calendarTableEle = currentEle.parents('.calendar-table')
            let yearListHtml = this.renderYearSection(this.startDate.year() - 5, this.startDate.year() + 6);
            calendarTableEle.find('.month-yeart-select-container .letf-monthselect-container, .month-yeart-select-container .letf-yearselect-container').css({ 'display': 'none' });
            calendarTableEle.find('.calendar-table-container').css({ 'display': 'none' });
            $('.drp-buttons').css({ 'display': 'none' });

            calendarTableEle.find('.more-years-container').html(yearListHtml).css({ 'display': 'block' });
            this.renderSubYearTitle(calendarTableEle.find('.month-yeart-select-container .sub-card-title'), this.startDate.year() - 5, this.startDate.year() + 6);
        },

        clickTime: function (e) {
            let currentEle = $(e.target);
            let calendarTableEle = currentEle.parents('.drp-calendar ').find('.calendar-table');
            this.renderTimePicker();
            calendarTableEle.find('.month-yeart-select-container .letf-monthselect-container, .month-yeart-select-container .letf-yearselect-container').css({ 'display': 'none' });
            calendarTableEle.find('.calendar-table-container').css({ 'display': 'none' });
            calendarTableEle.find('.more-hour-minute-container').css({ 'display': 'flex' });
            calendarTableEle.find('.month-yeart-select-container .sub-card-title').html('选择时间').css({ 'display': 'block', 'text-align': 'center' });
            currentEle.css({ 'display': 'none' });
            currentEle.parents('.drp-buttons').find('.selectDateLink').css({ 'display': 'unset' });
        },

        renderSubYearTitle: function (subTitleEle, rangeStartYear, RangeEndYear) {
            let minYear = this.minDate ? Number(this.minDate.year()) : null;
            let maxYear = this.maxDate ? Number(this.maxDate.year()) : null;
            let preIsValid = (!this.minDate || rangeStartYear > minYear) ? 'is-available' : 'is-disbaled';
            let nextIsValid = (!this.maxDate || RangeEndYear < maxYear) ? 'is-available' : 'is-disbaled'
            let currentYearHtml = ` <span class="left-sub-year-range ${preIsValid}">
                                            <i class="fa fa-angle-left" aria-hidden="true"></i>
                                        </span>
                                        <div class="sub-current-year">
                                            ${rangeStartYear} - ${RangeEndYear}
                                        </div>
                                        <span class="left-add-year-range ${nextIsValid}"><i class="fa fa-angle-right" aria-hidden="true"></i></span>`
            subTitleEle.html(currentYearHtml).css({ 'display': 'flex' })
        },

        renderSubMonthTitle: function (subTitleEle, currentYear) {
            let minYear = this.minDate ? Number(this.minDate.year()) : null;
            let maxYear = this.maxDate ? Number(this.maxDate.year()) : null;
            let preIsValid = (!this.minDate || currentYear > minYear) ? 'is-available' : 'is-disbaled';
            let nextIsValid = (!this.maxDate || maxYear > currentYear) ? 'is-available' : 'is-disbaled'
            let currentYearHtml = ` <span class="left-sub-year ${preIsValid}">
                                            <i class="fa fa-angle-left" aria-hidden="true"></i>
                                        </span>
                                        <div class="sub-current-year">
                                            ${currentYear}年
                                        </div>
                                        <span class="left-add-year ${nextIsValid}"><i class="fa fa-angle-right" aria-hidden="true"></i></span>`
            subTitleEle.html(currentYearHtml).css({ 'display': 'flex' })
        },

        clickPrev: function (count, e) {
            var cal = $(e.target).parents('.drp-calendar');
            this.Calendar.month.subtract(count, 'month');
            this.renderCalendar();
            //this.updateCalendars();
        },
        clickNext: function (count, e) {
            this.Calendar.month.add(count, 'month');
            this.renderCalendar();
            //this.updateCalendars();
        },

        clickDate: function (e) {

            if (!$(e.target).hasClass('is-available')) return;

            var title = $(e.target).attr('data-title');
            var row = title.substr(1, 1);
            var col = title.substr(3, 1);
            var cal = $(e.target).parents('.drp-calendar');
            var date = this.Calendar.calendar[row][col];
            if (this.timePicker) {
                var hour = parseInt(this.container.find('.left .hourselect').val(), 10);
                if (!this.timePicker24Hour) {
                    var ampm = this.container.find('.left .ampmselect').val();
                    if (ampm === 'PM' && hour < 12)
                        hour += 12;
                    if (ampm === 'AM' && hour === 12)
                        hour = 0;
                }
                var minute = parseInt(this.container.find('.left .minuteselect').val(), 10);
                if (isNaN(minute)) {
                    minute = parseInt(this.container.find('.left .minuteselect option:last').val(), 10);
                }
                date = date.clone().hour(hour).minute(minute);
            }
            this.startDate = date.clone()
            this.updateView();
            e.stopPropagation();

        },

        clickApply: function (e) {
            this.hide();
            this.element.trigger('apply.daterangepicker', this);
            this.updateElement();
        },

        monthOrYearChanged: function (e) {
            var isLeft = $(e.target).closest('.drp-calendar').hasClass('left'),
                leftOrRight = isLeft ? 'left' : 'right',
                cal = this.container.find('.drp-calendar.' + leftOrRight);
            var month = parseInt(cal.find('.monthselect').val(), 10);
            var year = cal.find('.yearselect').val();

            if (!isLeft) {
                if (year < this.startDate.year() || (year == this.startDate.year() && month < this.startDate.month())) {
                    month = this.startDate.month();
                    year = this.startDate.year();
                }
            }

            if (this.minDate) {
                if (year < this.minDate.year() || (year == this.minDate.year() && month < this.minDate.month())) {
                    month = this.minDate.month();
                    year = this.minDate.year();
                }
            }

            if (this.maxDate) {
                if (year > this.maxDate.year() || (year == this.maxDate.year() && month > this.maxDate.month())) {
                    month = this.maxDate.month();
                    year = this.maxDate.year();
                }
            }
            this.Calendar.month.month(month).year(year);
            this.renderCalendar();
            //this.updateCalendars();
        },

        timeChanged: function (e) {
            let currentEle = $(e.target);
            let parentEle = currentEle.parent('ul');
            let preVal = parentEle.find('li.selected').html().trim().match(/[^\d]/g);
            let preValNum = parseInt(parentEle.find('li.selected').html());
            preValNum = preValNum < 10 ? '0' + preValNum : preValNum
            $(parentEle).find('li.selected').html(preValNum);
            $(parentEle).find('li').removeClass('selected');

            currentEle.addClass('selected');
            currentEle.html(currentEle.html() + preVal[0])

            let cal = currentEle.parents('.drp-calendar');
            let newHour = parentEle.parents('.more-hour-minute-container').find('.hour-list-container ul.hourselect li.selected').html()
            let hour = parseInt(newHour.trim(), 10);
            let minute = parseInt(parentEle.parents('.more-hour-minute-container').find('.minute-list-container ul.minuteselect li.selected').html().trim(), 10);

            if (!this.timePicker24Hour) {
                let ampm = cal.find('.ampmselect').val();
                if (ampm === 'PM' && hour < 12)
                    hour += 12;
                if (ampm === 'AM' && hour === 12)
                    hour = 0;
            }

            let start = this.startDate.clone();
            start.hour(hour);
            start.minute(minute);
            this.startDate = start
            //this.updateView();
            e.target.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
            }); // 平滑滚动到中间位置
        },

        elementChanged: function () {
            if (!this.element.is('input')) return;
            if (!this.element.val().length) return;

            var dateString = this.element.val().split(this.locale.separator),
                start = null,
                end = null;

            if (dateString.length === 2) {
                start = moment(dateString[0], this.locale.format);
                end = moment(dateString[1], this.locale.format);
            }

            if (start === null || end === null) {
                start = moment(this.element.val(), this.locale.format);
                end = start;
            }

            if (!start.isValid() || !end.isValid()) return;

            this.startDate = start;
            //this.setStartDate(start);
            // this.setEndDate(end);
            this.updateView();
        },

        keydown: function (e) {
            //hide on tab or enter
            if ((e.keyCode === 9) || (e.keyCode === 13)) {
                this.hide();
            }

            //hide on esc and prevent propagation
            if (e.keyCode === 27) {
                e.preventDefault();
                e.stopPropagation();

                this.hide();
            }
        },

        updateElement: function () {
            if (this.element.is('input')) {
                var newValue = this.startDate && this.startDate.format(this.locale.format);
                if (newValue !== this.element.val()) {
                    this.element.val(newValue).trigger('change');
                }
            }
        },

        remove: function () {
            this.container.remove();
            this.element.off('.daterangepicker');
            this.element.removeData();
        }

    };

    $.fn.daterangepicker = function (options, callback) {
        var implementOptions = $.extend(true, {}, $.fn.daterangepicker.defaultOptions, options);
        this.each(function () {
            var el = $(this);
            if (el.data('daterangepicker'))
                el.data('daterangepicker').remove();
            el.data('daterangepicker', new DateRangePicker(el, implementOptions, callback));
        });
        return this;
    };

    return DateRangePicker;

}));
