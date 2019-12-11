from django.urls import re_path

from .views import CsrfTemplateView, scoring_text_speech

app_name = 'score_speech'
urlpatterns = [
    re_path(r'^$', CsrfTemplateView.as_view(template_name='index.html'), name='index'),
    re_path(r'^score-text-speech/$', scoring_text_speech, name='score_text_speech'),
]
