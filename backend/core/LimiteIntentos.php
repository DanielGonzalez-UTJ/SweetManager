<?php
/*Cuenta los intentos fallidos de inicio de sesión en archivos de backend/storage/intentos*/
class LimiteIntentos
{
    private $carpeta;
    private $ventana;

    public function __construct()
    {
        $config = Config::get('app', 'login', []);
        $this->carpeta = BASE_PATH . '/storage/intentos';
        $this->ventana = (int) ($config['ventana'] ?? 900);
    }

    /*Segundos que faltan para poder reintentar, cero si no está bloqueado*/
    public function bloqueoRestante(string $clave, int $maximo): int
    {
        $texto = @file_get_contents($this->ruta($clave));
        $d = $this->interpretar($texto === false ? '' : $texto);

        if ($d['n'] < $maximo) {
            return 0;
        }

        return max(0, $d['ultimo'] + $this->ventana - time());
    }

    public function registrarFallo(string $clave): void
    {
        if (!is_dir($this->carpeta) && !@mkdir($this->carpeta, 0775, true) && !is_dir($this->carpeta)) {
            error_log('SweetManager no pudo crear la carpeta backend/storage/intentos');

            return;
        }

        $f = @fopen($this->ruta($clave), 'c+');

        if (!$f) {
            error_log('SweetManager no pudo escribir en backend/storage/intentos');

            return;
        }

        if (flock($f, LOCK_EX)) {
            $d = $this->interpretar((string) stream_get_contents($f));
            $d['n']++;
            $d['ultimo'] = time();
            ftruncate($f, 0);
            rewind($f);
            fwrite($f, json_encode($d));
            fflush($f);
            flock($f, LOCK_UN);
        }

        fclose($f);

        if (random_int(1, 25) === 1) {
            $this->limpiarViejos();
        }
    }

    public function limpiar(string $clave): void
    {
        @unlink($this->ruta($clave));
    }

    private function ruta(string $clave): string
    {
        return $this->carpeta . '/' . hash('sha256', $clave) . '.json';
    }

    /*Si el último intento ya salió de la ventana, el contador empieza otra vez*/
    private function interpretar(string $texto): array
    {
        $d = json_decode($texto, true);

        if (!is_array($d) || !isset($d['n'], $d['ultimo']) || time() - (int) $d['ultimo'] > $this->ventana) {
            return ['n' => 0, 'ultimo' => 0];
        }

        return ['n' => (int) $d['n'], 'ultimo' => (int) $d['ultimo']];
    }

    private function limpiarViejos(): void
    {
        foreach (glob($this->carpeta . '/*.json') ?: [] as $archivo) {
            if (filemtime($archivo) < time() - $this->ventana * 2) {
                @unlink($archivo);
            }
        }
    }
}
