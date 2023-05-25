<?php
require_once './vendor/autoload.php';

use SpeechacePhp\RenderData;
use SpeechacePhp\ProcessData;

if($_POST && $_FILES){
    $audio = $_FILES["audio_data"];

    if(isset($_POST["speech"]) && $_POST["speech"] == "true"){
        $text = '';
        $request_type = 'speech';
    } else {
        $text = $_POST["text"];
        $request_type = 'text';
    }

    $result = new ProcessData($text, $audio, $request_type);
    error_log(print_r($result, true));

    echo $result->processedData();
} else {
    echo RenderData::render();
}




