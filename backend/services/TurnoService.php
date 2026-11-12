<?php
/*Caja del cajero, abrir, ver el resumen y cerrar*/
class TurnoService
{
    /*Fila de v_corte_turno del turno abierto del usuario*/
    public function resumen(array $u): array
    {
        $turno = (new Turno())->abiertoDe((int) $u['id']);

        if (!$turno) {
            throw new ApiError('No tienes una caja abierta', 409);
        }

        return $this->corte((int) $turno['id']);
    }

    public function abrir(array $u, $fondo): void
    {
        $turnos = new Turno();

        if ($turnos->abiertoDe((int) $u['id'])) {
            throw new ApiError('Ya tienes una caja abierta', 409);
        }

        if (!is_numeric($fondo) || $fondo < 0 || $fondo > 1000000) {
            throw new ApiError('Escribe un fondo válido');
        }

        $turnos->abrir((int) $u['id'], number_format((float) $fondo, 2, '.', ''));
    }

    /*Devuelve el efectivo esperado y la diferencia contra lo contado*/
    public function cerrar(array $u, $contado): array
    {
        $turnos = new Turno();
        $turno = $turnos->abiertoDe((int) $u['id']);

        if (!$turno) {
            throw new ApiError('No tienes una caja abierta', 409);
        }

        if (!is_numeric($contado) || $contado < 0) {
            throw new ApiError('Escribe el efectivo contado');
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();

        try {
            if (!$turnos->bloquearAbierto((int) $turno['id'])) {
                throw new ApiError('No tienes una caja abierta', 409);
            }

            $esperado = round((float) $this->corte((int) $turno['id'])['efectivo_esperado'], 2);
            $diferencia = round((float) $contado - $esperado, 2);

            if ($turnos->cerrar((int) $turno['id'], $esperado, number_format((float) $contado, 2, '.', ''), $diferencia) === 0) {
                throw new ApiError('No tienes una caja abierta', 409);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            Database::revertir();
            throw $e;
        }

        return ['esperado' => $esperado, 'diferencia' => $diferencia];
    }

    private function corte(int $turnoId): array
    {
        $r = (new Turno())->resumen($turnoId);

        if (!$r) {
            throw new ApiError('No se encontró el turno', 404);
        }

        return $r;
    }
}
