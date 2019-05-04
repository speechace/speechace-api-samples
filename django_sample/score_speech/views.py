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
import json

from django.conf import settings
from django.http import JsonResponse
from django.views.generic import View, TemplateView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie


from .forms import ScoringTextSpeechForm
from api import score as score_api


def get_client_ip(request):
    return request.META.get('REMOTE_ADDR')


def post_process_score(status_code, score_json_str):
    if status_code != 200:
        result = {'errors', 'Couldn\'t understand the audio.'}
    else:
        result = json.loads(score_json_str)
    return status_code, result


class CsrfTemplateView(TemplateView):
    """
    Render a template. Pass keyword arguments from the URLconf to the context.
    """
    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ScoringTextSpeechView(View):
    def post(self, request):
        response = {}
        response_status = 200
        api_key = settings.SPEECHACE_API_KEY if hasattr(settings, 'SPEECHACE_API_KEY') else ''
        api_include_fluency = settings.SPEECHACE_INCLUDE_FLUENCY if hasattr(settings,
                                                                            'SPEECHACE_INCLUDE_FLUENCY') else 0
        api_root_url = 'https://api.speechace.co'
        api_user_id = 'sptest'

        if not api_key:
            response['errors'] = ['SpeechAce api key not specified', ]
            response_status = 400
        if response_status != 400:
            scoring_form = ScoringTextSpeechForm(request.POST, request.FILES)
            if scoring_form.is_valid():
                text = request.POST.get('text')
                audio_data = request.FILES.get('audio_data')
                tokenized = 0
                scorer = score_api.Scorer(
                    api_key=api_key,
                    api_user_id=api_user_id,
                    api_include_fluency=api_include_fluency,
                    api_root_url=api_root_url,
                    client_ip=get_client_ip(request)
                )
                response_status, response = scorer.score_text_speech(text, audio_data, tokenized)
            else:
                errors = []
                for key, value in scoring_form.errors.items():
                    errors.append('%s (%s)' % (key.replace('_', ' ').capitalize(), 'This field is required'))
                response_status = 400
                response['errors'] = errors

        return JsonResponse(response, status=response_status)


scoring_text_speech = ScoringTextSpeechView.as_view()
