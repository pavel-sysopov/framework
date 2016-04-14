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
Django settings module
"""
import os
from subprocess import check_output
from ovs.extensions.generic.system import System
from django.conf.global_settings import TEMPLATE_CONTEXT_PROCESSORS

IPADDRESSES = [ip.strip() for ip in check_output("ip a | grep 'inet ' | sed 's/\s\s*/ /g' | cut -d ' ' -f 3 | cut -d '/' -f 1", shell=True).strip().splitlines()]

DEBUG = False
TEMPLATE_DEBUG = DEBUG

UNIQUE_ID = System.get_my_machine_id()
UI_NAME = 'api'
APP_NAME = 'api'
BASE_WWW_DIR = os.path.dirname(__file__)

BASE_FOLDER = '/opt/OpenvStorage/webapps/{0}'.format(APP_NAME)
VERSION = (1, 2, 3)  # This tuple should contain all supported API versions. E.g.: (1,) or (1, 2) or (1, 2, 3) or (2, 3, 4) or ...

BASE_LOG_DIR = '/var/log/ovs'
LOG_FILENAME = '/django.log'

FRONTEND_ROOT = '/' + UI_NAME
STATIC_URL = '/' + UI_NAME + '/static/'  # STATIC_URL must end with a slash

FORCE_SCRIPT_NAME = FRONTEND_ROOT

ADMINS = ()
MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_FOLDER + '/api.sqlite3'
    }
}

ALLOWED_HOSTS = IPADDRESSES + ['localhost']
TIME_ZONE = 'Europe/Brussels'
LANGUAGE_CODE = 'en-us'
LOGIN_URL = APP_NAME + '.frontend.login_view'

SITE_ID = 1
USE_I18N = True
USE_L10N = True
USE_TZ = True
MEDIA_ROOT = ''
MEDIA_URL = ''

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
os.environ['HTTPS'] = 'on'

STATIC_ROOT = ''
STATICFILES_DIRS = ()
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

SECRET_KEY = check_output('cat /etc/openvstorage_id', shell=True)

TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    APP_NAME + '.middleware.OVSMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

AUTHENTICATION_BACKENDS = (
    APP_NAME + '.oauth2.backend.OAuth2Backend',
)

TEMPLATE_CONTEXT_PROCESSORS += (
    'django.core.context_processors.request',
)

ROOT_URLCONF = APP_NAME + '.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'django.wsgi.application'

TEMPLATE_DIRS = (
    BASE_WWW_DIR + '/templates',
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
)

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        APP_NAME + '.oauth2.backend.OAuth2Backend',
    )
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '%(asctime)s [%(levelname)s] (%(threadName)s) %(message)s',
        },
    },
    'handlers': {
        'logfile': {
            'class': 'logging.handlers.WatchedFileHandler',
            'filename': BASE_LOG_DIR + '/' + LOG_FILENAME,
            'formatter': 'simple',
        },
    },
    'loggers': {
        'default': {
            'handlers': ['logfile'],
            'level': 'INFO',
            'propogate': False
        },
    },
}
