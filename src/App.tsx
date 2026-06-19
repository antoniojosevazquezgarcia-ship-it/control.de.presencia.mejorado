import { useState, useEffect, useMemo } from 'react';
import { 
  obtenerConfiguracion, 
  enviarFichaje, 
  obtenerCodigoPostal, 
  obtenerRegistros, 
  añadirConfiguracion, 
  eliminarRegistro, 
  actualizarRegistro, 
  editarConfiguracion, 
  toggleEstadoConfiguracion, 
  archivarDatosAntiguos
} from './api';
import type { Usuario, Tarea } from './api';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  LogOut, 
  Printer, 
  MapPin, 
  AlertTriangle, 
  CalendarDays, 
  User, 
  FolderPlus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

function App() {
  const [tabActiva, setTabActiva] = useState('fichaje');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  
  // Estados para salida de la aplicación y modal de fichaje exitoso
  const [appExited, setAppExited] = useState(false);
  const [fichajeExitosoModal, setFichajeExitosoModal] = useState<{ accion: string; hora: string; cp?: string } | null>(null);
  
  // Persistencia de los estados cargada desde localStorage
  const [usuarioId, setUsuarioId] = useState(() => localStorage.getItem('cp_usuarioId') || '');
  const [tareaId, setTareaId] = useState(() => localStorage.getItem('cp_tareaId') || '');
  const [usuarioDiarioId, setUsuarioDiarioId] = useState(() => localStorage.getItem('cp_usuarioDiarioId') || 'TODOS');
  const [tareaDiarioId, setTareaDiarioId] = useState(() => localStorage.getItem('cp_tareaDiarioId') || 'TODOS');
  const [usuarioAnalisisId, setUsuarioAnalisisId] = useState(() => localStorage.getItem('cp_usuarioAnalisisId') || '');
  
  const [nuevoOperario, setNuevoOperario] = useState('');
  const [nuevoCentro, setNuevoCentro] = useState('');
  const [registrosBrutos, setRegistrosBrutos] = useState<any[]>([]);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'exito' | 'error' | 'info' } | null>(null);
  
  // Estados de Históricos, Edición e Impresión
  const [incluirHistorico, setIncluirHistorico] = useState(false);
  const [fechaCorteArchivo, setFechaCorteArchivo] = useState('');
  
  // Modales
  const [editando, setEditando] = useState<any>(null);
  const [editandoConfig, setEditandoConfig] = useState<{ tipo: string; id: string; nombre: string } | null>(null);
  
  // Modal de Fichaje Manual y Resolución de Huérfanos
  const [modalManualOpen, setModalManualOpen] = useState(false);
  const [formManualUser, setFormManualUser] = useState('');
  const [formManualTask, setFormManualTask] = useState('');
  const [formManualDate, setFormManualDate] = useState('');
  const [formManualTime, setFormManualTime] = useState('');
  const [formManualAction, setFormManualAction] = useState('Entrada');
  const [formManualIsResolution, setFormManualIsResolution] = useState(false);

  // Reloj en tiempo real para hacer el diseño más dinámico y profesional
  const [horaActualLocal, setHoraActualLocal] = useState('');
  const [fechaActualLocal, setFechaActualLocal] = useState('');

  const [filtroDesde, setFiltroDesde] = useState(() => {
    const hoy = new Date();
    const lunes = new Date(hoy.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1)));
    return lunes.toISOString().split('T')[0];
  });
  const [filtroHasta, setFiltroHasta] = useState(() => new Date().toISOString().split('T')[0]);

  // Sincronizar persistencia con localStorage
  useEffect(() => {
    localStorage.setItem('cp_usuarioId', usuarioId);
  }, [usuarioId]);

  useEffect(() => {
    localStorage.setItem('cp_tareaId', tareaId);
  }, [tareaId]);

  useEffect(() => {
    localStorage.setItem('cp_usuarioDiarioId', usuarioDiarioId);
  }, [usuarioDiarioId]);

  useEffect(() => {
    localStorage.setItem('cp_tareaDiarioId', tareaDiarioId);
  }, [tareaDiarioId]);

  useEffect(() => {
    localStorage.setItem('cp_usuarioAnalisisId', usuarioAnalisisId);
  }, [usuarioAnalisisId]);

  // Actualizar reloj dinámico
  useEffect(() => {
    const updateTime = () => {
      const ahora = new Date();
      setHoraActualLocal(ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setFechaActualLocal(ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatearFechaES = (fechaISO: string) => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fechaISO;
  };

  const convertToISODate = (fechaES: string) => {
    if (!fechaES) return '';
    const partes = fechaES.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return fechaES;
  };

  const convertToESDate = (fechaISO: string) => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaISO;
  };

  const convertTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  useEffect(() => {
    const inicializar = async () => {
      setCargandoConfig(true);
      try {
        const [config, registros] = await Promise.all([obtenerConfiguracion(), obtenerRegistros(false)]);
        setUsuarios(config.usuarios || []);
        setTareas(config.tareas || []);
        setRegistrosBrutos(registros || []);
        
        // 1. Sincronización del Usuario por Defecto (si no hay guardado en localStorage)
        const usuariosActivos = (config.usuarios || []).filter(u => u.activo !== false);
        if (usuariosActivos.length > 0) {
          if (!usuarioId) {
            setUsuarioId(''); // Dejar vacío para forzar selección la primera vez
          }
          if (!usuarioAnalisisId) {
            setUsuarioAnalisisId(usuariosActivos[0].id);
          }
        }
        
        // 2. Sincronización del Centro por Defecto
        const tareasActivas = (config.tareas || []).filter(t => t.activo !== false);
        if (tareasActivas.length > 0 && !tareaId) {
          const def = tareasActivas.find((t: Tarea) => t.esDefault);
          setTareaId(def ? def.id : tareasActivas[0].id);
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setCargandoConfig(false); 
      }
    };
    inicializar();
  }, []);

  const refrescarDatos = async (forzarHistorico?: boolean) => {
    setRefrescando(true);
    const consultarH = forzarHistorico !== undefined ? forzarHistorico : incluirHistorico;
    const data = await obtenerRegistros(consultarH);
    setRegistrosBrutos(data);
    setRefrescando(false);
  };

  useEffect(() => {
    if (tabActiva !== 'fichaje' && !cargandoConfig) {
      refrescarDatos();
    }
  }, [tabActiva, incluirHistorico, cargandoConfig]);

  const handlePrint = () => window.print();

  // Calcular dinámicamente el estado actual del usuario hoy para el indicador y alertas
  const estadoUsuarioHoy = useMemo(() => {
    if (!usuarioId) return null;
    const hoyES = new Date().toLocaleDateString('es-ES');
    
    // Obtener los marcajes del usuario hoy
    const registrosHoy = registrosBrutos.filter((r: any[], idx: number) => {
      if (idx === 0 || !r[0] || r[0] === "Fecha") return false;
      const [fR, , , , , , , , uId] = r;
      return String(uId) === String(usuarioId) && fR === hoyES;
    });

    if (registrosHoy.length === 0) return { estado: 'SIN_REGISTROS' };

    // Ordenar por hora para sacar el último marcaje
    const ordenados = [...registrosHoy].sort((a, b) => {
      return convertTimeToMinutes(a[1]) - convertTimeToMinutes(b[1]);
    });
    const ultimo = ordenados[ordenados.length - 1];

    return {
      estado: ultimo[3] === 'Entrada' ? 'DENTRO' : 'FUERA',
      hora: ultimo[1],
      centro: ultimo[4]
    };
  }, [usuarioId, registrosBrutos]);

  const handleFichaje = async (accion: 'Entrada' | 'Salida') => {
    if (!usuarioId) return;

    // Control de robustez: Advertencia interactiva por doble Entrada o doble Salida
    if (estadoUsuarioHoy) {
      if (accion === 'Entrada' && estadoUsuarioHoy.estado === 'DENTRO') {
        const confirmar = window.confirm(
          `¡Atención! Tu último registro de hoy es de ENTRADA (a las ${estadoUsuarioHoy.hora} en ${estadoUsuarioHoy.centro}). ` + 
          `¿Estás seguro de que quieres registrar otra ENTRADA sin haber cerrado la jornada anterior?`
        );
        if (!confirmar) return;
      } else if (accion === 'Salida' && estadoUsuarioHoy.estado === 'FUERA') {
        const confirmar = window.confirm(
          `¡Atención! Tu último registro de hoy es de SALIDA (a las ${estadoUsuarioHoy.hora}). ` + 
          `¿Estás seguro de que quieres registrar otra SALIDA sin haber fichado la entrada previa?`
        );
        if (!confirmar) return;
      } else if (accion === 'Salida' && estadoUsuarioHoy.estado === 'SIN_REGISTROS') {
        const confirmar = window.confirm(
          `¡Atención! No tienes ningún registro de ENTRADA para el día de hoy. ` + 
          `¿Quieres registrar una SALIDA de todos modos?`
        );
        if (!confirmar) return;
      }
    }

    const user = usuarios.find((u: Usuario) => u.id === usuarioId);
    const task = tareas.find((t: Tarea) => t.id === tareaId);
    const fechaActual = new Date().toLocaleDateString('es-ES');
    const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const nuevoRegistroProvisional = [
      fechaActual, horaActual, user?.nombre || '', accion, task?.nombre || '',
      '0', '0', 'Sincronizando...', user?.id || '', task?.id || ''
    ];
    
    // Actualizar localmente de inmediato para dar feedback rápido
    setRegistrosBrutos(prev => [...prev, nuevoRegistroProvisional]);
    setMensaje({ texto: `¡Marcaje de ${accion.toUpperCase()} registrado! Sincronizando...`, tipo: 'info' });

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const cp = await obtenerCodigoPostal(pos.coords.latitude, pos.coords.longitude);
        await enviarFichaje({
          tipoAccion: "fichaje", fecha: fechaActual, hora: horaActual,
          usuarioId: user?.id, usuarioNombre: user?.nombre, accion,
          tareaId: task?.id, tareaNombre: task?.nombre,
          latitud: pos.coords.latitude, longitud: pos.coords.longitude, observaciones: cp 
        });
        setRegistrosBrutos(prev => prev.map(r => 
          (r[8] === user?.id && r[9] === task?.id && r[0] === fechaActual && r[1] === horaActual)
            ? [fechaActual, horaActual, user?.nombre || '', accion, task?.nombre || '', String(pos.coords.latitude), String(pos.coords.longitude), cp, user?.id || '', task?.id || '']
            : r
        ));
        setMensaje({ texto: `¡${accion} confirmada con éxito (CP: ${cp})!`, tipo: 'exito' });
        setTimeout(() => setMensaje(null), 3000);
        setFichajeExitosoModal({ accion, hora: horaActual, cp });
      } catch (e) { 
        console.error(e);
        setMensaje({ texto: 'Error al enviar coordenadas, guardado sin GPS.', tipo: 'info' });
        setTimeout(() => setMensaje(null), 3000);
        setFichajeExitosoModal({ accion, hora: horaActual, cp: 'Sin GPS' });
      }
    }, async () => {
      // Fallback sin GPS
      await enviarFichaje({
        tipoAccion: "fichaje", fecha: fechaActual, hora: horaActual,
        usuarioId: user?.id, usuarioNombre: user?.nombre, accion,
        tareaId: task?.id, tareaNombre: task?.nombre, latitud: 0, longitud: 0, observaciones: "Sin GPS"
      });
      setRegistrosBrutos(prev => prev.map(r => 
        (r[8] === user?.id && r[9] === task?.id && r[0] === fechaActual && r[1] === horaActual)
          ? [fechaActual, horaActual, user?.nombre || '', accion, task?.nombre || '', '0', '0', 'Sin GPS', user?.id || '', task?.id || '']
          : r
      ));
      setMensaje({ texto: `¡${accion} registrada con éxito (Sin GPS)!`, tipo: 'exito' });
      setTimeout(() => setMensaje(null), 3000);
      setFichajeExitosoModal({ accion, hora: horaActual, cp: 'Sin GPS' });
    });
  };

  // Borrar marcaje individual
  const handleBorrarIndividual = async (fecha: string, hora: string, accion: 'Entrada' | 'Salida', uId: string, tId: string, uNombre: string) => {
    if (!window.confirm(`¿Seguro que quieres borrar el marcaje de ${accion.toUpperCase()} de las ${hora} para ${uNombre}?`)) return;
    
    // Eliminar localmente solo el registro exacto
    setRegistrosBrutos(prev => prev.filter(r => !(
      String(r[8]) === String(uId) && 
      String(r[0]) === String(fecha) && 
      String(r[1]) === String(hora) &&
      String(r[3]) === String(accion)
    )));
    
    setMensaje({ texto: 'Marcaje eliminado de la vista local.', tipo: 'exito' });
    setTimeout(() => setMensaje(null), 2500);

    try { 
      // Enviar al backend para borrar ese marcaje por su hora
      await eliminarRegistro(fecha, hora, "", uId, tId); 
      refrescarDatos();
    } catch (e) { 
      refrescarDatos(); 
    }
  };

  // Borrado de tramo completo (Entrada + Salida)
  const handleBorrarTramoCompleto = async (fecha: string, hEntrada: string, hSalida: string, uId: string, tId: string, uNombre: string) => {
    if (!window.confirm(`¿Seguro que quieres borrar el tramo COMPLETO de ${uNombre} (${hEntrada} a ${hSalida})? Se eliminarán ambas marcas en la base de datos.`)) return;

    // Eliminar localmente ambos
    setRegistrosBrutos(prev => prev.filter(r => !(
      String(r[8]) === String(uId) && 
      String(r[0]) === String(fecha) && 
      (String(r[1]) === String(hEntrada) || String(r[1]) === String(hSalida))
    )));

    setMensaje({ texto: 'Tramo de jornada eliminado localmente.', tipo: 'exito' });
    setTimeout(() => setMensaje(null), 2500);

    try { 
      // Pasar hEntrada y hSalida al backend para eliminar ambas filas físicas de la hoja
      await eliminarRegistro(fecha, hEntrada, hSalida, uId, tId);
      refrescarDatos();
    } catch (e) { 
      refrescarDatos(); 
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editando) return;
    const t = tareas.find((task: Tarea) => task.id === editando.nuevaTareaId);
    const u = usuarios.find((user: Usuario) => user.id === editando.usuarioId);

    setRegistrosBrutos(prev => prev.map(r => {
      if (String(r[8]) === String(editando.usuarioId) && 
          String(r[0]) === String(editando.fecha) && 
          String(r[1]) === String(editando.horaOriginal) &&
          String(r[3]) === String(editando.accionOriginal)) {
        return [editando.fecha, editando.nuevaHora, u?.nombre || r[2], editando.nuevaAccion, t?.nombre || r[4], r[5], r[6], r[7], editando.usuarioId, editando.nuevaTareaId];
      }
      return r;
    }));

    setMensaje({ texto: '¡Fichaje actualizado con éxito!', tipo: 'exito' });
    const copiaEditando = { ...editando };
    setEditando(null);
    setTimeout(() => setMensaje(null), 3000);

    try {
      await actualizarRegistro({
        usuarioId: copiaEditando.usuarioId, fecha: copiaEditando.fecha, horaOriginal: copiaEditando.horaOriginal,
        accionOriginal: copiaEditando.accionOriginal, nuevaHora: copiaEditando.nuevaHora, nuevaAccion: copiaEditando.nuevaAccion,
        nuevaTareaId: copiaEditando.nuevaTareaId, nuevaTareaNombre: t?.nombre || ''
      });
      refrescarDatos();
    } catch (e) { 
      refrescarDatos(); 
    }
  };

  // Abrir modal de fichaje manual para resolver un registro huérfano
  const abrirResolucionHuerfano = (huerfano: any, accionFaltante: 'Entrada' | 'Salida') => {
    setFormManualUser(huerfano.userId);
    setFormManualTask(huerfano.taskId);
    setFormManualDate(convertToISODate(huerfano.fechaOriginal));
    setFormManualAction(accionFaltante);
    
    // Intentar deducir una hora lógica:
    // Si falta la entrada, sugerir 1 hora antes de la salida, o en blanco.
    // Si falta la salida, sugerir 8 horas después de la entrada.
    if (accionFaltante === 'Salida' && huerfano.hora) {
      const [h, m] = huerfano.hora.split(':').map(Number);
      const salidaH = (h + 8) % 24;
      setFormManualTime(`${salidaH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    } else {
      setFormManualTime('');
    }
    
    setFormManualIsResolution(true);
    setModalManualOpen(true);
  };

  // Abrir fichaje manual en limpio
  const abrirFichajeManualNuevo = () => {
    setFormManualUser(usuarioDiarioId !== 'TODOS' ? usuarioDiarioId : (usuarioId || ''));
    setFormManualTask(tareaDiarioId !== 'TODOS' ? tareaDiarioId : (tareaId || ''));
    setFormManualDate(new Date().toISOString().split('T')[0]);
    setFormManualTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    setFormManualAction('Entrada');
    setFormManualIsResolution(false);
    setModalManualOpen(true);
  };

  // Guardar fichaje manual o resolución de huérfano
  const handleGuardarManual = async () => {
    if (!formManualUser || !formManualTask || !formManualDate || !formManualTime || !formManualAction) {
      alert("Por favor, rellena todos los campos.");
      return;
    }
    
    const user = usuarios.find(u => u.id === formManualUser);
    const task = tareas.find(t => t.id === formManualTask);
    const fechaES = convertToESDate(formManualDate);
    
    const nuevoReg = [
      fechaES, formManualTime, user?.nombre || '', formManualAction, task?.nombre || '',
      '0', '0', 'Manual', formManualUser, formManualTask
    ];
    
    setRegistrosBrutos(prev => [...prev, nuevoReg]);
    setModalManualOpen(false);
    setMensaje({ texto: 'Fichaje guardado correctamente. Sincronizando...', tipo: 'info' });
    
    try {
      await enviarFichaje({
        tipoAccion: "fichaje",
        fecha: fechaES,
        hora: formManualTime,
        usuarioId: formManualUser,
        usuarioNombre: user?.nombre,
        accion: formManualAction,
        tareaId: formManualTask,
        tareaNombre: task?.nombre,
        latitud: 0,
        longitud: 0,
        observaciones: formManualIsResolution ? "Resolución Huérfano" : "Manual"
      });
      setMensaje({ texto: '¡Fichaje manual registrado con éxito!', tipo: 'exito' });
      setTimeout(() => setMensaje(null), 3000);
      refrescarDatos();
    } catch (e) {
      console.error(e);
      refrescarDatos();
    }
  };

  const handleGuardarEdicionConfig = async () => {
    if (!editandoConfig) return;
    setMensaje({ texto: 'Guardando datos maestros...', tipo: 'info' });
    const { tipo, id, nombre } = editandoConfig;

    if (tipo === 'config_usuario') {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, nombre } : u));
    } else {
      setTareas(prev => prev.map(t => t.id === id ? { ...t, nombre } : t));
    }
    setEditandoConfig(null);
    setTimeout(() => setMensaje(null), 2000);

    try {
      await editarConfiguracion(tipo, id, nombre);
      const configActualizada = await obtenerConfiguracion();
      setUsuarios(configActualizada.usuarios || []);
      setTareas(configActualizada.tareas || []);
    } catch (e) { 
      console.error(e); 
    }
  };

  const handleToggleEstado = async (tipo: string, id: string) => {
    setMensaje({ texto: 'Actualizando estado...', tipo: 'info' });
    if (tipo === 'config_usuario') {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
    } else {
      setTareas(prev => prev.map(t => t.id === id ? { ...t, activo: !t.activo } : t));
    }

    try {
      await toggleEstadoConfiguracion(tipo, id);
      setMensaje({ texto: 'Disponibilidad actualizada con éxito.', tipo: 'exito' });
      setTimeout(() => setMensaje(null), 2000);
    } catch (e) { 
      refrescarDatos(); 
    }
  };

  const handleArchivar = async () => {
    if (!fechaCorteArchivo) return alert("Selecciona una fecha de corte.");
    if (!window.confirm(`¿Confirmas archivar todos los registros desde el ${formatearFechaES(fechaCorteArchivo)} hacia atrás?`)) return;
    setMensaje({ texto: 'Archivando base de datos...', tipo: 'info' });
    try {
      await archivarDatosAntiguos(fechaCorteArchivo);
      setMensaje({ texto: '¡Archivado completado con éxito!', tipo: 'exito' });
      setFechaCorteArchivo('');
      refrescarDatos();
    } catch (e) { 
      setMensaje(null); 
    }
  };

  const handleAddConfig = async (tipo: string, valor: string) => {
    if (!valor.trim()) return;
    setMensaje({ texto: 'Guardando nuevo elemento...', tipo: 'info' });
    try {
      await añadirConfiguracion(tipo, valor);
      if (tipo === 'config_usuario') setNuevoOperario(''); else setNuevoCentro('');
      const configActualizada = await obtenerConfiguracion();
      setUsuarios(configActualizada.usuarios || []);
      setTareas(configActualizada.tareas || []);
      setMensaje({ texto: '¡Datos guardados con éxito!', tipo: 'exito' });
    } catch (e) { 
      setMensaje(null); 
    }
    setTimeout(() => setMensaje(null), 2000);
  };

  // Limpiar selección de usuario (Cerrar Sesión) para uso multiusuario fácil
  const handleCerrarSesion = () => {
    setUsuarioId('');
    setMensaje({ texto: 'Sesión cerrada.', tipo: 'info' });
    setTimeout(() => setMensaje(null), 1500);
  };

  const dataStore = useMemo(() => {
    const diasMap: Record<string, any> = {};
    const analitica: Record<string, any> = {};

    // 1. Mapear y ordenar los registros cronológicamente por fecha y hora (independiente de la posición física de la fila en la hoja de cálculo)
    const registrosOrdenados = registrosBrutos
      .slice(1)
      .filter((r: any[]) => r[0] && r[0] !== "Fecha")
      .map((r: any[]) => {
        const [fR, hR, uName, acc, tName, lat, lon, obs, uId, tId] = r;
        const p = fR.split(/[/.-]/);
        const iso = p[0].length === 4 ? `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}` : `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        return { fR, hR, uName, acc, tName, lat, lon, obs, uId, tId, iso };
      })
      .sort((a, b) => {
        const dateCompare = a.iso.localeCompare(b.iso);
        if (dateCompare !== 0) return dateCompare;
        return convertTimeToMinutes(a.hR) - convertTimeToMinutes(b.hR);
      });

    // 2. Procesar el listado ordenado para emparejar Entrada y Salida
    registrosOrdenados.forEach((item) => {
      const { fR, hR, uName, acc, tName, lat, lon, obs, uId, tId, iso } = item;
      
      if (iso >= filtroDesde && iso <= filtroHasta) {
        if (!diasMap[iso]) diasMap[iso] = { iso, tramos: [], pends: [], huerfanos: [] };
        if (!analitica[uId]) analitica[uId] = { nombre: uName, totalMin: 0, diasUnicos: new Set(), tareas: {} };
        
        if (acc === 'Entrada') {
          diasMap[iso].pends.push({ hora: hR, user: uName, userId: uId, task: tName, taskId: tId, fechaOriginal: fR, lat, lon, obs });
        } else if (acc === 'Salida') {
          const iE = diasMap[iso].pends.findIndex((e: any) => e.userId === uId && e.taskId === tId);
          if (iE !== -1) {
            const e = diasMap[iso].pends.splice(iE, 1)[0];
            const [hE, mE] = e.hora.split(':').map(Number);
            const [hS, mS] = hR.split(':').map(Number);
            const dur = (hS * 60 + mS) - (hE * 60 + mE);
            diasMap[iso].tramos.push({ 
              user: uName, userId: uId, inicio: e.hora, fin: hR, task: tName, taskId: tId, 
              durMin: dur > 0 ? dur : 0, durStr: dur > 0 ? `${Math.floor(dur/60)}h ${dur%60}m` : 'Error hora', fechaOriginal: fR,
              entradaGPS: { lat: e.lat, lon: e.lon, obs: e.obs },
              salidaGPS: { lat, lon, obs }
            });
            analitica[uId].totalMin += dur > 0 ? dur : 0;
            analitica[uId].diasUnicos.add(iso);
            analitica[uId].tareas[tName] = (analitica[uId].tareas[tName] || 0) + (dur > 0 ? dur : 0);
          } else {
            diasMap[iso].huerfanos.push({ hora: hR, user: uName, userId: uId, task: tName, taskId: tId, fechaOriginal: fR, tipo: 'Salida', lat, lon, obs });
          }
        }
      }
    });
    
    // Todos los pendientes de Entrada que quedan al final se mueven a huérfanos
    Object.values(diasMap).forEach((dia: any) => {
      dia.pends.forEach((p: any) => dia.huerfanos.push({ ...p, tipo: 'Entrada' }));
    });
    
    return { 
      dias: Object.values(diasMap).sort((a: any, b: any) => b.iso.localeCompare(a.iso)), 
      analitica 
    };
  }, [registrosBrutos, filtroDesde, filtroHasta]);

  if (cargandoConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-bold text-blue-800 animate-pulse text-sm text-center tracking-widest uppercase p-4">
        <Clock className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <span>Conectando con Google Sheets...</span>
      </div>
    );
  }

  const stats = dataStore.analitica[usuarioAnalisisId] || { nombre: '', totalMin: 0, diasUnicos: new Set(), tareas: {} };

  if (appExited) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-pulse">
            <LogOut className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-100">Aplicación Cerrada</h1>
            <p className="text-slate-400 text-sm font-semibold">
              Tu fichaje ha sido guardado de forma segura en la nube.
            </p>
          </div>
          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 text-xs text-slate-400 leading-relaxed font-bold">
            Ya puedes cerrar esta pestaña del navegador de forma segura, o pulsar abajo para volver.
          </div>
          <button 
            onClick={() => {
              setAppExited(false);
              setUsuarioId(''); // limpiar usuario por seguridad al volver a abrir
            }} 
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm uppercase shadow-lg transition-all"
          >
            Volver a Iniciar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-3 md:p-6 text-slate-800 font-sans">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body { background: white !important; color: black !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt; }
          th { background-color: #f1f5f9 !important; border: 1px solid #cbd5e1 !important; padding: 8px; text-align: left; text-transform: uppercase; font-weight: bold; }
          td { border: 1px solid #cbd5e1 !important; padding: 8px; }
          .report-title { font-size: 20pt; font-weight: 900; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; }
        }
      `}</style>

      {/* MODAL EDICIÓN FICHAJE */}
      {editando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-2 text-blue-600">
              <Edit className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-tight">Editar Registro</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Hora</label>
                <input type="time" className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all" value={editando.nuevaHora} onChange={e => setEditando({...editando, nuevaHora: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Acción</label>
                <select className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all" value={editando.nuevaAccion} onChange={e => setEditando({...editando, nuevaAccion: e.target.value})}>
                  <option value="Entrada">ENTRADA</option>
                  <option value="Salida">SALIDA</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Centro/Tarea</label>
                <select className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all" value={editando.nuevaTareaId} onChange={e => setEditando({...editando, nuevaTareaId: e.target.value})}>
                  {tareas.map((t: Tarea) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditando(null)} className="flex-1 py-3 font-bold text-xs text-slate-400 uppercase hover:text-slate-600">Cancelar</button>
              <button onClick={handleGuardarEdicion} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase shadow-md transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHAJE MANUAL Y RESOLUCIÓN */}
      {modalManualOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-2 text-blue-600">
              <FolderPlus className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-tight">
                {formManualIsResolution ? 'Completar Registro' : 'Fichaje Manual'}
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Colaborador</label>
                <select 
                  className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 disabled:opacity-70 focus:border-blue-500 focus:bg-white transition-all" 
                  value={formManualUser} 
                  onChange={e => setFormManualUser(e.target.value)}
                  disabled={formManualIsResolution}
                >
                  <option value="">Selecciona colaborador...</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Centro/Tarea</label>
                <select 
                  className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all" 
                  value={formManualTask} 
                  onChange={e => setFormManualTask(e.target.value)}
                >
                  <option value="">Selecciona centro...</option>
                  {tareas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Fecha</label>
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none text-xs border border-slate-200 disabled:opacity-70 focus:border-blue-500 focus:bg-white transition-all" 
                    value={formManualDate} 
                    onChange={e => setFormManualDate(e.target.value)}
                    disabled={formManualIsResolution}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Hora</label>
                  <input 
                    type="time" 
                    className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none text-xs border border-slate-200 focus:border-blue-500 focus:bg-white transition-all" 
                    value={formManualTime} 
                    onChange={e => setFormManualTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Acción</label>
                <select 
                  className="w-full p-3 bg-slate-100 rounded-xl font-bold outline-none border border-slate-200 disabled:opacity-70 focus:border-blue-500 focus:bg-white transition-all" 
                  value={formManualAction} 
                  onChange={e => setFormManualAction(e.target.value)}
                  disabled={formManualIsResolution}
                >
                  <option value="Entrada">ENTRADA</option>
                  <option value="Salida">SALIDA</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setModalManualOpen(false)} 
                className="flex-1 py-3 font-bold text-xs text-slate-400 uppercase hover:text-slate-600"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuardarManual} 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase shadow-md transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN MAESTROS */}
      {editandoConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tighter">Editar Maestro</h2>
            <input type="text" className="w-full p-3 bg-slate-100 rounded-xl font-black outline-none border focus:border-blue-500 focus:bg-white transition-all" value={editandoConfig.nombre} onChange={e => setEditandoConfig({...editandoConfig, nombre: e.target.value})} />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditandoConfig(null)} className="flex-1 py-3 font-bold text-xs text-slate-400 uppercase">Cancelar</button>
              <button onClick={handleGuardarEdicionConfig} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHAJE EXITOSO / OPCIÓN DE SALIR */}
      {fichajeExitosoModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-6 border border-slate-100 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">¡Fichaje Confirmado!</h2>
              <p className="text-sm font-bold text-slate-650">
                Se ha registrado tu <span className="font-extrabold text-blue-700">{fichajeExitosoModal.accion.toUpperCase()}</span> a las <span className="font-extrabold text-blue-700">{fichajeExitosoModal.hora}</span>.
              </p>
              <p className="text-[10px] text-slate-400">Ubicación registrada: {fichajeExitosoModal.cp}</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => {
                  setTabActiva('informes');
                  setFichajeExitosoModal(null);
                }} 
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-black text-xs uppercase shadow-sm transition-all"
              >
                🔍 Ver en el Diario
              </button>
              <button 
                onClick={() => {
                  setFichajeExitosoModal(null);
                  setAppExited(true);
                }} 
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase shadow-md transition-all"
              >
                🚪 Salir de la aplicación
              </button>
              <button 
                onClick={() => setFichajeExitosoModal(null)} 
                className="w-full py-2 font-bold text-[10px] text-slate-400 uppercase tracking-widest hover:text-slate-600 mt-1"
              >
                Volver a Fichar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORTE DE IMPRESIÓN */}
      <div className="hidden print:block w-full">
        <div className="report-title">Reporte de Control de Presencia</div>
        <p><strong>Periodo:</strong> {formatearFechaES(filtroDesde)} al {formatearFechaES(filtroHasta)}</p>
        <table>
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Centro</th><th>Entrada</th><th>Salida</th><th>Total</th></tr></thead>
          <tbody>
            {dataStore.dias.flatMap((dia: any) => 
              dia.tramos
                .filter((t: any) => (usuarioDiarioId === 'TODOS' || t.userId === usuarioDiarioId) && (tareaDiarioId === 'TODOS' || t.taskId === tareaDiarioId))
                .map((t: any, i: number) => (
                  <tr key={i}>
                    <td>{formatearFechaES(dia.iso)}</td><td>{t.user}</td><td>{t.task}</td><td>{t.inicio}</td><td>{t.fin}</td><td>{t.durStr}</td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* APLICACIÓN VISUAL */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-4 flex flex-col min-h-[92vh] border border-slate-100 overflow-hidden relative print:hidden">
        
        {/* CABECERA DE LA APP CON BOTÓN GLOBAL DE SALIR */}
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Control CP</span>
          </div>
          <button 
            onClick={() => {
              if (window.confirm("¿Deseas salir de la aplicación?")) {
                setAppExited(true);
              }
            }} 
            className="text-[10px] font-black text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100/50 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SALIR</span>
          </button>
        </div>
        
        {/* Barra superior de pestañas táctiles */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 flex-shrink-0">
          {[
            { id: 'fichaje', label: 'Fichar', icon: Clock },
            { id: 'informes', label: 'Diario', icon: Calendar },
            { id: 'analisis', label: 'Análisis', icon: TrendingUp },
            { id: 'admin', label: 'Ajustes', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id} 
                onClick={() => setTabActiva(tab.id)} 
                className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center transition-all ${
                  tabActiva === tab.id ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mensaje de confirmación global */}
        {mensaje && (
          <div className={`p-3 rounded-2xl text-center font-bold text-xs mb-3 shadow-sm border animate-pulse ${
            mensaje.tipo === 'exito' ? 'bg-emerald-500 text-white border-emerald-600' :
            mensaje.tipo === 'error' ? 'bg-rose-500 text-white border-rose-600' :
            'bg-blue-600 text-white border-blue-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* TAB FICHAJE */}
          {tabActiva === 'fichaje' && (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Encabezado con reloj en tiempo real */}
              <div className="text-center pt-2 pb-4">
                <h1 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Jornada Laboral</h1>
                <div className="text-4xl font-extrabold text-blue-900 tracking-tight leading-none tabular-nums my-2">
                  {horaActualLocal || '--:--:--'}
                </div>
                <p className="text-xs font-semibold text-slate-500 capitalize">{fechaActualLocal}</p>
              </div>

              {/* Selector de Usuario y Estado Actual */}
              <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Colaborador</label>
                    {usuarioId && (
                      <button 
                        onClick={handleCerrarSesion} 
                        className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5 hover:text-rose-700 transition-colors"
                        title="Cerrar sesión / Limpiar usuario"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Cambiar</span>
                      </button>
                    )}
                  </div>
                  
                  <select 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-base outline-none focus:border-blue-500 transition-all cursor-pointer"
                    value={usuarioId} 
                    onChange={(e) => setUsuarioId(e.target.value)}
                  >
                    <option value="">Selecciona tu nombre...</option>
                    {usuarios.filter(u => u.activo !== false).map((u: Usuario) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Mostrar Estado Actual del Colaborador en Tiempo Real */}
                {usuarioId && estadoUsuarioHoy && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estado de hoy:</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                      {estadoUsuarioHoy.estado === 'DENTRO' ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-xs font-black text-emerald-600">DENTRO ({estadoUsuarioHoy.hora})</span>
                        </>
                      ) : estadoUsuarioHoy.estado === 'FUERA' ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                          <span className="text-xs font-black text-rose-600">FUERA (Salida {estadoUsuarioHoy.hora})</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                          <span className="text-xs font-black text-slate-500">SIN REGISTROS</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Centro de Trabajo */}
              <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-150 shadow-sm mt-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Centro de Trabajo</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-base outline-none focus:border-blue-500 transition-all cursor-pointer"
                  value={tareaId} 
                  onChange={(e) => setTareaId(e.target.value)}
                  disabled={!usuarioId}
                >
                  {tareas.filter(t => t.activo !== false).map((t: Tarea) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Espaciador decorativo */}
              <div className="flex-1 flex items-center justify-center my-6">
                <div className="relative p-6 bg-blue-50 rounded-full border-4 border-white shadow-inner animate-pulse">
                  <Clock className="w-16 h-16 text-blue-600" />
                </div>
              </div>

              {/* Botones Grandes de Entrada / Salida */}
              <div className="grid grid-cols-2 gap-4 pb-2">
                <button 
                  onClick={() => handleFichaje('Entrada')} 
                  disabled={!usuarioId}
                  className="bg-emerald-500 active:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-3xl font-black text-lg shadow-lg hover:shadow-emerald-500/20 uppercase tracking-widest border-b-4 border-emerald-600 transition-all transform active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>Entrada</span>
                  <span className="text-[9px] font-normal tracking-normal opacity-85 lowercase mt-0.5">clock in</span>
                </button>
                
                <button 
                  onClick={() => handleFichaje('Salida')} 
                  disabled={!usuarioId}
                  className="bg-rose-500 active:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-3xl font-black text-lg shadow-lg hover:shadow-rose-500/20 uppercase tracking-widest border-b-4 border-rose-600 transition-all transform active:scale-95 flex flex-col items-center justify-center"
                >
                  <span>Salida</span>
                  <span className="text-[9px] font-normal tracking-normal opacity-85 lowercase mt-0.5">clock out</span>
                </button>
              </div>

              {/* Aviso si no hay usuario seleccionado */}
              {!usuarioId && (
                <div className="text-center py-2 px-4 bg-amber-50 rounded-xl border border-amber-200/50 text-[10px] font-bold text-amber-700 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Por seguridad, debes seleccionar tu nombre antes de fichar.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB DIARIO */}
          {tabActiva === 'informes' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-1 text-slate-800">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <span>Diario de Fichajes</span>
                </h1>
                
                <div className="flex gap-2">
                  <button 
                    onClick={abrirFichajeManualNuevo}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-0.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> Fichaje
                  </button>
                  <button 
                    onClick={handlePrint} 
                    className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-0.5 transition-colors shadow-sm"
                  >
                    <Printer className="w-3 h-3" /> Reporte
                  </button>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2 mb-3">
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    className="flex-1 bg-transparent text-xs font-bold outline-none border-none cursor-pointer py-1"
                    value={usuarioDiarioId} 
                    onChange={(e) => setUsuarioDiarioId(e.target.value)}
                  >
                    <option value="TODOS">TODOS LOS COLABORADORES</option>
                    {usuarios.map((u: Usuario) => (
                      <option key={u.id} value={u.id}>{u.nombre.toUpperCase()}{u.activo === false ? ' [INACTIVO]' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    className="flex-1 bg-transparent text-xs font-bold outline-none border-none cursor-pointer py-1"
                    value={tareaDiarioId} 
                    onChange={(e) => setTareaDiarioId(e.target.value)}
                  >
                    <option value="TODOS">TODOS LOS CENTROS</option>
                    {tareas.map((t: Tarea) => (
                      <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}{t.activo === false ? ' [INACTIVO]' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none" />
                  <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="check-h" checked={incluirHistorico} onChange={e => setIncluirHistorico(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600 rounded" />
                    <label htmlFor="check-h" className="text-[9px] font-black uppercase text-slate-500 cursor-pointer">Incluir histórico</label>
                  </div>
                  
                  <button 
                    onClick={() => refrescarDatos()}
                    className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-0.5"
                    disabled={refrescando}
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${refrescando ? 'animate-spin' : ''}`} />
                    <span>{refrescando ? 'Actualizando' : 'Actualizar'}</span>
                  </button>
                </div>
              </div>

              {/* Listado de Días */}
              <div className="flex-1 overflow-y-auto space-y-3 pb-2 custom-scrollbar">
                {dataStore.dias.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold text-slate-400">
                    No se han encontrado registros en este rango de fechas.
                  </div>
                ) : (
                  dataStore.dias.map((dia: any) => {
                    const tramos = dia.tramos.filter((t: any) => (usuarioDiarioId === 'TODOS' || t.userId === usuarioDiarioId) && (tareaDiarioId === 'TODOS' || t.taskId === tareaDiarioId));
                    const huerfanos = dia.huerfanos.filter((h: any) => (usuarioDiarioId === 'TODOS' || h.userId === usuarioDiarioId) && (tareaDiarioId === 'TODOS' || h.taskId === tareaDiarioId));
                    
                    if (tramos.length === 0 && huerfanos.length === 0) return null;
                    const total = tramos.reduce((acc: number, t: any) => acc + t.durMin, 0);
                    
                    return (
                      <div key={dia.iso} className="bg-white border border-slate-250 rounded-2xl p-3 shadow-sm space-y-3">
                        {/* Cabecera del día */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            {new Date(dia.iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-lg font-black text-blue-900">{Math.floor(total/60)}h {total%60}m</span>
                        </div>

                        {/* Tramos Completados */}
                        <div className="space-y-2">
                          {tramos.map((t: any, i: number) => (
                            <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between gap-1.5 relative group">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1">{t.user}</p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t.task}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{t.durStr}</span>
                                  {/* Botón borrar tramo completo */}
                                  <button 
                                    onClick={() => handleBorrarTramoCompleto(t.fechaOriginal, t.inicio, t.fin, t.userId, t.taskId, t.user)}
                                    className="text-slate-300 hover:text-rose-500 p-0.5 transition-colors"
                                    title="Borrar jornada completa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center text-[10px] text-slate-600 border-t border-slate-200/40 pt-1.5">
                                <div className="flex gap-4">
                                  {/* Editar/Borrar individual Entrada */}
                                  <span className="flex items-center gap-1 bg-white border rounded px-1.5 py-0.5">
                                    <span className="font-extrabold text-emerald-600">E:</span> {t.inicio}
                                    <button 
                                      onClick={() => setEditando({usuarioId: t.userId, fecha: t.fechaOriginal, horaOriginal: t.inicio, nuevaHora: t.inicio, nuevaAccion: 'Entrada', nuevaTareaId: t.taskId, accionOriginal: 'Entrada'})}
                                      className="text-blue-500 hover:text-blue-700 ml-1"
                                      title="Editar entrada"
                                    >
                                      <Edit className="w-2.5 h-2.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleBorrarIndividual(t.fechaOriginal, t.inicio, 'Entrada', t.userId, t.taskId, t.user)}
                                      className="text-rose-400 hover:text-rose-600 ml-0.5"
                                      title="Borrar entrada"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </span>

                                  {/* Editar/Borrar individual Salida */}
                                  <span className="flex items-center gap-1 bg-white border rounded px-1.5 py-0.5">
                                    <span className="font-extrabold text-rose-500">S:</span> {t.fin}
                                    <button 
                                      onClick={() => setEditando({usuarioId: t.userId, fecha: t.fechaOriginal, horaOriginal: t.fin, nuevaHora: t.fin, nuevaAccion: 'Salida', nuevaTareaId: t.taskId, accionOriginal: 'Salida'})}
                                      className="text-blue-500 hover:text-blue-700 ml-1"
                                      title="Editar salida"
                                    >
                                      <Edit className="w-2.5 h-2.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleBorrarIndividual(t.fechaOriginal, t.fin, 'Salida', t.userId, t.taskId, t.user)}
                                      className="text-rose-400 hover:text-rose-600 ml-0.5"
                                      title="Borrar salida"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                </div>
                                
                                {/* Info Geolocalización */}
                                <div className="text-[8px] text-slate-400 flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                  <span>{t.entradaGPS?.obs || t.salidaGPS?.obs || 'S/N'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Fichadas Huérfanas (Pendientes o Errores) */}
                        {huerfanos.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200">
                            <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>Incompletos o errores</span>
                            </p>
                            {huerfanos.map((h: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                                <div className="text-[10px] flex items-center">
                                  <span className={`font-extrabold px-1.5 py-0.5 rounded text-[8px] mr-2 ${h.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {h.tipo.toUpperCase()}
                                  </span>
                                  <span className="font-extrabold text-slate-800 mr-2">{h.hora}</span>
                                  <span className="text-slate-500 font-bold uppercase truncate max-w-[120px]">{h.user}</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                  {/* Botón inteligente para resolver y rellenar la ficha huérfana */}
                                  <button 
                                    onClick={() => abrirResolucionHuerfano(h, h.tipo === 'Entrada' ? 'Salida' : 'Entrada')}
                                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-0.5 transition-colors shadow-sm"
                                  >
                                    <Plus className="w-2 h-2" /> Completar
                                  </button>
                                  
                                  {/* Botones normales de Edición y Borrado */}
                                  <button 
                                    onClick={() => setEditando({usuarioId: h.userId, fecha: h.fechaOriginal, horaOriginal: h.hora, nuevaHora: h.hora, nuevaAccion: h.tipo, nuevaTareaId: h.taskId, accionOriginal: h.tipo})}
                                    className="text-blue-500 hover:text-blue-700 p-0.5"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleBorrarIndividual(h.fechaOriginal, h.hora, h.tipo, h.userId, h.taskId, h.user)}
                                    className="text-rose-400 hover:text-rose-600 p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB ANÁLISIS */}
          {tabActiva === 'analisis' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-1 text-slate-800">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span>Análisis de Jornada</span>
                </h1>
                <button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-0.5 transition-colors shadow-sm">
                  <Printer className="w-3 h-3" /> Reporte
                </button>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="bg-blue-800 p-3 rounded-2xl text-white shadow-md flex items-center gap-2 border border-blue-900">
                   <User className="w-5 h-5 text-blue-200" />
                   <select 
                     className="flex-1 bg-transparent text-sm font-black outline-none border-none cursor-pointer" 
                     value={usuarioAnalisisId} 
                     onChange={(e) => setUsuarioAnalisisId(e.target.value)}
                   >
                     {usuarios.map((u: Usuario) => (
                       <option key={u.id} className="text-slate-800" value={u.id}>{u.nombre}</option>
                     ))}
                   </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                  <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar">
                {/* Indicadores Clave (KPIs) en una sola fila compacta */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-[1.5rem] shadow-sm">
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="border-r border-slate-200 pr-1">
                      <p className="text-[7.5px] font-black uppercase text-slate-400 mb-0.5 tracking-tight leading-none">Horas Totales</p>
                      <p className="text-sm font-extrabold text-slate-900 tracking-tight">{Math.floor(stats.totalMin/60)}h {stats.totalMin%60}m</p>
                    </div>
                    <div className="border-r border-slate-200 px-1">
                      <p className="text-[7.5px] font-black uppercase text-slate-400 mb-0.5 tracking-tight leading-none">Días Totales</p>
                      <p className="text-sm font-extrabold text-slate-900 tracking-tight">{stats.diasUnicos.size} d</p>
                    </div>
                    <div className="pl-1">
                      <p className="text-[7.5px] font-black uppercase text-slate-400 mb-0.5 tracking-tight leading-none">Ratio Diario</p>
                      <p className="text-sm font-extrabold text-blue-700 tracking-tight">
                        {(() => {
                          const ratio = stats.diasUnicos.size > 0 ? Math.round(stats.totalMin / stats.diasUnicos.size) : 0;
                          return `${Math.floor(ratio / 60)}h ${ratio % 60}m`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desglose de horas por Centro de Trabajo */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Horas por centro de trabajo</p>
                  
                  {Object.keys(stats.tareas || {}).length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border text-xs text-slate-400 font-bold">
                      No hay horas registradas en este periodo.
                    </div>
                  ) : (
                    Object.entries(stats.tareas || {}).map(([tarea, mins]: any) => (
                      <div key={tarea} className="bg-white border border-slate-200 p-3.5 rounded-xl flex justify-between items-center text-xs shadow-sm">
                        <span className="font-extrabold text-slate-700 uppercase tracking-tight">{tarea}</span>
                        <span className="font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">{Math.floor(mins/60)}h {mins%60}m</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB GESTIÓN */}
          {tabActiva === 'admin' && (
            <div className="flex-1 space-y-5 overflow-y-auto pb-2 custom-scrollbar">
              <h1 className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-1">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Gestión de Maestros</span>
              </h1>
              
              {/* Mantenimiento de BD / Archivo */}
              <div className="bg-slate-50 p-3.5 rounded-[1.5rem] border border-slate-200 space-y-2.5 shadow-sm">
                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Mantenimiento de Datos</p>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase block px-0.5">Mover a histórico registros anteriores a la fecha:</label>
                  <input type="date" value={fechaCorteArchivo} onChange={e => setFechaCorteArchivo(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none shadow-sm" />
                  <button onClick={handleArchivar} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                    📦 Archivar Datos Antiguos
                  </button>
                </div>
              </div>

              {/* Gestión de Operarios */}
              <div className="bg-slate-50 p-3.5 rounded-[1.5rem] border border-slate-200 space-y-2.5 shadow-sm">
                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Colaboradores</p>
                <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                  <input type="text" value={nuevoOperario} onChange={(e) => setNuevoOperario(e.target.value)} placeholder="Nombre del nuevo colaborador..." className="flex-1 bg-transparent p-1.5 text-xs outline-none font-bold" />
                  <button onClick={() => handleAddConfig('config_usuario', nuevoOperario)} className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 flex items-center justify-center rounded-lg text-sm shadow transition-colors">➕</button>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {usuarios.map((u: Usuario) => (
                    <div key={u.id} className={`bg-white border p-1.5 rounded-lg flex justify-between items-center text-xs px-2.5 shadow-sm ${u.activo === false ? 'bg-slate-50/50 opacity-60' : ''}`}>
                      <span className={`font-bold text-slate-700 uppercase tracking-tight ${u.activo === false ? 'line-through text-slate-400' : ''}`}>{u.nombre} {u.activo === false && ' (INACTIVO)'}</span>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setEditandoConfig({ tipo: 'config_usuario', id: u.id, nombre: u.nombre })} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleToggleEstado('config_usuario', u.id)} 
                          className={`text-[8px] font-black px-2 py-1 rounded transition-all shadow-sm ${
                            u.activo !== false ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {u.activo !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gestión de Centros */}
              <div className="bg-slate-50 p-3.5 rounded-[1.5rem] border border-slate-200 space-y-2.5 shadow-sm">
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Centros de Trabajo</p>
                <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                  <input type="text" value={nuevoCentro} onChange={(e) => setNuevoCentro(e.target.value)} placeholder="Nombre del nuevo centro..." className="flex-1 bg-transparent p-1.5 text-xs outline-none font-bold" />
                  <button onClick={() => handleAddConfig('config_tarea', nuevoCentro)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-9 h-9 flex items-center justify-center rounded-lg text-sm shadow transition-colors">➕</button>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {tareas.map((t: Tarea) => (
                    <div key={t.id} className={`bg-white border p-1.5 rounded-lg flex justify-between items-center text-xs px-2.5 shadow-sm ${t.activo === false ? 'bg-slate-50/50 opacity-60' : ''}`}>
                      <span className={`font-bold text-slate-700 uppercase tracking-tight ${t.activo === false ? 'line-through text-slate-400' : ''}`}>{t.nombre} {t.activo === false && ' (INACTIVO)'}</span>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setEditandoConfig({ tipo: 'config_tarea', id: t.id, nombre: t.nombre })} className="text-slate-400 hover:text-emerald-600 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleToggleEstado('config_tarea', t.id)} 
                          className={`text-[8px] font-black px-2 py-1 rounded transition-all shadow-sm ${
                            t.activo !== false ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}
                        >
                          {t.activo !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
