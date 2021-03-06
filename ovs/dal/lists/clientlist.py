# Copyright (C) 2016 iNuron NV
#
# This file is part of Open vStorage Open Source Edition (OSE),
# as available from
#
#      http://www.openvstorage.org and
#      http://www.openvstorage.com.
#
# This file is free software; you can redistribute it and/or modify it
# under the terms of the GNU Affero General Public License v3 (GNU AGPLv3)
# as published by the Free Software Foundation, in version 3 as it comes
# in the LICENSE.txt file of the Open vStorage OSE distribution.
#
# Open vStorage is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY of any kind.

"""
ClientList module
"""
from ovs.dal.datalist import DataList
from ovs.dal.hybrids.client import Client


class ClientList(object):
    """
    This ClientList class contains various lists regarding to the Client class
    """

    @staticmethod
    def get_clients():
        """
        Returns a list of all Clients, except internal types
        """
        return DataList(Client, {'type': DataList.where_operator.AND,
                                 'items': [('ovs_type', DataList.operator.NOT_EQUALS, 'INTERNAL')]})

    @staticmethod
    def get_by_types(ovs_type, grant_type):
        """
        Returns a list of all internal Clients
        """
        return DataList(Client, {'type': DataList.where_operator.AND,
                                 'items': [('ovs_type', DataList.operator.EQUALS, ovs_type),
                                           ('grant_type', DataList.operator.EQUALS, grant_type)]})
