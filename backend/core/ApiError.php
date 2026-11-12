<?php
/*Error controlado, el mensaje y el código HTTP sí se muestran al usuario*/
class ApiError extends Exception
{
    private $estado;
    private $extra;

    public function __construct(string $mensaje, int $estado = 400, array $extra = [])
    {
        parent::__construct($mensaje);
        $this->estado = $estado;
        $this->extra = $extra;
    }

    public function estado(): int
    {
        return $this->estado;
    }

    public function extra(): array
    {
        return $this->extra;
    }
}
