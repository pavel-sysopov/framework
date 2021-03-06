// Copyright (C) 2016 iNuron NV
//
// This file is part of Open vStorage Open Source Edition (OSE),
// as available from
//
//      http://www.openvstorage.org and
//      http://www.openvstorage.com.
//
// This file is free software; you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License v3 (GNU AGPLv3)
// as published by the Free Software Foundation, in version 3 as it comes
// in the LICENSE.txt file of the Open vStorage OSE distribution.
//
// Open vStorage is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY of any kind.
/*global define */
define([
    'durandal/app', 'jquery', 'knockout',
    'ovs/generic', 'ovs/refresher'
], function(app, $, ko, generic, Refresher) {
    "use strict";
    return function() {
        var self = this;

        // Variables
        self.refresher          = new Refresher();
        self.preloadPage        = 0;
        self.key                = undefined;
        self.viewportCache      = {};
        self.progressiveTracker = {};
        self.requests           = {};
        self.querySubscription  = undefined;

        // Observables
        self._totalItems     = ko.observable(0);
        self._lastPage       = ko.observable(1);
        self._pageFirst      = ko.observable(0);
        self._pageLast       = ko.observable(0);
        self._pageSize       = ko.observable(10);

        self.container       = ko.observable(ko.observableArray([]));
        self.controls        = ko.observable(true);
        self.external        = ko.observable(false);
        self.headers         = ko.observableArray([]);
        self.internalCurrent = ko.observable(1);
        self.padding         = ko.observable(2);
        self.pageLoading     = ko.observable(false);
        self.pageSizes       = ko.observableArray([10, 25, 50, 100]);
        self.preloading      = ko.observable(false);
        self.progressive     = ko.observable();
        self.query           = ko.observable();
        self.settings        = ko.observable({});
        self.sortable        = ko.observable(false);
        self.sorting         = ko.observable({sequence: [], directions: {}});
        self.viewportItems   = ko.observableArray([]);
        self.viewportKeys    = ko.observableArray([]);

        // Computed
        self.items = ko.computed({
            read: function() {
                if (self.external()) {
                    if (self.settings().hasOwnProperty('items')) {
                        return self.settings().items();
                    }
                    return [];
                }
                return self.container()();
            },
            write: function(value) {
                self.container()(value);
            }
        });
        self.pageSize = ko.computed({
            read: self._pageSize,
            write: function(value) {
                if (self._pageSize() !== value) {
                    self._pageSize(value);
                    self.current(self.current());
                }
            }
        });
        self.showControls = ko.computed(function() {
            return self.controls() || (self.totalItems() > self.pageSize());
        });
        self.totalItems = ko.computed(function() {
            if (self.external()) {
                return self.items().length;
            }
            return self._totalItems();
        });
        self.lastPage = ko.computed(function() {
            if (self.external()) {
                return Math.floor((self.totalItems() - 1) / self.pageSize()) + 1;
            }
            return self._lastPage();
        });
        self.current = ko.computed({
            // One-based
            read: function() {
                if (self.external()) {
                    return Math.min(self.internalCurrent(), Math.floor(self.totalItems() / self.pageSize()) + 1);
                }
                return self.internalCurrent();
            },
            write: function(value) {
                self.internalCurrent(value);
                self.load(value, false, true);

                // Prefetch/refresh next page
                var preloadPage = value + 1;
                if (preloadPage === self.lastPage()) {
                    preloadPage = 1;
                }
                self.load(preloadPage, true, false);
            }
        });
        self.hasNext = ko.computed(function() {
            return self.current() < self.lastPage();
        });
        self.hasPrevious = ko.computed(function() {
            return self.current() > 1;
        });
        self.pageFirst = ko.computed(function() {
            if (self.external()) {
                return Math.min((self.current() - 1) * self.pageSize() + 1, self.items().length);
            }
            return self._pageFirst();
        });
        self.pageLast = ko.computed(function() {
            if (self.external()) {
                return Math.min(self.pageFirst() + 9, self.items().length);
            }
            return self._pageLast();
        });
        self.pages = ko.computed(function() {
            var i,
                pages = [],
                from = Math.max(1, self.current() - self.padding()),
                to = Math.min(self.lastPage(), self.current() + self.padding());
            from = Math.max(1, Math.min(to - 2 * self.padding(), from));
            to = Math.min(self.lastPage(), Math.max(from + 2 * self.padding(), to));
            for (i = from; i <= to; i += 1) {
                pages.push(i);
            }
            return pages;
        });
        self.viewportCalculator = ko.computed(function() {
            if (self.external()) {
                var i, items = self.items(), vItems = [],
                    start = (self.current() - 1) * self.pageSize(),
                    max = Math.min(start + self.pageSize(), items.length);
                for (i = start; i < max; i += 1) {
                    vItems.push(items[i]);
                }
                self.viewportItems(vItems);
            } else {
                self.container().sort(function (a, b) {
                    var aLocation = $.inArray(a[self.key](), self.viewportKeys()),
                        bLocation = $.inArray(b[self.key](), self.viewportKeys());
                    if (aLocation === -1) {
                        return 1;
                    }
                    if (bLocation === -1) {
                        return -1;
                    }
                    return aLocation - bLocation;
                });
                self.viewportItems(self.container()().slice(0, self.viewportKeys().length));
            }
        });
        self.loading = ko.computed(function() {
            return self.viewportItems().length === 0 && self.pageLoading();
        });
        self.sortingKey = ko.computed(function() {
            if (self.sortable() === false || self.sorting().sequence.length === 0) {
                return undefined;
            }
            var sorting = self.sorting(), result = [];
            $.each(sorting.sequence, function(index, item) {
                result.push((sorting.directions[item] ? '' : '-') + item);
            });
            return result.join(',');
        });

        // Functions
        /**
         * Step to the next page
         * @param next: Page number of the next step
         */
        self.step = function(next) {
            if (next) {
                if (self.hasNext()) {
                    self.current(self.current() + 1);
                }
            } else {
                if (self.hasPrevious()) {
                    self.current(self.current() - 1);
                }
            }
        };
        /**
         * Load a certain page and handles progression
         * @param page: Page to load
         * @param preload: Is the page to load a pre-load (different from the current page)
         * This is a parameter as the page could change during the computing of whether or not the fetched page is different to the current one
         * @param progressive: Should the page be loaded progressively. The use for progression is the change the contents whether or not the load
         * should be progressive. For example: fetching property 'x' of an object takes a minute, but all other properties are instantaneous,
         * one would fire up a non-progressive load without the property 'x' to display some data at least and afterwards fetch property x
         * The other properties would already be cached at that point resulting in just computing 'x'
         * @return {*}
         */
        self.load = function(page, preload, progressive) {
            if (progressive === true) {
                if (['always', 'initial'].contains(self.progressive() && self.progressiveTracker[page] !== true)) {
                    self.progressiveTracker[page] = true;
                    return self._load(page, preload, true)
                        .then(function () {
                            return self._load(page, preload, false);
                        });
                }
            }
            return self._load(page, preload, false)
        };
        /**
         * Load the page data
         * @param page: Page to load
         * @param preload: Is the page to load a pre-load (different from the current page)
         * This is a parameter as the page could change during the computing of whether or not the fetched page is different to the current one
         * @param progressive: Should the page be loaded progressively. The use for progression is the change the contents whether or not the load
         * should be progressive. For example: fetching property 'x' of an object takes a minute, but all other properties are instantaneous,
         * one would fire up a non-progressive load without the property 'x' to display some data at least and afterwards fetch property x
         * The other properties would already be cached at that point resulting in just computing 'x'
         * This property will be added to the query_params and can be used to determine contents in the loading function
         * @return {*}
         * @private
         */
        self._load = function(page, preload, progressive) {
            var options = {
                page: page,
                page_size: parseInt(self.pageSize(), 10),
                progressive: progressive
            };
            if (self.sortable()) {
                options.sort = self.sortingKey()
            }
            if (self.query()) {
                options.query = JSON.stringify(self.query())
            }
            if (self.external()) {
                // Not using the pagers container
                self.pageLoading(true);
                // Create a new chain, the loadData function might not return a promise
                var chainDeferred = $.Deferred(), chainPromise = chainDeferred.promise();
                chainDeferred.resolve();  // Kick of the chain
                chainPromise
                    .then(function () {
                        return self.loadData(options);
                    })
                    .always(function () {
                        self.pageLoading(false);
                    });
                return chainDeferred;
            }
            // Use the pagers container
            self.pageLoading(true);
            $.each(self.viewportItems(), function (index, item) {
                item.loading(true);
            });
            if (!preload && self.viewportCache.hasOwnProperty(page)) {
                self.viewportKeys(self.viewportCache[page].keys);
                self._totalItems(self.viewportCache[page].totalItems);
                self._lastPage(self.viewportCache[page].lastPage);
                self._pageFirst(self.viewportCache[page].pageFirst);
                self._pageLast(self.viewportCache[page].pageLast);
            }
            var request = self.requests[page];
            var requestChanged = !!(request && !generic.objectEquals(options, request['options']));
            // Keep a copy of the supplied options as the loadData function might edit them
            // (should be resolve in the passed loadData function, offload it all to the pager)
            var suppliedOptions = $.extend({}, options);
            if (requestChanged || generic.xhrCompleted(request)) {
                if (requestChanged && !generic.xhrCompleted(request)) {
                    generic.xhrAbort(request['request'])
                }
                request = self.loadData(options)
                    .then(function (dataset) {
                        if (dataset !== undefined && (preload || page === self.current())) {
                            var keys = [], idata = {}, maxPage = dataset.data._paging.max_page;
                            $.each(dataset.data.data, function (index, item) {
                                keys.push(item[self.key]);
                                idata[item[self.key]] = item;
                            });
                            if (page > maxPage) {
                                self.viewportCache = {};
                                self.internalCurrent(maxPage);
                                page = maxPage;
                            }
                            self.viewportCache[page] = {
                                keys: keys,
                                totalItems: dataset.data._paging.total_items,
                                lastPage: dataset.data._paging.max_page,
                                pageFirst: dataset.data._paging.start_number,
                                pageLast: dataset.data._paging.end_number
                            };
                            if (!preload) {
                                self._totalItems(self.viewportCache[page].totalItems);
                                self._lastPage(self.viewportCache[page].lastPage);
                                self._pageFirst(self.viewportCache[page].pageFirst);
                                self._pageLast(self.viewportCache[page].pageLast);
                                self.viewportKeys(self.viewportCache[page].keys);
                            }
                            generic.crossFiller(keys, self.container(), dataset.loader, self.key, false);
                            $.each(self.container()(), function (index, item) {
                                if ($.inArray(item[self.key](), keys) !== -1 && (self.skipOn === undefined || !item[self.skipOn]())) {
                                    item.fillData(idata[item[self.key]()]);
                                    if (dataset.dependencyLoader !== undefined) {
                                        dataset.dependencyLoader(item);
                                    }
                                }
                                item.loading(false);
                            });
                            if (dataset.overviewLoader !== undefined) {
                                dataset.overviewLoader(keys);
                            }
                        }
                    })
                    .always(function () {
                        self.pageLoading(false);
                    });
                self.requests[page] = {
                    'request': request,
                    'options': suppliedOptions
                };
            }
            return self.requests[page]['request'];
        };
        self.sort = function(data, event) {
            if (self.sortable() === false) {
                return;
            }
            var key = data.key, value, sorting = self.sorting();
            if (event.ctrlKey) {
                if (sorting.directions.hasOwnProperty(key)) {
                    value = sorting.directions[key];
                    if (value === true) {
                        sorting.directions[key] = false;
                    } else {
                        delete sorting.directions[key];
                        generic.removeElement(sorting.sequence, key);
                    }
                } else {
                    sorting.sequence.push(key);
                    sorting.directions[key] = true;
                }
            } else {
                if (sorting.directions.hasOwnProperty(key)) {
                    value = sorting.directions[key];
                    sorting = {sequence: [key],
                               directions: {}};
                    sorting.directions[key] = !value;
                } else {
                    sorting = {sequence: [key],
                               directions: {}};
                    sorting.directions[key] = true;
                }
            }
            self.sorting(sorting);
            self.load(self.current(), false, true);
        };

        // Durandal
        self.activate = function(settings) {
            if (!settings.hasOwnProperty('headers')) {
                throw 'Headers should be specified';
            }

            if (settings.hasOwnProperty('items')) { self.external(true); }
            if (settings.hasOwnProperty('container')) { self.container(settings.container); }
            else { self.container(ko.observableArray([])); }
            self.settings(settings);
            self.headers(settings.headers);
            self.key = generic.tryGet(settings, 'key', 'guid');
            self.controls(generic.tryGet(settings, 'controls', true));
            self.sortable(generic.tryGet(settings, 'sortable', false));
            self.skipOn = generic.tryGet(settings, 'skipon', undefined);
            self.preloading(generic.tryGet(settings, 'preloading', false));
            self.loadData = generic.tryGet(settings, 'loadData', function() {});
            self.progressive(generic.tryGet(settings, 'progressive', undefined));
            self.refresh = parseInt(generic.tryGet(settings, 'refreshInterval', '5000'), 10);

            self.query = generic.tryGet(settings, 'query', ko.observable());
            if (self.sortable() === true) {
                var sorting = {sequence: [],
                               directions: {}}, key;
                if (settings.hasOwnProperty('sorting')) {
                    $.each(settings.sorting.split(','), function(index, item) {
                        key = item[0] === '-' ? item.substring(1) : item;
                        sorting.sequence.push(key);
                        sorting.directions[key] = item[0] !== '-';
                    });
                } else {
                    key = self.headers()[0].key;
                    sorting.sequence = [key];
                    sorting.directions[key] = true;
                }
                self.sorting(sorting);
            }

            if (settings.hasOwnProperty('trigger')) {
                settings.trigger.subscribe(function() { self.load(self.current(), false, false); });
            }

            self.refresher.init(function() {
                self.load(self.current(), false, true);
                if (self.preloading()) {
                    self.preloadPage += 1;
                    if (self.preloadPage === self.current()) {
                        // Preload the next page
                        self.preloadPage += 1;
                    }
                    if (self.preloadPage > self.lastPage()) {
                        // Preload the first page again
                        self.preloadPage = 1;
                    }
                    if (self.preloadPage !== self.current()) {
                        self.load(self.preloadPage, true, false);
                    }
                }
            }, self.refresh);

            self.refresher.run();
            self.refresher.start();

            // Enable query functionality
            self.querySubscription = app.on('query:update')
                .then(function(query){
                    self.query(query);
                    self.refresher.run();
            });

            settings.bindingContext.$root.widgets.push(self);
        };
        self.deactivate = function() {
            if (self.querySubscription) { self.querySubscription.off(); }
            self.refresher.stop();
        };
    };
});
