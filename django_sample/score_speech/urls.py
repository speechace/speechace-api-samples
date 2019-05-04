# Copyright (C) 2019  SpeechAce LLC
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU Affero General Public License as published
#  by the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU Affero General Public License for more details.
#
#  You should have received a copy of the GNU Affero General Public License
#   along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
from django.urls import re_path

from .views import CsrfTemplateView, scoring_text_speech

app_name = 'score_speech'
urlpatterns = [
    re_path(r'^$', CsrfTemplateView.as_view(template_name='index.html'), name='index'),
    re_path(r'^score-text-speech/$', scoring_text_speech, name='score_text_speech'),
]
