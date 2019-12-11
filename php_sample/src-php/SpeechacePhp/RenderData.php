<?php
namespace SpeechacePhp;

class RenderData {
    // deafult folder for templates
    static private $folder = 'views';

    static public function changeFolder($folder) {
        self::$folder = $folder;
    }

    static public function render() {
        $_params = [];
        $_obInitialLevel_ = ob_get_level();
        ob_start();
        ob_implicit_flush(false);
        extract($_params, EXTR_OVERWRITE);
        try {
            require(__DIR__."/".self::$folder."/index.php");
            return ob_get_clean();
        } catch (\Exception $e) {
            while (ob_get_level() > $_obInitialLevel_) {
                if (!@ob_end_clean()) {
                    ob_clean();
                }
            }
            throw $e;
        } catch (\Throwable $e) {
            while (ob_get_level() > $_obInitialLevel_) {
                if (!@ob_end_clean()) {
                    ob_clean();
                }
            }
            throw $e;
        }
    }

}