<?php
/*Caja del cajero, abrir, ver el resumen y cerrar*/
class TurnoController
{
    public function resumen(): void
    {
        $r = (new TurnoService())->resumen(Session::usuario());

        Response::json(['ok' => true, 'resumen' => Pantalla::resumenTurno($r)]);
    }

    public function abrir(): void
    {
        $d = Request::cuerpo();

        (new TurnoService())->abrir(Session::usuario(), $d['fondo'] ?? null);

        Response::json(['ok' => true]);
    }

    public function cerrar(): void
    {
        $d = Request::cuerpo();
        $r = (new TurnoService())->cerrar(Session::usuario(), $d['contado'] ?? null);

        Response::json(['ok' => true, 'esperado' => $r['esperado'], 'diferencia' => $r['diferencia']]);
    }
}
