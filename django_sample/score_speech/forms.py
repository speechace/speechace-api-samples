from django import forms

# 60 seconds of PCM encoded 16KHz mono 16 bit audio
MAX_USER_AUDIO_FILE_SIZE = 60 * 16000 * 2


class ScoringTextSpeechForm(forms.Form):
    audio_data = forms.FileField(
        required=True,
        max_length=MAX_USER_AUDIO_FILE_SIZE,
        allow_empty_file=False)
    text = forms.CharField(required=True, widget=forms.Textarea())
