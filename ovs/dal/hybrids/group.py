# Copyright 2016 iNuron NV
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Group module
"""
from ovs.dal.dataobject import DataObject
from ovs.dal.structures import Property


class Group(DataObject):
    """
    The Group class represents a Group. A group is used to bind a set of Users to a set of Roles.
    """
    __properties = [Property('name', str, doc='Name of the Group.'),
                    Property('description', str, mandatory=False, doc='Description of the Group.')]
    __relations = []
    __dynamics = []
