import requests

key = "Insert your Speechace API key here"
api_endpoint = "Insert your Speechace API endpoint here" 
url = api_endpoint + "/api/scoring/text/v9/json"
dialect = "en-us"
user_id = "81ozow"

url += '?' + 'key=' + key + '&dialect=' + dialect + '&user_id=' + user_id

payload ={'text':'apple'};
user_file_handle = open('apple.wav', 'rb')

files = {'user_audio_file': user_file_handle}
response = requests.post(url, data=payload, files=files)
print(response.text)
