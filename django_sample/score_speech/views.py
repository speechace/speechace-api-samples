# The MIT License

# Copyright 2019 SpeecAce LLC

# Permission is hereby granted, free of charge, to any person obtaining a copy 
# of this software and associated documentation files (the "Software"), to 
# deal in the Software without restriction, including without limitation the 
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
# sell copies of the Software, and to permit persons to whom the Software is 
# furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included 
# in all copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE
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
