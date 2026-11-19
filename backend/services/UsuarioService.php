<?php
/*Reglas de negocio para perfiles y administración de cuentas*/
class UsuarioService
{
    public function actualizarPerfil(int $id, string $nombre, string $correo, ?string $telefono): void
    {
        try { (new Usuario())->actualizarPerfil($id, $nombre, $correo, $telefono); }
        catch (PDOException $e) { error_log($e->getMessage()); throw new ApiError($e->getCode() === '23000' ? 'Ese correo ya lo usa otra cuenta' : 'No se pudo guardar el perfil', 409); }
    }

    public function cambiarSexo(int $id, string $sexo): void { (new Usuario())->actualizarSexo($id, $sexo); }

    public function cambiarClave(int $id, string $actual, string $nueva): void
    {
        $usuarios = new Usuario();
        if (!(new AuthService())->claveValida($actual, $usuarios->claveHash($id))) throw new ApiError('La contraseña actual no es correcta', 403);
        $this->validarClave($nueva);
        $usuarios->guardarClave($id, password_hash($nueva, PASSWORD_DEFAULT));
        $usuarios->marcarCambioClave($id);
    }

    private function validarClave(string $clave): void
    {
        if (strlen($clave) > 72) throw new ApiError('La contraseña es demasiado larga. Prueba con una más corta.');
        if (strlen($clave) < 8) throw new ApiError('La contraseña debe tener al menos 8 caracteres');
        if (!preg_match('/[0-9]/', $clave)) throw new ApiError('Agrega al menos un número a tu contraseña');
    }

    private function claveTemporal(): string
    {
        $letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        $clave = $letras[random_int(0, strlen($letras)-1)] . $letras[random_int(0, strlen($letras)-1)] . random_int(10, 99) . bin2hex(random_bytes(3));
        return $clave;
    }

    public function listar(): array { return (new Usuario())->listarTodos(); }

    public function guardar(array $d): array
    {
        $this->validarDatos($d);
        $modelo = new Usuario();
        try {
            if (!empty($d['id'])) {
                $id = (int)$d['id'];
                if ($id === (int) ($_SESSION['uid'] ?? 0) && $d['rol'] !== 'admin') throw new ApiError('No puedes quitarte el rol de administrador de tu propia cuenta');
                if ($id > 0 && $d['rol'] !== 'admin') {
                    $st = Database::pdo()->query("SELECT COUNT(*) FROM usuarios WHERE rol='admin' AND activo=1");
                    $admins = (int)$st->fetchColumn();
                    $st = Database::pdo()->prepare('SELECT rol FROM usuarios WHERE id=?'); $st->execute([$id]);
                    if ($st->fetchColumn() === 'admin' && $admins <= 1) throw new ApiError('No puedes quitar el rol al último administrador');
                }
                $modelo->editar($id, $d);
                return ['id'=>$id];
            }
            $d['clave'] = $this->claveTemporal();
            return ['id'=>$modelo->crear($d), 'clave_temporal'=>$d['clave']];
        } catch (PDOException $e) { error_log($e->getMessage()); throw new ApiError('El usuario o correo ya está registrado, o no se pudo guardar', 409); }
    }

    private function validarDatos(array $d): void
    {
        foreach (['nombre','usuario','correo','rol'] as $campo) if (trim((string)($d[$campo] ?? '')) === '') throw new ApiError('Completa todos los campos obligatorios');
        if (mb_strlen($d['nombre']) > 100 || !preg_match('/^[A-Za-z0-9._-]{3,30}$/', $d['usuario'])) throw new ApiError('Revisa el nombre o el usuario (3 a 30 caracteres, sin espacios)');
        if (!filter_var($d['correo'], FILTER_VALIDATE_EMAIL) || mb_strlen($d['correo']) > 120) throw new ApiError('Escribe un correo válido');
        if (!in_array($d['rol'], ['admin','cajero','almacenista'], true)) throw new ApiError('Selecciona un rol válido');
        $telefono = preg_replace('/\D+/', '', (string)($d['telefono'] ?? ''));
        if ($telefono !== '' && !preg_match('/^\d{10}$/', $telefono)) throw new ApiError('El teléfono debe tener exactamente 10 dígitos');
        $d['telefono'] = $telefono === '' ? null : $telefono;
    }

    public function estado(int $id, int $activo, int $actual): void
    {
        if ($id === $actual && !$activo) throw new ApiError('No puedes desactivar tu propia cuenta');
        $modelo = new Usuario();
        if (!$activo) {
            $admins = (int) Database::pdo()->query("SELECT COUNT(*) FROM usuarios WHERE rol='admin' AND activo=1")->fetchColumn();
            $st = Database::pdo()->prepare("SELECT rol, activo FROM usuarios WHERE id=?"); $st->execute([$id]); $objetivo = $st->fetch();
            if ($objetivo && $objetivo['rol']==='admin' && $objetivo['activo'] && $admins <= 1) throw new ApiError('No puedes desactivar al último administrador');
        }
        $modelo->cambiarEstado($id, $activo);
    }

    public function restablecer(int $id): string
    {
        $clave = $this->claveTemporal();
        (new Usuario())->restablecerClave($id, password_hash($clave, PASSWORD_DEFAULT));
        return $clave;
    }
}
