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
    'jquery', 'knockout',
    'ovs/api', 'ovs/shared', 'ovs/generic',
    '../../containers/vmachine', '../../containers/pmachine', './data'
], function($, ko, api, shared, generic, VMachine, PMachine, data) {
    "use strict";
    return function() {
        var self = this;

        // Variables
        self.data   = data;
        self.shared = shared;

        // Handles
        self.loadPMachinesHandle = undefined;
        self.loadVMachinesHandle = undefined;

        // Computed
        self.namehelp = ko.computed(function() {
            if (data.name() === undefined || data.name() === '') {
                return $.t('ovs:wizards.create_ft.gather.no_name');
            }
            if (data.amount() === 1) {
                return $.t('ovs:wizards.create_ft.gather.amount_one');
            }
            return $.t('ovs:wizards.create_ft.gather.amount_multiple', {
                start: data.name() + '-' + data.startnr(),
                end: data.name() + '-' + (data.startnr() + data.amount() - 1)
            });
        });
        self.canStart = ko.computed(function() {
            var valid = true, reasons = [], fields = [];
            if (self.data.vm() === undefined) {
                valid = false;
                fields.push('vm');
                reasons.push($.t('ovs:wizards.create_ft.gather.no_machine'));
            }
            if (self.data.pMachines().length === 0) {
                valid = false;
                fields.push('pmachines');
                reasons.push($.t('ovs:wizards.create_ft.gather.no_pmachines'));
            }
            return { value: valid, reasons: reasons, fields: fields };
        });
        self.canContinue = ko.computed(function() {
            var valid = true, reasons = [], fields = [],
                data = self.canStart();
            if (!data.value) {
                return data;
            }
            if (self.data.name() === undefined || self.data.name() === '') {
                valid = false;
                fields.push('name');
                reasons.push($.t('ovs:wizards.create_ft.gather.no_name'));
            }
            if (self.data.amount() === 1) {
                if (self.data.vMachinesNames().contains(self.data.name())) {
                    valid = false;
                    fields.push('name');
                    reasons.push($.t('ovs:wizards.create_ft.gather.duplicate_name', {
                        name: self.data.name()
                    }));
                }
            } else {
                var name, i = self.data.startnr();
                for (i = self.data.startnr(); i < (self.data.startnr() + self.data.amount()); i++) {
                    name = self.data.name() + '-' + i;
                    if (self.data.vMachinesNames().contains(name)) {
                        valid = false;
                        fields.push('name');
                        reasons.push($.t('ovs:wizards.create_ft.gather.duplicate_name', {
                            name: name
                        }));
                    }
                }
            }
            if (self.data.selectedPMachines().length === 0) {
                valid = false;
                fields.push('pmachines');
                reasons.push($.t('ovs:wizards.create_ft.gather.no_pmachines_selected'));
            }
            return { value: valid, reasons: reasons, fields: fields };
        });

        // Functions
        self._create = function(name, description, pmachine) {
            return $.Deferred(function(deferred) {
                api.post('/vmachines/' + self.data.vm().guid() + '/create_from_template', {
                        data: {
                            pmachineguid: pmachine.guid(),
                            name: name,
                            description: description
                        }
                    })
                    .then(self.shared.tasks.wait)
                    .done(function() {
                        deferred.resolve(true);
                    })
                    .fail(function(error) {
                        generic.alertError(
                            $.t('ovs:generic.error'),
                            $.t('ovs:generic.messages.errorwhile', {what: $.t('ovs:wizards.create_ft.gather.creating', {what: self.data.vm().name(), error: error})})
                        );
                        deferred.resolve(false);
                    });
            }).promise();
        };
        self.finish = function() {
            return $.Deferred(function(deferred) {
                var calls = [], i, max = self.data.startnr() + self.data.amount() - 1,
                    name, pmachinecounter = 0;
                for (i = self.data.startnr(); i <= max; i += 1) {
                    name = self.data.name();
                    if (self.data.amount() > 1) {
                        name += ('-' + i.toString());
                    }
                    calls.push(self._create(name, self.data.description(), self.data.selectedPMachines()[pmachinecounter]));
                    pmachinecounter += 1;
                    if (pmachinecounter >= self.data.selectedPMachines().length) {
                        pmachinecounter = 0;
                    }
                }
                generic.alertInfo(
                    $.t('ovs:wizards.create_ft.gather.started'),
                    $.t('ovs:wizards.create_ft.gather.in_progress', { what: self.data.vm().name() })
                );
                deferred.resolve();
                $.when.apply($, calls)
                    .done(function() {
                        var i, args = Array.prototype.slice.call(arguments),
                            success = 0;
                        for (i = 0; i < args.length; i += 1) {
                            success += (args[i] ? 1 : 0);
                        }
                        if (success === args.length) {
                        generic.alertSuccess(
                            $.t('ovs:wizards.create_ft.gather.complete'),
                            $.t('ovs:wizards.create_ft.gather.success', { what: self.data.vm().name() })
                        );
                        } else if (success > 0) {
                        generic.alert(
                            $.t('ovs:wizards.create_ft.gather.complete'),
                            $.t('ovs:wizards.create_ft.gather.some_failed', { what: self.data.vm().name() })
                        );
                        } else if (self.data.amount() > 2) {
                            generic.alertError(
                                $.t('ovs:generic.error'),
                                $.t('ovs:wizards.create_ft.gather.all_failed', { what: self.data.vm().name() })
                            );
                        }
                    });
            }).promise();
        };

        // Durandal
        self.activate = function() {
            if (self.data.vm() === undefined || self.data.vm().guid() !== self.data.guid()) {
                self.data.vm(new VMachine(self.data.guid()));
                self.data.vm().load();
                self.data.selectedPMachines([]);
            }
            generic.xhrAbort(self.loadVMachinesHandle);
            self.loadVMachinesHandle = api.get('vmachines/', { queryparams: {contents: 'name'}})
                .done(function(data) {
                    $.each(data.data, function(index, item) {
                        self.data.vMachinesNames.push(item.name);
                    });
                });
            generic.xhrAbort(self.loadPMachinesHandle);
            self.loadPMachinesHandle = api.get('vmachines/' + self.data.guid() + '/get_target_pmachines', {
                queryparams: {
                    contents: '',
                    sort: 'name'
                }
            })
                .done(function(data) {
                    var guids = [], vmdata = {};
                    $.each(data.data, function(index, item) {
                        guids.push(item.guid);
                        vmdata[item.guid] = item;
                    });
                    generic.crossFiller(
                        guids, self.data.pMachines,
                        function(guid) {
                            var pm = new PMachine(guid);
                            pm.fillData(vmdata[guid]);
                            return pm;
                        }, 'guid'
                    );
                });
        };
    };
});