<?php
require_once './vendor/autoload.php';

use SpeechacePhp\RenderData;
use SpeechacePhp\ProcessData;

if($_POST && $_FILES){
    $result = new ProcessData($_POST["text"], $_FILES["audio_data"]);
    echo $result->processedData();
} else {
    echo RenderData::render();
}




