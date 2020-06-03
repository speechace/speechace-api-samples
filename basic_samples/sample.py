import requests
url = "https://api.speechace.co/api/scoring/text/v0.5/json"
key = "Insert_Your_key_here"
dialect = "en-us"
user_id = "81ozow"

url += '?' + 'key=' + key + '&dialect=' + dialect + '&user_id=' + user_id

payload ={'text':'apple'};
user_file_handle = open('apple.wav', 'rb')

files = {'user_audio_file': user_file_handle}
response = requests.post(url, data=payload, files=files)
print(response.text)