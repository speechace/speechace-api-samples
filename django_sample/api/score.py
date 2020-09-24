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
# IN THE SOFTWARE.

import json
from decimal import Decimal, ROUND_UP, ROUND_HALF_UP

import requests

METRICS = [
    {'key': 'ielts_score', 'response_key': 'ielts_estimate'},
    {'key': 'pte_score', 'response_key': 'pte_estimate'},
    {'key': 'audio_length', 'response_key': 'duration'},
    {'key': 'wcm', 'response_key': 'word_correct_per_minute'},
    {'key': 'pauses', 'response_key': 'all_pause_count'},
    {'key': 'pause_duration', 'response_key': 'all_pause_duration'},
    {'key': 'mlr', 'response_key': 'mean_length_run'},
]


def process_score_overall_metrics(score_overall_metrics):
    overall_metrics = {}
    for item in METRICS:
        if item.get('response_key') in score_overall_metrics:
            overall_metrics[item.get('key')] = score_overall_metrics[item.get('response_key')]
    return overall_metrics


def process_segment_metrics_list(segment_metrics_list):
    ielts_estimate = Decimal(0)
    total_ielts_estimate = Decimal(0)
    for segment_item in segment_metrics_list:
        if 'quality_score' in segment_item:
            ielts_estimate = Decimal(segment_item['quality_score'])
            total_ielts_estimate += ielts_estimate
            print(ielts_estimate)
    print(total_ielts_estimate)
    if len(segment_metrics_list) > 0:
        average_ielts_estimate = total_ielts_estimate / len(segment_metrics_list)
        ielts_estimate = (average_ielts_estimate * Decimal('2')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) / 2
    return ielts_estimate


def process_word_score_list(word_score_list):
    words = []
    syllables = []
    phonemes = []
    overall_score = Decimal(0)
    total_overall_score = Decimal(0)
    for word_item in word_score_list:
        word = {'word': word_item.get('word', ''), 'quality_score': word_item.get('quality_score', 0)}
        if 'syllable_score_list' in word_item:
            for index, syllable_item in enumerate(word_item['syllable_score_list']):
                syllables.append({'letters': syllable_item.get('letters'),
                                  'quality_score': syllable_item.get('quality_score')})
                if index == 0:
                    word['start'] = syllable_item.get('extent')[0]
                if index == len(word_item['syllable_score_list']) - 1:
                    word['stop'] = syllable_item.get('extent')[1]
        if 'phone_score_list' in word_item:
            for phoneme_item in word_item['phone_score_list']:
                quality_score = Decimal(phoneme_item.get('quality_score'))
                total_overall_score += quality_score
                phonemes.append({'phone': phoneme_item.get('phone'),
                                 'quality_score': quality_score})
        words.append(word)
    if len(phonemes) > 0:
        average_phoneme_score = total_overall_score / Decimal(len(phonemes))
        overall_score = Decimal(average_phoneme_score.quantize(Decimal('1.'), rounding=ROUND_UP))
    return words, syllables, phonemes, overall_score


def process_row_scoring_result(row_result, score_type):
    status = None
    result = {}
    score_overall_metrics = {}
    segment_metrics_list = []
    word_score_list = []
    fidelity_class = None
    text = ''

    if 'status' in row_result:
        status = row_result['status']
    else:
        return 400, {'errors', 'Couldn\'t scoring speech.'}

    if status != 'success':
        result['errors'] = [row_result.get('detail_message', 'error'), ]
        return 400, result

    # getting metrics from SpeechAce scoring API response
    if score_type in row_result:
        score = row_result[score_type] if type(row_result[score_type]) == dict else {}

        if 'fluency' in score:
            fluency = score['fluency'] if type(score['fluency']) == dict else {}
            # try to get overall metrics
            if 'overall_metrics' in fluency:
                score_overall_metrics = fluency['overall_metrics'] if type(score['fluency']) == dict else {}
            # try to get score result by sentences
            if 'segment_metrics_list' in fluency:
                segment_metrics_list = fluency['segment_metrics_list'] \
                    if type(fluency['segment_metrics_list']) == list else []

        # try to get score result by words
        if 'word_score_list' in score:
            word_score_list = score['word_score_list'] if type(score['word_score_list'] == list) else []

        # try to get fidelity_class
        if 'fidelity_class' in score:
            fidelity_class = score['fidelity_class']

        # try to get transcription for speech mode on
        if score_type == 'speech_score' and 'transcript' in score:
            text = score['transcript']

    # process score_overall_metrics to get overall metrics
    overall_metrics = process_score_overall_metrics(score_overall_metrics)

    # calculate ielts_score from segment_metrics_list if it is not in scoring response
    if 'ielts_score' not in overall_metrics and segment_metrics_list:
        overall_metrics['ielts_score'] = process_segment_metrics_list(segment_metrics_list)

    # process word_score_list to get score result by words, syllables, phonemes and overall score based on
    # average score by phonemes
    words, syllables, phonemes, overall_score = process_word_score_list(word_score_list)
    overall_metrics['word_count'] = len(words)
    overall_metrics['syllable_count'] = len(syllables)
    overall_metrics['phone_count'] = len(phonemes)

    # create score result response
    result['overall_score'] = overall_score
    result['overall_metrics'] = overall_metrics
    result['fidelity_class'] = fidelity_class
    result['detailed'] = {
        'words': words,
        'syllables': syllables,
        'phonemes': phonemes
    }
    if score_type == 'speech_score' and text:
        result['transcript'] = text

    return 200, result


class Scorer(object):
    def __init__(self, api_key, api_user_id, api_include_fluency, api_root_url, client_ip=None):
        self.api_key = api_key
        self.api_user_id = api_user_id
        self.api_root_url = api_root_url
        self.api_include_fluency = api_include_fluency
        self._client_ip = client_ip

    def _get_headers(self):
        headers = {}
        if self._client_ip:
            headers['X-Real-IP'] = self._client_ip
        return headers

    def _format_url(self, request_type, output_format):
        version = 'v0.5' if request_type in ['scoring/text', 'scoring/speech'] else 'v0.1'
        relative_url = "/api/%s/%s/%s?key=%s&user_id=%s&dialect=en-us" % (request_type, version, output_format,
                                                                          self.api_key, self.api_user_id,)
        return self.api_root_url + relative_url

    @staticmethod
    def post_process_score(response, request_type='scoring/text'):
        status_code = response.status_code
        if status_code != 200:
            result = {'errors', 'Couldn\'t understand the audio.'}
        else:
            row_result = json.loads(response.text)
            score_type = 'text_score'
            if request_type == 'scoring/speech':
                score_type = 'speech_score'
            status_code, result = process_row_scoring_result(row_result, score_type)
        return status_code, result

    def get_score_speech(self, payload, audio_data, question_info, request_type='scoring/text'):
        if question_info is not None:
            payload['question_info'] = question_info
        files = {'user_audio_file': ('user_audio', audio_data)}
        url = self._format_url(request_type=request_type, output_format='json')
        headers = self._get_headers()
        response = requests.post(url, data=payload, files=files, headers=headers)
        return response

    def score_text_speech(self, text, audio_data, tokenized, question_info=None):
        payload = {
            'text': text,
            'include_fluency': self.api_include_fluency,
        }
        response = self.get_score_speech(payload, audio_data, question_info)
        return self.post_process_score(response)

    def score_free_speech(self, audio_data, tokenized, question_info=None):
        request_type = 'scoring/speech'
        payload = {
            'include_fluency': self.api_include_fluency,
        }
        response = self.get_score_speech(payload, audio_data, question_info, request_type=request_type)
        return self.post_process_score(response, request_type=request_type)
