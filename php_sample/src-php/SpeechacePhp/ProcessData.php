<?php
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
            "phone_count" => 0
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
        $overallMetricsData = $this->results["text_score"]["fluency"]["overall_metrics"];
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

        return array("overall_metrics" => $summary, "detailed" => $detailed, "overall_score" => (string)$overall_score, "fidelity_class" => $this->results["text_score"]["fidelity_class"]);
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