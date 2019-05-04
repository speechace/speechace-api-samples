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
from django import forms

# 60 seconds of PCM encoded 16KHz mono 16 bit audio
MAX_USER_AUDIO_FILE_SIZE = 60 * 16000 * 2


class ScoringTextSpeechForm(forms.Form):
    audio_data = forms.FileField(
        required=True,
        max_length=MAX_USER_AUDIO_FILE_SIZE,
        allow_empty_file=False)
    text = forms.CharField(required=True, widget=forms.Textarea())
