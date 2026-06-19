export interface Usuario { id: string; nombre: string; activo: boolean; }
export interface Tarea { id: string; nombre: string; esDefault: boolean; activo: boolean; }
export interface ConfiguracionResponse { usuarios: Usuario[]; tareas: Tarea[]; }

// URL OPERATIVA DIARIA REAL DE GOOGLE APPS SCRIPT
const URL_WEB_APP = "https://script.google.com/macros/s/AKfycbyZJ9CjNob4jYvPI45KvITl-PDYmypSs1Fuh_44HCZCPnn1KWaGTuVImMFp9YBRQOtQ/exec";

export const obtenerConfiguracion = async (): Promise<ConfiguracionResponse> => {
  try {
    const res = await fetch(`${URL_WEB_APP}?_t=${Date.now()}`);
    return await res.json();
  } catch (error) { 
    console.error("Error al obtener configuración:", error);
    return { usuarios: [], tareas: [] }; 
  }
};

export const enviarFichaje = async (datos: any): Promise<void> => {
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(datos) });
};

export const añadirConfiguracion = async (tipo: string, nombre: string, esDefault: string = "SÍ") => {
  const payload = { tipoAccion: tipo, nombre: nombre.trim(), esDefault };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const eliminarRegistro = async (fecha: string, hEntrada: string, hSalida: string, usuarioId: string, tareaId: string) => {
  const payload = { tipoAccion: "borrar_registro", fecha, horaEntrada: hEntrada, horaSalida: hSalida, usuarioId, tareaId };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const actualizarRegistro = async (datos: any) => {
  const payload = { tipoAccion: "editar_registro", ...datos };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const editarConfiguracion = async (tipo: string, id: string, nuevoNombre: string) => {
  const payload = { tipoAccion: "editar_config", tipo, id, nuevoNombre: nuevoNombre.trim() };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const toggleEstadoConfiguracion = async (tipo: string, id: string) => {
  const payload = { tipoAccion: "toggle_estado_config", tipo, id };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const archivarDatosAntiguos = async (fechaCorte: string) => {
  const payload = { tipoAccion: "archivar_datos", fechaCorte };
  await fetch(URL_WEB_APP, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const obtenerCodigoPostal = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    return data.address?.postcode || "S/N";
  } catch (error) { 
    console.error("Error al geocodificar CP:", error);
    return "Error CP"; 
  }
};

export const obtenerRegistros = async (incluirHistorico: boolean = false): Promise<any[]> => {
  try {
    const res = await fetch(`${URL_WEB_APP}?action=get_registros&incluirHistorico=${incluirHistorico}&_t=${Date.now()}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) { 
    console.error("Error al obtener registros:", error);
    return []; 
  }
};
