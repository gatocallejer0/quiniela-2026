export type Perfil = {
  id: string;
  nombre: string;
  es_admin: boolean;
  pagado: boolean;
};

export type Partido = {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  inicio: string; // ISO UTC
  grupo: string | null;
  fase: string | null;
  goles_local_final: number | null;
  goles_visitante_final: number | null;
  finalizado: boolean;
};

export type Pronostico = {
  id?: number;
  usuario_id: string;
  partido_id: number;
  goles_local: number;
  goles_visitante: number;
};

export type FilaTabla = {
  usuario_id: string;
  nombre: string;
  jugados: number;
  puntos: number;
  pagado: boolean;
};

export type Premio = {
  id?: number;
  posicion: number;
  descripcion: string;
  valor: string | null;
};

export type Regla = {
  id?: number;
  orden: number;
  titulo: string;
  descripcion: string | null;
};

export type PremioAdicional = {
  id?: number;
  descripcion: string;
  valor: string | null;
};

export type PuntosAdicional = {
  usuario_id: string;
  puntos: number;
};
