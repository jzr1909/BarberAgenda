const STORAGE_KEY = "barber_agenda_turnos_v1";

const StorageService = {
  getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("Error leyendo turnos:", error);
      return [];
    }
  },

  saveAll(turnos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(turnos));
  },

  getByDate(fecha) {
    return this.getAll()
      .filter((t) => t.fecha === fecha)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  },

  saveTurno(turnoData) {
    const turnos = this.getAll();

    if (turnoData.id) {
      const index = turnos.findIndex((t) => t.id === turnoData.id);
      if (index !== -1) {
        turnos[index] = { ...turnos[index], ...turnoData };
      }
    } else {
      turnos.push({
        ...turnoData,
        id: Date.now().toString(),
        pagado: false,
      });
    }

    this.saveAll(turnos);
  },

  togglePagado(id) {
    const turnos = this.getAll();
    const index = turnos.findIndex((t) => t.id === id);
    if (index !== -1) {
      turnos[index].pagado = !turnos[index].pagado;
      this.saveAll(turnos);
    }
  },

  deleteTurno(id) {
    const filtrados = this.getAll().filter((t) => t.id !== id);
    this.saveAll(filtrados);
  },

  hasHoraConflict(fecha, hora, ignoreId = null) {
    return this.getByDate(fecha).some(
      (t) => t.hora === hora && t.id !== ignoreId
    );
  },

  formatCOP(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor || 0);
  },
};