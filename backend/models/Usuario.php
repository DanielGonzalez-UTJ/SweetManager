<?php
/*Acceso a la tabla usuarios*/
class Usuario
{
    public function activoPorId(int $id): ?array
    {
        $st = Database::pdo()->prepare('SELECT id, nombre, usuario, correo, telefono, rol, sexo, cambio_clave_pendiente, ultimo_acceso FROM usuarios WHERE id = ? AND activo = 1');
        $st->execute([$id]);
        $u = $st->fetch();

        return $u ?: null;
    }

    /*Incluye clave_hash para poder verificar la contraseña al iniciar sesión*/
    public function activoPorNombre(string $usuario): ?array
    {
        $st = Database::pdo()->prepare('SELECT id, nombre, usuario, clave_hash, correo, telefono, rol, sexo, cambio_clave_pendiente, ultimo_acceso FROM usuarios WHERE usuario = ? AND activo = 1');
        $st->execute([$usuario]);
        $u = $st->fetch();

        return $u ?: null;
    }

    public function claveHash(int $id): string
    {
        $st = Database::pdo()->prepare('SELECT clave_hash FROM usuarios WHERE id = ?');
        $st->execute([$id]);

        return (string) $st->fetchColumn();
    }

    public function guardarClave(int $id, string $hash): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET clave_hash = ? WHERE id = ?')->execute([$hash, $id]);
    }

    public function marcarAcceso(int $id): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?')->execute([$id]);
    }

    public function actualizarPerfil(int $id, string $nombre, string $correo, ?string $telefono): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id = ?')
            ->execute([$nombre, $correo, $telefono, $id]);
    }

    public function actualizarSexo(int $id, string $sexo): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET sexo = ? WHERE id = ?')->execute([$sexo, $id]);
    }

    public function listarTodos(): array
    {
        return Database::pdo()->query('SELECT id, nombre, usuario, correo, telefono, rol, activo, ultimo_acceso, creado FROM usuarios ORDER BY nombre')->fetchAll();
    }

    public function crear(array $datos): int
    {
        $st = Database::pdo()->prepare('INSERT INTO usuarios (nombre, usuario, clave_hash, correo, telefono, rol, cambio_clave_pendiente) VALUES (?, ?, ?, ?, ?, ?, 1)');
        $st->execute([$datos['nombre'], $datos['usuario'], password_hash($datos['clave'], PASSWORD_DEFAULT), $datos['correo'], $datos['telefono'], $datos['rol']]);
        return (int) Database::pdo()->lastInsertId();
    }

    public function editar(int $id, array $datos): void
    {
        $st = Database::pdo()->prepare('UPDATE usuarios SET nombre = ?, usuario = ?, correo = ?, telefono = ?, rol = ? WHERE id = ?');
        $st->execute([$datos['nombre'], $datos['usuario'], $datos['correo'], $datos['telefono'], $datos['rol'], $id]);
    }

    public function cambiarEstado(int $id, int $activo): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET activo = ? WHERE id = ?')->execute([$activo, $id]);
    }

    public function restablecerClave(int $id, string $hash): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET clave_hash = ?, cambio_clave_pendiente = 1 WHERE id = ?')->execute([$hash, $id]);
    }

    public function marcarCambioClave(int $id): void
    {
        Database::pdo()->prepare('UPDATE usuarios SET cambio_clave_pendiente = 0 WHERE id = ?')->execute([$id]);
    }

}
