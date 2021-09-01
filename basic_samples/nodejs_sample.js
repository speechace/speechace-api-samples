var axios = require('axios');
var FormData = require('form-data');
var fs = require('fs');
var data = new FormData();
var key = 'Insert your Speechace API key here';

data.append('text', 'apple');
data.append('user_audio_file', fs.createReadStream('apple.wav'));
data.append('question_info', '\'u1/q1\'');

var config = {
  method: 'post',
  url: 'https://api.speechace.co/api/scoring/text/v0.5/json?key=' + key + '&dialect=en-us&user_id=XYZ-ABC-99001',
  headers: { 
    ...data.getHeaders()
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});
