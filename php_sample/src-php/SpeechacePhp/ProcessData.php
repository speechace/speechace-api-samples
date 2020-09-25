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
    public function __construct($text, $file, $request_type)
    {
        parent::__construct($text, $file, $request_type);
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
    private function getSummary(){
        $overallMetricsData = $this->results[$this->request_type."_score"]["fluency"]["overall_metrics"];
        $overall_metrics["audio_length"] = $overallMetricsData["duration"];
        $overall_metrics["ielts_score"] = $overallMetricsData["ielts_estimate"];
        $overall_metrics["mlr"] = $overallMetricsData["mean_length_run"];
        $overall_metrics["pause_duration"] = $overallMetricsData["all_pause_duration"];
        $overall_metrics["pauses"] = $overallMetricsData["all_pause_count"];
        $overall_metrics["pte_score"] = $overallMetricsData["pte_estimate"];
        $overall_metrics["wcm"] = $overallMetricsData["word_correct_per_minute"];
        return $overall_metrics;
    }

    /**
     * @return array
     */
    private function calculateTotals(){
        $detailed = $this->preparedData()["detailed"];

        $phonemes = [];
        $syllables = [];

        $words = $this->results[$this->request_type."_score"]["word_score_list"];
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

        $summary = $this->getSummary();
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

        $processed_result = array("overall_metrics" => $summary, "detailed" => $detailed, "overall_score" => (string)$overall_score, "fidelity_class" => $this->results[$this->request_type."_score"]["fidelity_class"]);
        if ($this->request_type == 'speech'){
            $processed_result['transcript'] = $this->results[$this->request_type."_score"]["transcript"];
        }
        return $processed_result;
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