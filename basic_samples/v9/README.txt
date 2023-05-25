Quick start
===========

This folder along with this readme file contains sample code and audio files
to help you get started with the Speechace API.

Intsructions:

1. First download the following three audio files:
 
a) apple.wav - contains the native English pronunciation for the word apple.
 
b) someparents.wav - contains the native English pronunciation for the sentence: 'Some parents admire famous athletes as strong role models, so they name their children after them'
 
c) taylorhad.wav - contains the native English pronunciation for the sentence: "'Taylor had so many homework assignments that she had no time to watch TV'
 

2. Use the following curl requests to evaluate the pronunciation quality of the files available above:

a) API call for word "apple"
 
curl --form text='apple' --form user_audio_file=@/path/to/apple.wav "https://api.speechace.co/api/scoring/text/v0.1/json?key=Insert_Your_API_Key_Here&user_id=002&dialect=en-us" | python -m json.tool

b) API call for 1st sentence
 
curl --form text='Some parents admire famous athletes as strong|role models, so they name their children after them' --form user_audio_file=@/path/to/someparents.wav "https://api.speechace.co/api/scoring/text/v0.1/json?key=Insert_Your_API_Key_Here&user_id=002&dialect=en-us" | python -m json.tool

c) API call for 2nd sentence
 
curl --form text='Taylor had so many homework assignments that she had no time to watch TV' --form user_audio_file=@/path/to/taylorhad.wav "https://api.speechace.co/api/scoring/text/v0.1/json?key=Insert_Your_API_Key_Here&user_id=002&dialect=en-us" | python -m json.tool

Notice that in both (b) and (c) above you will have to change the value of user_audio_file to the location where you downloaded the audio files. Also note that on Windows systems you can specify regular Windows path such as --form user_audio_file=@c:\users\xyz\downloads\apple.wav
 

3. For any other word or sentence, you can just specify the text using --form text=<your word or sentence> and provide an audio file using --form user_audio_file=<audio file for evaluation>. We have a large dictionary of over 85,000 words and can accommodate almost any word or sentence. If there is a specific word that is missing then just let us know and we will add that. 
 
We can also evaluate .mp3 files and any other audio format.

Need Help ?
===========

Email support at speech ace dot com
