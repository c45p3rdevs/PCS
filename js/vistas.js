// vistas.js — Render de cada módulo de la app.
const Vistas = {};

/* =========================================================================
   DASHBOARD
   ========================================================================= */
Vistas.dashboard = async (zona) => {
  zona.innerHTML = `<div class="rejilla rejilla-4" id="kpis"></div>
    <div class="seccion-header"><h3>Ventas de hoy</h3></div>
    <div class="tabla-wrap" id="tabla-ventas-hoy"></div>`;

  const [ventas, productos, clientes] = await Promise.all([
    DB.getAll('ventas'), DB.getAll('productos'), DB.getAll('clientes')
  ]);

  const ventasHoy = ventas.filter(v => U.esHoy(v.fecha)).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const totalHoy = ventasHoy.reduce((s,v) => s + v.total, 0);
  const stockBajo = productos.filter(p => p.stockKg <= (p.stockMinimo || 0));

  document.getElementById('kpis').innerHTML = `
    <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Vendido hoy</div><div class="kpi-valor acento mono">${U.money(totalHoy)}</div></div>
    <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Ventas hoy</div><div class="kpi-valor mono">${ventasHoy.length}</div></div>
    <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Productos con stock bajo</div><div class="kpi-valor mono" style="color:${stockBajo.length ? 'var(--sello-rojo)' : 'var(--charcoal)'}">${stockBajo.length}</div></div>
    <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Clientes registrados</div><div class="kpi-valor mono">${clientes.length}</div></div>
  `;

  const cont = document.getElementById('tabla-ventas-hoy');
  if (!ventasHoy.length) {
    cont.innerHTML = `<div class="vacio">${U.iconoVacio}<div>Todavía no hay ventas hoy</div></div>`;
    return;
  }
  cont.innerHTML = `<table>
    <thead><tr><th>Hora</th><th>Productos</th><th>Pago</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${ventasHoy.map(v => `
      <tr>
        <td class="mono">${new Date(v.fecha).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</td>
        <td>${v.items.map(i => i.nombre).join(', ')}</td>
        <td>${v.metodoPago}</td>
        <td class="celda-num" style="text-align:right">${U.money(v.total)}</td>
      </tr>`).join('')}
    </tbody></table>`;
};

/* =========================================================================
   INVENTARIO
   ========================================================================= */
Vistas.inventario = async (zona) => {
  zona.innerHTML = `
    <div class="seccion-header" style="margin-top:0">
      <h3>Productos</h3>
      <button class="btn btn-primario btn-chico" id="btn-nuevo-producto">+ Nuevo producto</button>
    </div>
    <div class="rejilla rejilla-3" id="lista-productos"></div>`;

  document.getElementById('btn-nuevo-producto').addEventListener('click', () => Vistas._modalProducto());

  await Vistas._renderProductos();
};

Vistas._renderProductos = async () => {
  const productos = (await DB.getAll('productos')).sort((a,b) => a.nombre.localeCompare(b.nombre));
  const cont = document.getElementById('lista-productos');
  if (!productos.length) {
    cont.innerHTML = `<div class="vacio" style="grid-column:1/-1">${U.iconoVacio}<div>Aún no hay productos. Agrega el primero.</div></div>`;
    return;
  }
  cont.innerHTML = productos.map(p => {
    let sello = 'sello-ok', txt = 'Disponible';
    if (p.stockKg <= 0) { sello = 'sello-agotado'; txt = 'Agotado'; }
    else if (p.stockKg <= (p.stockMinimo || 0)) { sello = 'sello-bajo'; txt = 'Stock bajo'; }
    return `<div class="tarjeta">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div>
          <div style="font-family:var(--f-display); font-weight:700; font-size:16px; text-transform:uppercase;">${p.nombre}</div>
          <div class="mono" style="font-size:13px; color:var(--charcoal-2); opacity:0.75; margin-top:2px;">${U.money(p.precioKg)} / kg</div>
        </div>
        <div class="acciones-fila">
          <button class="icon-btn" data-editar="${p.id}">${U.iconoEditar}</button>
          <button class="icon-btn" data-borrar="${p.id}">${U.iconoBorrar}</button>
        </div>
      </div>
      <div class="mono" style="font-size:22px; font-weight:700; margin-bottom:8px;">${U.kg(p.stockKg)}</div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span class="sello ${sello}">${txt}</span>
        <button class="btn btn-secundario btn-chico" data-entrada="${p.id}">+ Entrada</button>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => Vistas._modalProducto(b.dataset.editar)));
  cont.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', () => Vistas._borrarProducto(b.dataset.borrar)));
  cont.querySelectorAll('[data-entrada]').forEach(b => b.addEventListener('click', () => Vistas._modalEntrada(b.dataset.entrada)));
};

Vistas._modalProducto = async (id) => {
  const p = id ? await DB.get('productos', Number(id)) : null;
  const cerrar = U.abrirModal(p ? 'Editar producto' : 'Nuevo producto', `
    <div class="campo"><label>Nombre</label><input id="mp-nombre" value="${p ? p.nombre : ''}" placeholder="Ej. Bistec de res"></div>
    <div class="form-row">
      <div class="campo"><label>Precio por kg</label><input id="mp-precio" type="number" step="0.01" min="0" value="${p ? p.precioKg : ''}"></div>
      <div class="campo"><label>Stock inicial (kg)</label><input id="mp-stock" type="number" step="0.001" min="0" value="${p ? p.stockKg : '0'}" ${p ? 'disabled' : ''}></div>
    </div>
    <div class="campo"><label>Alertar cuando el stock baje de (kg)</label><input id="mp-minimo" type="number" step="0.1" min="0" value="${p ? (p.stockMinimo || 0) : '2'}"></div>
    ${p ? '<p style="font-size:12px; color:var(--charcoal-2); opacity:0.7;">Para cambiar el stock usa el botón "+ Entrada" en la tarjeta del producto.</p>' : ''}
  `, `
    <button class="btn btn-secundario" id="mp-cancelar">Cancelar</button>
    <button class="btn btn-primario" id="mp-guardar">Guardar</button>
  `);
  document.getElementById('mp-cancelar').addEventListener('click', cerrar);
  document.getElementById('mp-guardar').addEventListener('click', async () => {
    const nombre = document.getElementById('mp-nombre').value.trim();
    const precioKg = parseFloat(document.getElementById('mp-precio').value) || 0;
    const stockMinimo = parseFloat(document.getElementById('mp-minimo').value) || 0;
    if (!nombre) return;
    if (p) {
      await DB.put('productos', { ...p, nombre, precioKg, stockMinimo });
    } else {
      const stockKg = parseFloat(document.getElementById('mp-stock').value) || 0;
      await DB.add('productos', { nombre, precioKg, stockKg, stockMinimo });
    }
    cerrar();
    await Vistas._renderProductos();
  });
};

Vistas._modalEntrada = async (id) => {
  const p = await DB.get('productos', Number(id));
  const cerrar = U.abrirModal(`Entrada de mercancía — ${p.nombre}`, `
    <p style="font-size:13px; color:var(--charcoal-2); margin-top:0;">Stock actual: <b class="mono">${U.kg(p.stockKg)}</b></p>
    <div class="campo"><label>Kilos que entran</label><input id="me-kg" type="number" step="0.001" min="0" placeholder="0.000"></div>
  `, `
    <button class="btn btn-secundario" id="me-cancelar">Cancelar</button>
    <button class="btn btn-primario" id="me-guardar">Registrar entrada</button>
  `);
  document.getElementById('me-cancelar').addEventListener('click', cerrar);
  document.getElementById('me-guardar').addEventListener('click', async () => {
    const kg = parseFloat(document.getElementById('me-kg').value) || 0;
    if (kg <= 0) return;
    await DB.put('productos', { ...p, stockKg: p.stockKg + kg });
    await DB.add('movimientos', { productoId: p.id, fecha: new Date().toISOString(), tipo: 'entrada', kg });
    cerrar();
    await Vistas._renderProductos();
  });
};

Vistas._borrarProducto = async (id) => {
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  await DB.delete('productos', Number(id));
  await Vistas._renderProductos();
};

/* =========================================================================
   VENTAS
   ========================================================================= */
Vistas.ventas = async (zona) => {
  const [productos, clientes] = await Promise.all([DB.getAll('productos'), DB.getAll('clientes')]);
  Vistas._carrito = [];

  zona.innerHTML = `
    <div class="rejilla rejilla-2" style="align-items:start;">
      <div>
        <div class="seccion-header" style="margin-top:0"><h3>1. Elige el producto</h3></div>
        <div class="selector-productos" id="chips-productos">
          ${productos.map(p => `<button class="chip-producto" data-id="${p.id}">
            <span class="nom">${p.nombre}</span>
            <span class="precio mono">${U.money(p.precioKg)}/kg · ${U.kg(p.stockKg)} disp.</span>
          </button>`).join('') || `<div class="vacio">${U.iconoVacio}<div>Registra productos en Inventario primero</div></div>`}
        </div>

        <div class="seccion-header"><h3>2. Peso</h3></div>
        <div class="lector-bascula">
          <span class="valor" id="valor-bascula">0.000</span>
          <span class="unidad">KG</span>
        </div>
        <input type="range" id="slider-kg" min="0" max="10" step="0.05" value="0" style="width:100%; margin-bottom:10px;">
        <div class="form-row">
          <input type="number" id="input-kg-exacto" step="0.001" min="0" placeholder="Peso exacto (kg)">
          <button class="btn btn-secundario" id="btn-agregar-carrito">Agregar al ticket</button>
        </div>
      </div>

      <div>
        <div class="seccion-header" style="margin-top:0"><h3>Ticket actual</h3></div>
        <div class="tarjeta">
          <div id="lista-carrito"><div class="vacio" style="padding:24px 0;">Agrega productos al ticket</div></div>
          <div class="carrito-total"><span>Total</span><span class="val mono" id="total-carrito">${U.money(0)}</span></div>
        </div>

        <div class="seccion-header"><h3>3. Forma de pago</h3></div>
        <div class="metodo-pago-row" id="chips-pago">
          <button class="chip-pago sel" data-metodo="Efectivo">Efectivo</button>
          <button class="chip-pago" data-metodo="Tarjeta">Tarjeta</button>
          <button class="chip-pago" data-metodo="Fiado">Fiado</button>
        </div>

        <div class="campo" style="margin-top:14px;">
          <label>Cliente (opcional)</label>
          <select id="select-cliente">
            <option value="">Público general</option>
            ${clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>

        <button class="btn btn-primario btn-ancho" id="btn-cerrar-venta" style="margin-top:8px;" disabled>Registrar venta</button>
      </div>
    </div>
  `;

  let productoSel = null;
  const productosPorId = Object.fromEntries(productos.map(p => [String(p.id), p]));

  const chips = document.getElementById('chips-productos');
  chips.querySelectorAll('.chip-producto').forEach(c => c.addEventListener('click', () => {
    chips.querySelectorAll('.chip-producto').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    productoSel = productosPorId[c.dataset.id];
    const max = Math.max(productoSel.stockKg, 0.01);
    const slider = document.getElementById('slider-kg');
    slider.max = max.toFixed(3);
    slider.value = 0;
    document.getElementById('valor-bascula').textContent = '0.000';
    document.getElementById('input-kg-exacto').value = '';
  }));

  const slider = document.getElementById('slider-kg');
  const exacto = document.getElementById('input-kg-exacto');
  slider.addEventListener('input', () => {
    document.getElementById('valor-bascula').textContent = parseFloat(slider.value).toFixed(3);
    exacto.value = slider.value;
  });
  exacto.addEventListener('input', () => {
    const v = parseFloat(exacto.value) || 0;
    document.getElementById('valor-bascula').textContent = v.toFixed(3);
    if (v <= parseFloat(slider.max)) slider.value = v;
  });

  document.getElementById('btn-agregar-carrito').addEventListener('click', () => {
    if (!productoSel) { alert('Primero elige un producto'); return; }
    const kg = parseFloat(exacto.value) || parseFloat(slider.value) || 0;
    if (kg <= 0) { alert('Indica un peso mayor a 0'); return; }
    if (kg > productoSel.stockKg) { alert('No hay suficiente stock de ' + productoSel.nombre); return; }
    Vistas._carrito.push({ productoId: productoSel.id, nombre: productoSel.nombre, kg, precioKg: productoSel.precioKg, subtotal: kg * productoSel.precioKg });
    Vistas._renderCarrito();
  });

  document.querySelectorAll('#chips-pago .chip-pago').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#chips-pago .chip-pago').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
  }));

  document.getElementById('btn-cerrar-venta').addEventListener('click', async () => {
    if (!Vistas._carrito.length) return;
    const metodoPago = document.querySelector('#chips-pago .chip-pago.sel').dataset.metodo;
    const clienteId = document.getElementById('select-cliente').value || null;
    const total = Vistas._carrito.reduce((s,i) => s + i.subtotal, 0);
    const sesion = Auth.sesionActual();

    await DB.add('ventas', {
      fecha: new Date().toISOString(),
      items: Vistas._carrito,
      total, metodoPago, clienteId: clienteId ? Number(clienteId) : null,
      usuarioId: sesion ? sesion.id : null
    });

    for (const item of Vistas._carrito) {
      const prod = await DB.get('productos', item.productoId);
      await DB.put('productos', { ...prod, stockKg: Math.max(0, prod.stockKg - item.kg) });
      await DB.add('movimientos', { productoId: item.productoId, fecha: new Date().toISOString(), tipo: 'venta', kg: -item.kg });
    }

    alert('Venta registrada: ' + U.money(total));
    App.irVista('ventas');
  });

  Vistas._renderCarrito();
};

Vistas._renderCarrito = () => {
  const cont = document.getElementById('lista-carrito');
  const carrito = Vistas._carrito;
  if (!carrito.length) {
    cont.innerHTML = `<div class="vacio" style="padding:24px 0;">Agrega productos al ticket</div>`;
  } else {
    cont.innerHTML = carrito.map((i, idx) => `
      <div class="carrito-item">
        <span>${i.nombre} — <span class="mono">${U.kg(i.kg)}</span></span>
        <span style="display:flex; align-items:center; gap:10px;">
          <span class="mono">${U.money(i.subtotal)}</span>
          <button class="icon-btn" data-quitar="${idx}">${U.iconoBorrar}</button>
        </span>
      </div>`).join('');
    cont.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => {
      Vistas._carrito.splice(Number(b.dataset.quitar), 1);
      Vistas._renderCarrito();
    }));
  }
  const total = carrito.reduce((s,i) => s + i.subtotal, 0);
  document.getElementById('total-carrito').textContent = U.money(total);
  document.getElementById('btn-cerrar-venta').disabled = carrito.length === 0;
};

/* =========================================================================
   CLIENTES
   ========================================================================= */
Vistas.clientes = async (zona) => {
  zona.innerHTML = `
    <div class="seccion-header" style="margin-top:0">
      <h3>Clientes</h3>
      <button class="btn btn-primario btn-chico" id="btn-nuevo-cliente">+ Nuevo cliente</button>
    </div>
    <div class="tabla-wrap" id="tabla-clientes"></div>`;
  document.getElementById('btn-nuevo-cliente').addEventListener('click', () => Vistas._modalCliente());
  await Vistas._renderClientes();
};

Vistas._renderClientes = async () => {
  const clientes = (await DB.getAll('clientes')).sort((a,b) => a.nombre.localeCompare(b.nombre));
  const cont = document.getElementById('tabla-clientes');
  if (!clientes.length) {
    cont.innerHTML = `<div class="vacio">${U.iconoVacio}<div>Aún no hay clientes registrados</div></div>`;
    return;
  }
  cont.innerHTML = `<table>
    <thead><tr><th>Nombre</th><th>Teléfono</th><th>Notas</th><th></th></tr></thead>
    <tbody>${clientes.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td class="mono">${c.telefono || '—'}</td>
        <td>${c.notas || '—'}</td>
        <td><div class="acciones-fila">
          <button class="icon-btn" data-editar="${c.id}">${U.iconoEditar}</button>
          <button class="icon-btn" data-borrar="${c.id}">${U.iconoBorrar}</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table>`;
  cont.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => Vistas._modalCliente(b.dataset.editar)));
  cont.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await DB.delete('clientes', Number(b.dataset.borrar));
    await Vistas._renderClientes();
  }));
};

Vistas._modalCliente = async (id) => {
  const c = id ? await DB.get('clientes', Number(id)) : null;
  const cerrar = U.abrirModal(c ? 'Editar cliente' : 'Nuevo cliente', `
    <div class="campo"><label>Nombre</label><input id="mc-nombre" value="${c ? c.nombre : ''}"></div>
    <div class="campo"><label>Teléfono</label><input id="mc-tel" value="${c ? (c.telefono||'') : ''}"></div>
    <div class="campo"><label>Notas</label><input id="mc-notas" value="${c ? (c.notas||'') : ''}" placeholder="Ej. cliente frecuente, fiado, etc."></div>
  `, `
    <button class="btn btn-secundario" id="mc-cancelar">Cancelar</button>
    <button class="btn btn-primario" id="mc-guardar">Guardar</button>
  `);
  document.getElementById('mc-cancelar').addEventListener('click', cerrar);
  document.getElementById('mc-guardar').addEventListener('click', async () => {
    const nombre = document.getElementById('mc-nombre').value.trim();
    if (!nombre) return;
    const telefono = document.getElementById('mc-tel').value.trim();
    const notas = document.getElementById('mc-notas').value.trim();
    if (c) await DB.put('clientes', { ...c, nombre, telefono, notas });
    else await DB.add('clientes', { nombre, telefono, notas });
    cerrar();
    await Vistas._renderClientes();
  });
};

/* =========================================================================
   CORTES DE CAJA
   ========================================================================= */
Vistas.cortes = async (zona) => {
  const [ventas, cortes] = await Promise.all([DB.getAll('ventas'), DB.getAll('cortes')]);
  const ventasHoy = ventas.filter(v => U.esHoy(v.fecha));
  const porMetodo = { Efectivo: 0, Tarjeta: 0, Fiado: 0 };
  ventasHoy.forEach(v => { porMetodo[v.metodoPago] = (porMetodo[v.metodoPago] || 0) + v.total; });
  const totalHoy = ventasHoy.reduce((s,v) => s + v.total, 0);
  const yaHizoCorte = cortes.some(c => U.esHoy(c.fecha));

  zona.innerHTML = `
    <div class="seccion-header" style="margin-top:0"><h3>Corte del día — ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</h3></div>
    <div class="rejilla rejilla-4">
      <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Efectivo</div><div class="kpi-valor mono">${U.money(porMetodo.Efectivo)}</div></div>
      <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Tarjeta</div><div class="kpi-valor mono">${U.money(porMetodo.Tarjeta)}</div></div>
      <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Fiado</div><div class="kpi-valor mono">${U.money(porMetodo.Fiado)}</div></div>
      <div class="tarjeta tarjeta-kpi"><div class="kpi-label">Total del día</div><div class="kpi-valor acento mono">${U.money(totalHoy)}</div></div>
    </div>
    <button class="btn btn-primario" id="btn-cerrar-corte" style="margin-top:20px;" ${yaHizoCorte ? 'disabled' : ''}>
      ${yaHizoCorte ? 'Corte de hoy ya registrado' : 'Cerrar corte del día'}
    </button>

    <div class="seccion-header"><h3>Historial de cortes</h3></div>
    <div class="tabla-wrap" id="tabla-cortes"></div>
  `;

  document.getElementById('btn-cerrar-corte').addEventListener('click', async () => {
    if (!confirm('¿Cerrar el corte de hoy con un total de ' + U.money(totalHoy) + '?')) return;
    await DB.add('cortes', {
      fecha: new Date().toISOString(),
      totalEfectivo: porMetodo.Efectivo, totalTarjeta: porMetodo.Tarjeta, totalFiado: porMetodo.Fiado,
      totalGeneral: totalHoy, numVentas: ventasHoy.length,
      usuarioId: (Auth.sesionActual() || {}).id
    });
    App.irVista('cortes');
  });

  const cont = document.getElementById('tabla-cortes');
  const historial = cortes.sort((a,b) => b.fecha.localeCompare(a.fecha));
  if (!historial.length) {
    cont.innerHTML = `<div class="vacio">${U.iconoVacio}<div>Aún no hay cortes registrados</div></div>`;
    return;
  }
  cont.innerHTML = `<table>
    <thead><tr><th>Fecha</th><th>Ventas</th><th>Efectivo</th><th>Tarjeta</th><th>Fiado</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${historial.map(c => `
      <tr>
        <td>${U.fechaLegible(c.fecha)}</td>
        <td class="mono">${c.numVentas}</td>
        <td class="celda-num">${U.money(c.totalEfectivo)}</td>
        <td class="celda-num">${U.money(c.totalTarjeta)}</td>
        <td class="celda-num">${U.money(c.totalFiado)}</td>
        <td class="celda-num" style="text-align:right; font-weight:700;">${U.money(c.totalGeneral)}</td>
      </tr>`).join('')}
    </tbody></table>`;
};


/* =========================================================================
   REPORTES Y GRÁFICAS PRO (DASHBOARD ESTILO MODERNO)
   ========================================================================= */
Vistas.reportes = async (zona) => {
  // VALIDACIÓN DE SEGURIDAD: Si Chart.js no se ha cargado aún, esperamos 300ms y reintentamos
  if (typeof Chart === 'undefined') {
    zona.innerHTML = `
      <div class="vacio" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px;">
        <div class="spinner-sello"></div>
        <div style="margin-top:16px; font-family:var(--f-body); font-size:14px; font-weight:600; color:var(--charcoal-2);">
          Cargando motor de gráficos...
        </div>
      </div>`;
    setTimeout(() => Vistas.reportes(zona), 300);
    return;
  }

  // Inicializar interfaz base adaptada al diseño de la imagen
  zona.innerHTML = `
    <div class="dashboard-container">
      <!-- Selector de Tiempo en formato de Filtros Modernos -->
      <div class="selector-tiempo" id="reporte-filtros" style="margin-bottom: 24px;">
        <button class="chip-pago sel" data-filtro="mes">Por Mes</button>
        <button class="chip-pago" data-filtro="semana">Por Semana</button>
        <button class="chip-pago" data-filtro="dia">Por Día</button>
      </div>

      <!-- Fila de Tarjetas KPI Dinámicas -->
      <div class="kpi-grid">
        <div class="kpi-card active-border">
          <div class="kpi-icon color-purple"><i class="fas fa-dollar-sign"></i></div>
          <h3 id="kpi-ganancias">$0.00</h3>
          <p>Ganancias Totales</p>
          <span class="kpi-trend trend-up">Activo</span>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon color-green"><i class="fas fa-shopping-basket"></i></div>
          <h3 id="kpi-ventas">0</h3>
          <p>Total de Ventas</p>
          <span class="kpi-trend trend-up">Histórico</span>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon color-blue"><i class="fas fa-chart-line"></i></div>
          <h3 id="kpi-promedio">$0.00</h3>
          <p>Ticket Promedio</p>
          <span class="kpi-trend trend-up">Eficiencia</span>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon color-red"><i class="fas fa-calendar-day"></i></div>
          <h3 id="kpi-periodo">-</h3>
          <p>Rango Evaluado</p>
          <span class="kpi-trend trend-down">Periodo</span>
        </div>
      </div>

      <!-- Sección de la Gráfica Principal -->
      <div class="chart-section">
        <div class="chart-header">
          <h4 id="chart-main-title">Actividad General del Negocio</h4>
          <span class="chart-date" id="chart-date-range">Cargando datos...</span>
        </div>
        <div class="chart-body" style="position: relative; height: 320px; width: 100%;">
          <canvas id="mainActivityChart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Obtener todas las ventas registradas de IndexedDB
  const ventas = await DB.getAll('ventas');

  const alternarFiltros = (filtroActivo) => {
    document.querySelectorAll('#reporte-filtros .chip-pago').forEach(b => {
      b.classList.toggle('sel', b.dataset.filtro === filtroActivo);
    });
    Vistas._renderDatosReporte(ventas, filtroActivo);
  };

  // Asignar eventos a los botones de filtro
  document.querySelectorAll('#reporte-filtros .chip-pago').forEach(btn => {
    btn.addEventListener('click', () => alternarFiltros(btn.dataset.filtro));
  });

  // Render inicial por defecto ("mes")
  Vistas._renderDatosReporte(ventas, 'mes');
};

Vistas._renderDatosReporte = (ventas, filtro) => {
  const chartBody = document.querySelector('.chart-body');

  if (!ventas.length) {
    chartBody.innerHTML = `<div class="vacio">${U.iconoVacio}<div>No hay ventas guardadas para procesar reportes</div></div>`;
    return;
  }

  // 1. CÁLCULO DE MÉTRICAS GLOBALES PARA LOS KPIS SUPERIORES
  let totalGanado = 0;
  ventas.forEach(v => totalGanado += v.total);
  const ticketPromedio = totalGanado / ventas.length;

  document.getElementById('kpi-ganancias').innerText = U.money(totalGanado);
  document.getElementById('kpi-ventas').innerText = ventas.length;
  document.getElementById('kpi-promedio').innerText = U.money(ticketPromedio);
  document.getElementById('kpi-periodo').innerText = filtro.toUpperCase();

  // 2. AGRUPACIÓN TEMPORAL DE LOS DATOS
  const agrupado = {};

  ventas.forEach(v => {
    if (!v.fecha) return;
    const fechaObj = new Date(v.fecha);
    let llave = '';

    if (filtro === 'mes') {
      llave = fechaObj.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
    } else if (filtro === 'semana') {
      const primeroDeAnio = new Date(fechaObj.getFullYear(), 0, 1);
      const dias = Math.floor((fechaObj - primeroDeAnio) / (24 * 60 * 60 * 1000));
      const semanaNum = Math.ceil((dias + primeroDeAnio.getDay() + 1) / 7);
      llave = `Sem ${semanaNum}`;
    } else if (filtro === 'dia') {
      llave = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }

    if (!agrupado[llave]) {
      agrupado[llave] = { ganancias: 0, totalVentas: 0 };
    }

    agrupado[llave].ganancias += v.total;
    agrupado[llave].totalVentas += 1;
  });

  // Extraer etiquetas y datos base
  let etiquetas = Object.keys(agrupado);
  let datosGanancias = etiquetas.map(k => agrupado[k].ganancias);
  let datosVentas = etiquetas.map(k => agrupado[k].totalVentas);

  // ESTRATEGIA DE SEGURIDAD: Si sólo hay 1 punto de datos, agregamos un punto "cero" inicial 
  // para obligar a Chart.js a trazar la línea/área visible en vez de dejar un punto invisible.
  if (etiquetas.length === 1) {
    etiquetas.unshift("Inicio");
    datosGanancias.unshift(0);
    datosVentas.unshift(0);
  } else {
    // Si hay más, limitamos a los últimos 7 periodos normales
    etiquetas = etiquetas.slice(-7);
    datosGanancias = datosGanancias.slice(-7);
    datosVentas = datosVentas.slice(-7);
  }

  document.getElementById('chart-date-range').innerText = `Rendimiento del periodo analizado`;

  // Asegurar que el elemento canvas exista recreándolo limpiamente
  chartBody.innerHTML = `<canvas id="mainActivityChart"></canvas>`;
  const ctx = document.getElementById('mainActivityChart').getContext('2d');

  // Destruir instancia previa de manera segura si existe
  if (window.myDashboardChart && typeof window.myDashboardChart.destroy === 'function') {
    window.myDashboardChart.destroy();
    window.myDashboardChart = null;
  }

  // 3. GENERACIÓN DE LA GRÁFICA DE ÁREA SUAVIZADA (Chart.js)
  window.myDashboardChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Volumen de Ventas (Tickets)',
          data: datosVentas,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'yVentas'
        },
        {
          label: 'Ganancias ($)',
          data: datosGanancias,
          borderColor: '#6c5ce7',
          backgroundColor: 'rgba(108, 92, 231, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'yGanancias'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 12, font: { family: 'Segoe UI' } }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        yGanancias: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: 'Ganancias ($)' },
          grid: { color: '#edf2f7' }
        },
        yVentas: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          title: { display: true, text: 'Tickets' },
          grid: { display: false }
        }
      }
    }
  });
};