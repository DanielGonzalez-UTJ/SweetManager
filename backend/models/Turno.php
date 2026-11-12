<?php
/*Acceso a la tabla turnos_caja y a la vista v_corte_turno*/
class Turno
{
    public function abiertoDe(int $usuarioId): ?array
    {
        $st = Database::pdo()->prepare('SELECT id, usuario_id, fondo_inicial, apertura FROM turnos_caja WHERE usuario_id = ? AND cierre IS NULL ORDER BY id DESC LIMIT 1');
        $st->execute([$usuarioId]);
        $t = $st->fetch();

        return $t ?: null;
    }

    /*El cajero ve su turno abierto y el administrador el más reciente*/
    public function abiertoVisible(int $usuarioId, string $rol): ?array
    {
        $st = Database::pdo()->prepare("SELECT id, fondo_inicial, apertura FROM turnos_caja WHERE cierre IS NULL AND (usuario_id = ? OR ? = 'admin') ORDER BY id DESC LIMIT 1");
        $st->execute([$usuarioId, $rol]);
        $t = $st->fetch();

        return $t ?: null;
    }

    public function abrir(int $usuarioId, string $fondo): void
    {
        Database::pdo()->prepare('INSERT INTO turnos_caja (usuario_id, fondo_inicial) VALUES (?, ?)')->execute([$usuarioId, $fondo]);
    }

    public function resumen(int $turnoId): ?array
    {
        $st = Database::pdo()->prepare('SELECT fondo_inicial, efectivo, tarjeta, efectivo_esperado FROM v_corte_turno WHERE turno_id = ?');
        $st->execute([$turnoId]);
        $r = $st->fetch();

        return $r ?: null;
    }

    /*Bloquea el turno mientras se cierra, así no entran ventas a medio corte*/
    public function bloquearAbierto(int $turnoId): bool
    {
        $st = Database::pdo()->prepare('SELECT id FROM turnos_caja WHERE id = ? AND cierre IS NULL FOR UPDATE');
        $st->execute([$turnoId]);

        return $st->fetchColumn() !== false;
    }

    public function cerrar(int $turnoId, float $esperado, string $contado, float $diferencia): int
    {
        $st = Database::pdo()->prepare('UPDATE turnos_caja SET cierre = NOW(), efectivo_esperado = ?, efectivo_contado = ?, diferencia = ? WHERE id = ? AND cierre IS NULL');
        $st->execute([$esperado, $contado, $diferencia, $turnoId]);

        return $st->rowCount();
    }
}
