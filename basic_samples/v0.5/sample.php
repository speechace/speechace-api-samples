<?php

$key="Insert your API key here";
$api_endpoint='Insert your API end point here';
$ch = curl_init($api_endpoint."/api/scoring/text/v0.5/json?user_id=1234&dialect=en-us&key=".$key);
$opts = array(
    CURLOPT_POST => 1,
    CURLOPT_HTTPHEADER => array("Content-Type:multipart/form-data"),
    CURLOPT_POSTFIELDS => array(
        "text" => "apple",
        "user_audio_file" => curl_file_create("/home/username/apple.wav"),
    ),
    CURLOPT_RETURNTRANSFER => true
);

curl_setopt_array($ch,$opts);
$raw = curl_exec($ch);
if(curl_errno($ch) > 0) {
    echo("There was an error using the speechace api: ".curl_error($ch));
}
else {
    var_dump($raw);
}

curl_close($ch);
?>
