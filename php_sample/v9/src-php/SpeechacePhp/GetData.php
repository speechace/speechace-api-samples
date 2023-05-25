<?php

namespace SpeechacePhp;

class GetData {

    private $base_endpoint = "Insert your Speechace API endpoint here";
    private $api_version = "v9";
    private $apikey = "Insert your Speechace API key here";
    public $userId = "sptest";
    public $includeFluency = 0;
    public $text, $file;

    public function __construct($text, $file, $request_type) {
        $this->text = $text;
        $this->file = $file;
        $this->request_type = $request_type;
    }

    /**
     * @param $userId
     */
    public function setUserId($userId){
        $this->userId = $userId;
    }

    /**
     * @return mixed|string
     */
    public function getResult(){
	    $ch = curl_init(
		    $this->base_endpoint."/api/scoring/".
		    $this->request_type."/".
		    $this->api_version."/json".
		    "?key=".$this->apikey.
		    "&user_id=".$this->userId.
		    "&dialect="."en-us"
	    	  );

        curl_setopt_array($ch, $this->curlOptions());
        $raw = curl_exec($ch);

        if(curl_errno($ch) > 0) {
            return json_encode(array("message" => "There was an error using the speechace api: ".curl_error($ch)));
        }

        curl_close($ch);
        return $raw;
    }

    /**
     * @return array
     */
    protected function curlOptions(){
        $fields = array(
            "user_audio_file" => curl_file_create($this->file["tmp_name"]),
            "user_id" => $this->userId,
            "include_fluency" => $this->includeFluency,
        );
        if ($this->text) {
            $fields["text"] = $this->text;
        }

        return array(
            CURLOPT_POST => 1,
            CURLOPT_HTTPHEADER => array("Content-Type:multipart/form-data"),
            CURLOPT_POSTFIELDS => $fields,
            CURLOPT_RETURNTRANSFER => true
        );
    }

}
