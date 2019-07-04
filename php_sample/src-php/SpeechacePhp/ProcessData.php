<?php
/* The MIT License
  Copyright 2019 SpeecAce LLC
  Permission is hereby granted, free of charge, to any person obtaining a copy 
  of this software and associated documentation files (the "Software"), to 
  deal in the Software without restriction, including without limitation the 
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is 
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included 
  in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  IN THE SOFTWARE
*/
namespace SpeechacePhp;

class ProcessData extends GetData {

    private $results;

    /**
     * ProcessData constructor.
     * @param $text
     * @param $file
     */
    public function __construct($text, $file)
    {
        parent::__construct($text, $file);
        $this->results = json_decode($this->getResult(), true);
    }

    /**
     * @return bool
     */
    private function checkError(){
        if($this->results["status"] == "error") return true;
        return false;
    }

    /**
     * @return array
     */
    private function preparedData(){
        $result_overall_metrics = array(
            "word_count" => 0,
            "syllable_count" => 0,
            "phone_count" => 0,
        );

        $result_detailed = array(
            "words" => [],
        );

        return array("overall_metrics" => $result_overall_metrics, "detailed" => $result_detailed);
    }


    /**
     * @return array
     */
    private function setFluency(){
        $data = [];
        if ($this->results["text_score"]["fluency"]) {
            $fluency = $this->results["text_score"]["fluency"];
            if ($fluency["overall_metrics"]) {
                if(isset($fluency["overall_metrics"]["pte_score"])){
                    $data["pte_score"] = $fluency["overall_metrics"]["pte_score"];
                }
                $data["audio_length"] = $fluency["overall_metrics"]["duration"];
                $data["wcm"] = $fluency["overall_metrics"]["word_correct_per_minute"];
                $data["pauses"] = $fluency["overall_metrics"]["all_pause_count"];
                $data["pause_duration"] = $fluency["overall_metrics"]["all_pause_duration"];
                $data["mlr"] = $fluency["overall_metrics"]["mean_length_run"];
                $data["ielts_score"] = $fluency["overall_metrics"]["ielts_estimate"];
            }
        }
        return $data;
    }

    /**
     * @return array
     */
    private function calculateTotals(){
        $detailed = $this->preparedData()["detailed"];

        $phonemes = [];
        $syllables = [];

        $words = $this->results["text_score"]["word_score_list"];
        $word_count = 0;
        $word_total_score = 0;
        $syllable_count = 0;
        $syllable_total_score = 0;
        $phone_count = 0;
        $phone_total_score = 0;

        foreach($words as &$word) {
            $word_count += 1;
            $word_total_score += $word["quality_score"];
            foreach($word["syllable_score_list"] as $i => $syllable) {
                $syllable_count += 1;
                $syllable_total_score += $syllable["quality_score"];
                if ($i == 0) {
                    $word["start"] = $syllable["extent"][0];
                }
                if ($i == count($word["syllable_score_list"]) - 1) {
                    $word["stop"] = $syllable["extent"][1];
                }

                $syllModified = array(
                    "letters" => $syllable["letters"],
                    "quality_score" => $syllable["quality_score"]
                );
                array_push($syllables, $syllModified);
            };
            foreach($word["phone_score_list"] as $ind => $phone) {
                $phone_count += 1;
                $phone_total_score += $phone["quality_score"];

                $phoneModified = array(
                    "phone" => $phone["phone"],
                    "quality_score" => $phone["quality_score"]
                );
                array_push($phonemes, $phoneModified);

            };
        };

        $overall_score = ceil($phone_total_score / $phone_count);

        $summary["word_count"] = $word_count;
        $detailed["words"] = $words;

        $detailed["syllables"] = $syllables;
        $detailed["phonemes"] = $phonemes;

        unset($detailed["words"][0]["phone_score_list"]);
        unset($detailed["words"][0]["syllable_score_list"]);

        if ($syllable_count > 0) {
            $summary["syllable_count"] = $syllable_count;
        }
        if ($phone_count > 0) {
            $summary["phone_count"] = $phone_count;
        }

        return array("overall_metrics" => array_merge($summary, $this->setFluency()), "detailed" => $detailed, "overall_score" => (string)$overall_score);
    }

    /**
     * @return string
     */
    public function processedData(){
        if($this->checkError()){
            // return json_encode(array("errors" => [$this->results["detail_message"]]));
            trigger_error($this->results["detail_message"]);
        } else {
            return json_encode($this->calculateTotals());
        }
    }
}