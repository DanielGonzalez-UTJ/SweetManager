<?php
/*Inicio de sesión, verificación de contraseñas y límite de intentos fallidos*/
class AuthService
{
    public function claveValida(string $clave, string $hash): bool
    {
        if (password_verify($clave, $hash)) {
            return true;
        }

        /*Compatibilidad temporal con las claves SHA-256 del SQL antiguo*/
        return preg_match('/^[a-f0-9]{64}$/i', $hash) === 1
            && hash_equals(strtolower($hash), hash('sha256', $clave));
    }

    /*Devuelve el usuario con su acceso anterior, la sesión la abre el controlador*/
    public function iniciarSesion(string $usuario, string $clave, string $ip): array
    {
        $config = Config::get('app', 'login', []);
        $limite = new LimiteIntentos();
        $porUsuario = 'usuario|' . strtolower($usuario) . '|' . $ip;
        $porIp = 'ip|' . $ip;

        $espera = max(
            $limite->bloqueoRestante($porUsuario, (int) ($config['max_por_usuario'] ?? 5)),
            $limite->bloqueoRestante($porIp, (int) ($config['max_por_ip'] ?? 20))
        );

        if ($espera > 0) {
            throw new ApiError('Demasiados intentos fallidos, espera ' . (int) ceil($espera / 60) . ' minuto(s) para volver a intentar', 429, ['espera' => $espera]);
        }

        $usuarios = new Usuario();
        $u = $usuarios->activoPorNombre($usuario);

        if (!$u || !$this->claveValida($clave, $u['clave_hash'])) {
            $limite->registrarFallo($porUsuario);
            $limite->registrarFallo($porIp);
            usleep(400000);
            throw new ApiError('Usuario o contraseña incorrectos', 401);
        }

        $limite->limpiar($porUsuario);

        /*Las claves guardadas con SHA2 se cambian a bcrypt al entrar*/
        if (preg_match('/^[a-f0-9]{64}$/i', $u['clave_hash']) === 1) {
            $usuarios->guardarClave((int) $u['id'], password_hash($clave, PASSWORD_DEFAULT));
        }

        $usuarios->marcarAcceso((int) $u['id']);

        return $u;
    }
}
