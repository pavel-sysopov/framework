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
    './data'
], function($, ko, api, shared, generic, data) {
    "use strict";
    return function() {
        var self = this;

        // Variables
        self.data   = data;
        self.shared = shared;

        // Computed
        self.canContinue = ko.computed(function() {
            var valid = true, reasons = [], fields = [];
            if (self.data.name() === undefined || self.data.name() === '') {
                valid = false;
                fields.push('name');
                reasons.push($.t('ovs:wizards.addmgmtcenter.gather.noname'));
            }
            if (self.data.username() === undefined || self.data.username() === '') {
                valid = false;
                fields.push('username');
                reasons.push($.t('ovs:wizards.addmgmtcenter.gather.nousername'));
            }
            if (self.data.password() === undefined || self.data.password() === '') {
                valid = false;
                fields.push('password');
                reasons.push($.t('ovs:wizards.addmgmtcenter.gather.nopassword'));
            }
            if (!self.data.ipAddress.valid()) {
                valid = false;
                fields.push('ip');
                reasons.push($.t('ovs:wizards.addmgmtcenter.gather.invalidip'));
            }
            return { value: valid, reasons: reasons, fields: fields };
        });

        // Functions
        self.finish = function() {
            return $.Deferred(function(deferred) {
                generic.alertInfo(
                    $.t('ovs:wizards.addmgmtcenter.gather.started'),
                    $.t('ovs:wizards.addmgmtcenter.gather.inprogress', { what: self.data.name() })
                );
                deferred.resolve();
                api.post('mgmtcenters', {
                    data: {
                        name: self.data.name(),
                        description: undefined,
                        username: self.data.username(),
                        password: self.data.password(),
                        ip: self.data.ipAddress(),
                        port: self.data.port(),
                        type: self.data.centerType()
                    }
                })
                    .done(function() {
                        generic.alertSuccess(
                            $.t('ovs:wizards.addmgmtcenter.gather.complete'),
                            $.t('ovs:wizards.addmgmtcenter.gather.success', { what: self.data.name() })
                        );
                    })
                    .fail(function(error) {
                        error = $.parseJSON(error.responseText);
                        generic.alertError(
                            $.t('ovs:generic.error'),
                            $.t('ovs:wizards.addmgmtcenter.gather.failed', {
                                what: self.data.name(),
                                why: error.detail
                            })
                        );
                    });
            }).promise();
        };
    };
});
