document.addEventListener("DOMContentLoaded", () => {
  const datePicker = document.getElementById("date-picker");
  const currentDateLabel = document.getElementById("current-date-label");
  const form = document.getElementById("turno-form");
  const formTitle = document.getElementById("form-title");
  const inputId = document.getElementById("turno-id");
  const inputHora = document.getElementById("turno-hora");
  const inputCliente = document.getElementById("turno-cliente");
  const inputPrecio = document.getElementById("turno-precio");
  const formAlert = document.getElementById("form-alert");
  const btnSubmit = document.getElementById("btn-submit");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const turnosList = document.getElementById("turnos-list");

  const getLocalISODate = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split("T")[0];
  };

  let selectedDate = getLocalISODate(0);
  datePicker.value = selectedDate;

  const updateDateUI = () => {
    datePicker.value = selectedDate;
    const hoy = getLocalISODate(0);
    const ayer = getLocalISODate(-1);
    const manana = getLocalISODate(1);

    if (selectedDate === hoy) currentDateLabel.textContent = "Hoy";
    else if (selectedDate === ayer) currentDateLabel.textContent = "Ayer";
    else if (selectedDate === manana) currentDateLabel.textContent = "Mañana";
    else currentDateLabel.textContent = selectedDate;

    document.querySelectorAll(".chip").forEach((chip) => {
      const offset = Number(chip.dataset.offset);
      chip.classList.toggle("active", getLocalISODate(offset) === selectedDate);
    });
  };

  const renderTurnos = () => {
    const turnos = StorageService.getByDate(selectedDate);

    // Calcular métricas
    let cobrado = 0;
    let pendiente = 0;
    turnos.forEach((t) => {
      if (t.pagado) cobrado += Number(t.precio);
      else pendiente += Number(t.precio);
    });

    document.getElementById("stat-count").textContent = turnos.length;
    document.getElementById("stat-paid").textContent = StorageService.formatCOP(cobrado);
    document.getElementById("stat-pending").textContent = StorageService.formatCOP(pendiente);

    if (turnos.length === 0) {
      turnosList.innerHTML = `<div class="empty-state">No hay turnos agendados para esta fecha.</div>`;
      return;
    }

    turnosList.innerHTML = turnos
      .map(
        (t) => `
        <article class="turno-item ${t.pagado ? "is-paid" : "is-pending"}">
          <div class="turno-info">
            <h3>${t.hora} · ${escapeHTML(t.cliente)}</h3>
            <span class="turno-meta">${StorageService.formatCOP(t.precio)} · ${
          t.pagado ? "Pagado" : "Pendiente"
        }</span>
          </div>
          <div class="turno-actions">
            <button type="button" class="action-btn pay ${t.pagado ? "active" : ""}" data-action="pay" data-id="${t.id}">
              ${t.pagado ? "✓" : "$"}
            </button>
            <button type="button" class="action-btn" data-action="edit" data-id="${t.id}">✎</button>
            <button type="button" class="action-btn delete" data-action="delete" data-id="${t.id}">✕</button>
          </div>
        </article>
      `
      )
      .join("");
  };

  const escapeHTML = (str) =>
    str.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  const resetForm = () => {
    form.reset();
    inputId.value = "";
    formTitle.textContent = "Nuevo Turno";
    btnSubmit.textContent = "Guardar Turno";
    btnCancelEdit.classList.add("hidden");
    formAlert.classList.add("hidden");
  };

  // Verificar cruce de hora en tiempo real
  inputHora.addEventListener("change", () => {
    const conflict = StorageService.hasHoraConflict(selectedDate, inputHora.value, inputId.value || null);
    if (conflict) {
      formAlert.textContent = `Ya tienes un cliente agendado a las ${inputHora.value}.`;
      formAlert.classList.remove("hidden");
    } else {
      formAlert.classList.add("hidden");
    }
  });

  // Botones rápidos de tarifa
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      inputPrecio.value = btn.dataset.price;
    });
  });

  // Guardar o actualizar turno
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    StorageService.saveTurno({
      id: inputId.value || null,
      fecha: selectedDate,
      hora: inputHora.value,
      cliente: inputCliente.value.trim(),
      precio: Number(inputPrecio.value),
    });
    resetForm();
    renderTurnos();
  });

  btnCancelEdit.addEventListener("click", resetForm);

  // Acciones en la lista (Pagar, Editar, Eliminar)
  turnosList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const { action, id } = btn.dataset;
    if (action === "pay") {
      StorageService.togglePagado(id);
      renderTurnos();
    } else if (action === "delete") {
      StorageService.deleteTurno(id);
      if (inputId.value === id) resetForm();
      renderTurnos();
    } else if (action === "edit") {
      const turno = StorageService.getAll().find((t) => t.id === id);
      if (!turno) return;
      inputId.value = turno.id;
      inputHora.value = turno.hora;
      inputCliente.value = turno.cliente;
      inputPrecio.value = turno.precio;
      formTitle.textContent = "Editar Turno";
      btnSubmit.textContent = "Actualizar Turno";
      btnCancelEdit.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Navegación de fechas
  datePicker.addEventListener("change", (e) => {
    selectedDate = e.target.value;
    resetForm();
    updateDateUI();
    renderTurnos();
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      selectedDate = getLocalISODate(Number(chip.dataset.offset));
      resetForm();
      updateDateUI();
      renderTurnos();
    });
  });

  const shiftDay = (delta) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d + delta);
    const offset = date.getTimezoneOffset() * 60000;
    selectedDate = new Date(date.getTime() - offset).toISOString().split("T")[0];
    resetForm();
    updateDateUI();
    renderTurnos();
  };

  document.getElementById("btn-prev-day").addEventListener("click", () => shiftDay(-1));
  document.getElementById("btn-next-day").addEventListener("click", () => shiftDay(1));

  // Copiar resumen para WhatsApp
  document.getElementById("btn-export-whatsapp").addEventListener("click", async () => {
    const turnos = StorageService.getByDate(selectedDate);
    if (turnos.length === 0) return;

    let total = 0;
    const lineas = turnos.map((t) => {
      total += Number(t.precio);
      return `• ${t.hora} - ${t.cliente} (${StorageService.formatCOP(t.precio)}) ${t.pagado ? "✅" : "⏳"}`;
    });

    const texto = `💈 *Agenda Barbería (${selectedDate})*\n\n${lineas.join("\n")}\n\n💰 *Total del día:* ${StorageService.formatCOP(total)}`;
    await navigator.clipboard.writeText(texto);
    alert("Resumen copiado al portapapeles.");
  });

  // Registrar Service Worker (PWA)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  updateDateUI();
  renderTurnos();
});