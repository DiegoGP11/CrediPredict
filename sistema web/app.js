// ==================== CONFIGURACIÓN ====================
const CONFIG = { CHUNK_SIZE: 10000, DISPLAY_LIMIT: 1000 };

// ==================== DATA & STATE ====================
let evaluationData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = -1;
let sortDirection = 'asc';
let contactadosData = JSON.parse(localStorage.getItem('contactados') || '[]');

// ==================== LOADING UI ====================
function showLoading(text) {
    const o = document.getElementById('loadingOverlay'), t = document.getElementById('loadingText');
    if(t) t.textContent = text; if(o) o.classList.remove('hidden');
}
function hideLoading() {
    const o = document.getElementById('loadingOverlay'); if(o) o.classList.add('hidden');
}
function updateProgress(cur, tot, rec) {
    const f = document.getElementById('progressFill'), s = document.getElementById('loadingStats');
    const pct = tot > 0 ? (cur/tot)*100 : 0;
    if(f) f.style.width = pct+'%';
    if(s) s.textContent = `${rec.toLocaleString()} procesados (${pct.toFixed(1)}%)`;
}

// ==================== IMPORTAR CSV ====================
function importCSV(input) {
    const file = input.files[0]; if(!file) return;
    showLoading('Leyendo archivo...');
    const reader = new FileReader();
    reader.onprogress = e => { if(e.lengthComputable) document.getElementById('progressFill').style.width = ((e.loaded/e.total)*100)+'%'; };
    reader.onload = e => {
        try { processCSV(e.target.result, input); }
        catch(err) { hideLoading(); alert('Error: ' + err.message); console.error(err); }
    };
    reader.onerror = () => { hideLoading(); alert('Error leyendo archivo'); };
    reader.readAsText(file);
}

function normalizeHeader(h) {
    return h.trim().toLowerCase().replace(/%$/g,'').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
}

// Parsea línea CSV respetando campos entre comillas
function parseCSVLine(line, delim) {
    const result = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else inQ=!inQ; }
        else if (ch===delim && !inQ) { result.push(cur.trim()); cur=''; }
        else { cur+=ch; }
    }
    result.push(cur.trim()); return result;
}

function processCSV(csvText, input) {
    showLoading('Analizando estructura...');
    setTimeout(() => {
        try {
            // Limpiar BOM y normalizar saltos de línea
            csvText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
            const firstLine = csvText.split('\n')[0];
            const delim = firstLine.includes(';') ? ';' : firstLine.includes('|') ? '|' : ',';
            const lines = csvText.trim().split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) { hideLoading(); alert('⚠️ El CSV está vacío o solo tiene encabezados.'); return; }
            const headers = parseCSVLine(lines[0], delim).map(normalizeHeader);
            console.log('Delimitador:', JSON.stringify(delim), '| Headers:', headers, '| Filas:', lines.length-1);
            const dataLines = lines.slice(1);
            const total = dataLines.length;
            const chunks = Math.max(1, Math.ceil(total / CONFIG.CHUNK_SIZE));
            let cur = 0; evaluationData = [];
            showLoading('Procesando ' + total.toLocaleString() + ' registros...');
            function processChunk() {
                const start = cur * CONFIG.CHUNK_SIZE, end = Math.min(start + CONFIG.CHUNK_SIZE, dataLines.length);
                for (let i = start; i < end; i++) {
                    if (!dataLines[i].trim()) continue;
                    const vals = parseCSVLine(dataLines[i], delim);
                    const obj = {};
                    headers.forEach((h, idx) => {
                        let val = (vals[idx]!==undefined ? vals[idx] : '').replace(/[\u2705\u2717\u2714\ufe0f]/g,'').trim();
                        if (val!=='' && !isNaN(val)) val = parseFloat(val);
                        obj[h] = val;
                    });
                    evaluationData.push(obj);
                }
                cur++; updateProgress(cur, chunks, evaluationData.length);
                if (cur < chunks) { setTimeout(processChunk, 50); }
                else {
                    filteredData = [...evaluationData]; hideLoading();
                    if (input) input.value = '';
                    console.log('✅ Cargado:', evaluationData.length, '| Muestra:', evaluationData[0]);
                    showNotif('✅ ' + evaluationData.length.toLocaleString() + ' registros cargados', 'success');
                    initDashboard();
                }
            }
            processChunk();
        } catch(e) { hideLoading(); console.error(e); alert('❌ Error procesando CSV:\n' + e.message + '\n\nAbre consola (F12) para detalles.'); }
    }, 100);
}

// ==================== HELPERS DE CAMPOS ALIAS ====================
// Soporta tanto el CSV del modelo ML (person_income, loan_amnt)
// como el CSV enriquecido (ingreso_mensual, monto_solicitado)
function getIngreso(d) {
    if (d.ingreso_mensual && d.ingreso_mensual > 0) return parseFloat(d.ingreso_mensual);
    if (d.person_income   && d.person_income   > 0) return parseFloat(d.person_income) / 12;
    return 0;
}
function getMonto(d) {
    if (d.monto_solicitado && d.monto_solicitado > 0) return parseFloat(d.monto_solicitado);
    if (d.loan_amnt        && d.loan_amnt        > 0) return parseFloat(d.loan_amnt);
    return 0;
}
function getCuota(d) {
    if (d.cuota_mensual_estimada && d.cuota_mensual_estimada > 0) return parseFloat(d.cuota_mensual_estimada);
    return 0;
}
function getCapacidad(d) {
    if (d.capacidad_pago && d.capacidad_pago > 0) return parseFloat(d.capacidad_pago);
    return getIngreso(d) * 0.35; // Fallback: 35% del ingreso
}
function getDecision(d) { return (d.decision || d.DECISION || '').toUpperCase(); }
function getRisk(d)     { return d.nivel_riesgo || d.NIVEL_RIESGO || ''; }

// ==================== NOTIFICACIONES ====================
function showNotif(msg, type='info') {
    const n = document.createElement('div');
    n.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'info-circle'}"></i> ${msg}`;
    n.style.cssText = `position:fixed;top:80px;right:20px;padding:16px 24px;background:${type==='success'?'var(--success-bg)':'var(--info-bg)'};border:1px solid ${type==='success'?'var(--success)':'var(--info)'};border-radius:var(--radius);color:${type==='success'?'var(--success)':'var(--info)'};font-weight:600;z-index:10000;display:flex;align-items:center;gap:10px;box-shadow:var(--shadow);`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity='0'; setTimeout(()=>n.remove(),300); }, 3000);
}

// ==================== CONTACTADOS ====================
function saveContactados() { localStorage.setItem('contactados', JSON.stringify(contactadosData)); }

function markContactado(id) {
    const existing = contactadosData.find(c => c.id === id);
    if(!existing) {
        const cliente = evaluationData.find(d => d.id_evaluacion == id);
        if(cliente) {
            contactadosData.push({ id, cliente: `${cliente.nombre} ${cliente.apellido_paterno}`, monto: getMonto(cliente), contactado: true, propuesta: 'pendiente', fechaContacto: new Date().toISOString() });
            saveContactados(); updateContactadosUI();
            showNotif('✅ Cliente marcado como contactado', 'success');
        }
    } else { showNotif('ℹ️ Ya está en contactados', 'info'); }
}

function updatePropuesta(id, status) {
    const reg = contactadosData.find(c => c.id === id);
    if(reg) { reg.propuesta = status; reg.fechaPropuesta = new Date().toISOString(); saveContactados(); updateContactadosUI(); showNotif(status==='aceptada'?'✅ Propuesta aceptada':'❌ Propuesta rechazada', status==='aceptada'?'success':'info'); }
}
function removeContactado(id) { contactadosData=contactadosData.filter(c=>c.id!==id); saveContactados(); updateContactadosUI(); showNotif('Registro eliminado','info'); }

function updateContactadosUI() {
    const kpiC=document.getElementById('kpiContactados'), kpiA=document.getElementById('kpiAceptaron');
    const kpiR=document.getElementById('kpiRechazaron'), kpiP=document.getElementById('kpiPendientes');
    const pctAcc=document.getElementById('pctAceptacion');
    if(kpiC) kpiC.textContent=contactadosData.length;
    const aceptaron=contactadosData.filter(c=>c.propuesta==='aceptada').length;
    const rechazaron=contactadosData.filter(c=>c.propuesta==='rechazada').length;
    const pendientes=contactadosData.filter(c=>c.propuesta==='pendiente').length;
    if(kpiA) kpiA.textContent=aceptaron; if(kpiR) kpiR.textContent=rechazaron; if(kpiP) kpiP.textContent=pendientes;
    if(pctAcc) pctAcc.innerHTML=contactadosData.length>0?`<i class="fas fa-check"></i> ${((aceptaron/contactadosData.length)*100).toFixed(1)}%`:'0%';
    const tb=document.getElementById('contactadosTableBody'); if(!tb) return; tb.innerHTML='';
    contactadosData.forEach(c=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td><b>${c.cliente}</b></td><td>S/ ${fmtNum(c.monto)}</td>
            <td><span style="color:var(--success)"><i class="fas fa-check"></i> Sí</span></td>
            <td>${c.propuesta==='pendiente'?'<span class="badge badge-medium">⏳ Pendiente</span>':c.propuesta==='aceptada'?'<span class="badge badge-approved">✅ Aceptada</span>':'<span class="badge badge-rejected">❌ Rechazada</span>'}</td>
            <td>${new Date(c.fechaContacto).toLocaleDateString()}</td>
            <td>${c.propuesta==='pendiente'?`<button class="action-btn" onclick="updatePropuesta(${c.id},'aceptada')" title="Aceptó" style="color:var(--success)"><i class="fas fa-check"></i></button><button class="action-btn" onclick="updatePropuesta(${c.id},'rechazada')" title="Rechazó" style="color:var(--danger)"><i class="fas fa-times"></i></button>`:''}<button class="action-btn" onclick="removeContactado(${c.id})" title="Eliminar" style="color:var(--text-muted)"><i class="fas fa-trash"></i></button></td>`;
        tb.appendChild(tr);
    });
}

function exportContactados() {
    if(!contactadosData.length) { showNotif('No hay datos para exportar','info'); return; }
    const csv='ID,Cliente,Monto,Contactado,Propuesta,Fecha Contacto\n'+contactadosData.map(c=>`${c.id},"${c.cliente}",${c.monto},${c.contactado},${c.propuesta},${c.fechaContacto}`).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='contactados.csv'; a.click(); showNotif('📥 Exportado correctamente','success');
}

// ==================== LOGIN ====================
document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const u=document.getElementById('username').value.trim(), p=document.getElementById('password').value;
    const err=document.getElementById('loginError');
    if(u==='alumno1' && p==='12345678') {
        err.classList.remove('show');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
        localStorage.setItem('lastLogin', new Date().toISOString());
        showNotif('👋 Bienvenido. Importa tu CSV para comenzar.', 'info');
    } else { err.classList.add('show'); setTimeout(()=>err.classList.remove('show'),3000); }
});

function togglePassword() {
    const p=document.getElementById('password'), i=document.getElementById('eyeIcon');
    if(p.type==='password') { p.type='text'; i.className='fas fa-eye-slash'; } else { p.type='password'; i.className='fas fa-eye'; }
}
function logout() {
    document.getElementById('dashboardScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('username').value=''; document.getElementById('password').value='';
    evaluationData=[]; filteredData=[];
}

// ==================== INIT ====================
function initDashboard() {
    if(!evaluationData.length) { showNotif('⚠️ No hay datos.','info'); return; }
    updateClock(); setInterval(updateClock,1000);
    calcKPIs(); popFullTable(); popRecent(); popFilters();
    renderDonut(); renderBar(); renderDept(); renderClients();
    renderAnalysis(); renderReports(); updateConfig(); updateBadge();
    if(contactadosData.length) updateContactadosUI();
}
function updateClock() { const el=document.getElementById('topbarTime'); if(el) el.textContent=new Date().toLocaleTimeString('es-PE'); }

// ==================== KPIs ====================
function calcKPIs() {
    const t=evaluationData.length; if(!t) return;
    const app=evaluationData.filter(d=>getDecision(d).includes('APROBADO')).length;
    const rej=t-app;
    // Pérdida Evitada = monto × prob_incumplimiento de RECHAZADOS
    const perdidaEvitada=evaluationData.filter(d=>getDecision(d).includes('RECHAZADO')).reduce((s,d)=>s+(getMonto(d)*(parseFloat(d.prob_incumplimiento)||0)/100),0);
    // Ingreso Proyectado = suma cuotas de APROBADOS
    const ingresoProyectado=evaluationData.filter(d=>getDecision(d).includes('APROBADO')).reduce((s,d)=>s+getCuota(d),0);
    const tasaInc=evaluationData.reduce((s,d)=>s+(parseFloat(d.prob_incumplimiento)||0),0)/t;

    animVal('kpiTotal',0,t); animVal('kpiApproved',0,app); animVal('kpiRejected',0,rej);
    document.getElementById('kpiAmount').textContent='S/ '+fmtNum(Math.round(perdidaEvitada));
    document.getElementById('kpiRisk').textContent=tasaInc.toFixed(1)+'%';
    document.getElementById('kpiCapacity').textContent='S/ '+fmtNum(Math.round(ingresoProyectado));
    document.getElementById('kpiApprovedPct').innerHTML=`<i class="fas fa-arrow-up"></i> ${((app/t)*100).toFixed(1)}%`;
    document.getElementById('kpiRejectedPct').innerHTML=`<i class="fas fa-arrow-down"></i> ${((rej/t)*100).toFixed(1)}%`;
}

function animVal(id,s,e) {
    const el=document.getElementById(id); if(!el) return;
    const rng=e-s, st=performance.now();
    function upd(t) { const p=Math.min((t-st)/800,1),ez=1-Math.pow(1-p,3); el.textContent=Math.floor(s+rng*ez).toLocaleString(); if(p<1) requestAnimationFrame(upd); }
    requestAnimationFrame(upd);
}

// ==================== TABLES ====================
function popFullTable() {
    const tb=document.getElementById('fullTableBody'); if(!tb) return; tb.innerHTML='';
    const disp=filteredData.slice(0,CONFIG.DISPLAY_LIMIT);
    const s=(currentPage-1)*rowsPerPage, end=s+rowsPerPage;
    disp.slice(s,end).forEach(d=>{
        const tr=document.createElement('tr');
        const endeud=d.endeudamiento_total?((parseFloat(d.endeudamiento_total)*100).toFixed(1))+'%':(d.loan_percent_income?((parseFloat(d.loan_percent_income)*100).toFixed(1))+'%':'-');
        tr.innerHTML=`
            <td><strong>${d.id_evaluacion||'-'}</strong></td>
            <td>${d.nombre||''} ${d.apellido_paterno||''}</td>
            <td>${d.departamento||'-'}</td>
            <td>${d.nivel_educacion||'-'}</td>
            <td>${d.tipo_empleo||'-'}</td>
            <td>${d.sector||'-'}</td>
            <td>S/ ${fmtNum(Math.round(getIngreso(d)))}</td>
            <td>${d.motivo_credito||d.loan_intent||'-'}</td>
            <td><strong>S/ ${fmtNum(Math.round(getMonto(d)))}</strong></td>
            <td>${d.plazo_meses||'-'}m</td>
            <td>S/ ${fmtNum(Math.round(getCuota(d)))}</td>
            <td>S/ ${fmtNum(Math.round(getCapacidad(d)))}</td>
            <td>${endeud}</td>
            <td>${d.prob_incumplimiento||'-'}%</td>
            <td>${d.prob_pago||'-'}%</td>
            <td>${getDecision(d).includes('APROBADO')?'<span class="badge badge-approved">✅ APROBADO</span>':'<span class="badge badge-rejected">❌ RECHAZADO</span>'}</td>
            <td>${riskBadge(getRisk(d))}</td>
            <td><button class="action-btn" onclick="viewDetail(${d.id_evaluacion||0})"><i class="fas fa-eye"></i></button></td>`;
        tb.appendChild(tr);
    });
    const rc=document.getElementById('recordCount');
    if(rc) rc.textContent=filteredData.length>CONFIG.DISPLAY_LIMIT?`Mostrando ${CONFIG.DISPLAY_LIMIT.toLocaleString()} de ${filteredData.length.toLocaleString()}`:`${filteredData.length.toLocaleString()} registros`;
    renderPagination();
}

function popRecent() {
    const tb=document.getElementById('recentTableBody'); if(!tb) return; tb.innerHTML='';
    evaluationData.slice(-5).reverse().forEach(d=>{
        const yaContactado=contactadosData.find(c=>c.id===d.id_evaluacion);
        const tr=document.createElement('tr');
        tr.innerHTML=`
            <td><strong>${d.id_evaluacion||'-'}</strong></td>
            <td>${d.nombre||''} ${d.apellido_paterno||''}</td>
            <td>${d.departamento||'-'}</td>
            <td><strong>S/ ${fmtNum(Math.round(getMonto(d)))}</strong></td>
            <td>${d.prob_pago||'-'}%</td>
            <td>${getDecision(d).includes('APROBADO')?'<span class="badge badge-approved">✅ APROBADO</span>':'<span class="badge badge-rejected">❌ RECHAZADO</span>'}</td>
            <td>${riskBadge(getRisk(d))}</td>
            <td>
                <button class="action-btn" onclick="viewDetail(${d.id_evaluacion||0})" title="Ver detalle"><i class="fas fa-eye"></i></button>
                ${getDecision(d).includes('APROBADO')?`<button class="action-btn" onclick="markContactado(${d.id_evaluacion||0})" title="Marcar contactado" style="margin-left:4px;background:${yaContactado?'var(--warning-bg)':'var(--success-bg)'};color:${yaContactado?'var(--warning)':'var(--success)'}"><i class="fas fa-phone${yaContactado?'-slash':''}"></i></button>`:''}
            </td>`;
        tb.appendChild(tr);
    });
}

// ==================== BADGES & HELPERS ====================
function riskBadge(l) {
    const v=(l||'').toUpperCase().trim();
    if(v.includes('MUY ALTO')||v==='MUY_ALTO') return '<span class="badge badge-muy-alto">🔴 MUY ALTO</span>';
    if(v.includes('ALTO'))  return '<span class="badge badge-high">🟠 ALTO</span>';
    if(v.includes('MEDIO')) return '<span class="badge badge-medium">🟡 MEDIO</span>';
    if(v.includes('BAJO'))  return '<span class="badge badge-low">🟢 BAJO</span>';
    return l||'-';
}
function riskLevel(l) {
    const v=(l||'').toUpperCase().trim();
    if(v.includes('MUY ALTO')||v==='MUY_ALTO') return 'MUY ALTO';
    if(v.includes('ALTO'))  return 'ALTO';
    if(v.includes('MEDIO')) return 'MEDIO';
    if(v.includes('BAJO'))  return 'BAJO';
    return '';
}
// Segmentación exacta del modelo Python:
// if prob < 20: BAJO | elif prob < 50: MEDIO | elif prob < 75: ALTO | else: MUY ALTO
function nivelRiesgoFromProb(prob) {
    const p=parseFloat(prob)||0;
    if(p<20) return 'BAJO'; if(p<50) return 'MEDIO'; if(p<75) return 'ALTO'; return 'MUY ALTO';
}
function fmtNum(n) { if(!n) return '0'; return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,','); }

// ==================== PAGINATION ====================
function renderPagination() {
    const c=document.getElementById('pagination'); if(!c) return; c.innerHTML='';
    const dp=filteredData.slice(0,CONFIG.DISPLAY_LIMIT), tp=Math.ceil(dp.length/rowsPerPage);
    const prev=document.createElement('button'); prev.className='page-btn'; prev.innerHTML='<i class="fas fa-chevron-left"></i>'; prev.disabled=currentPage===1; prev.onclick=()=>{currentPage--;popFullTable();}; c.appendChild(prev);
    let sp=Math.max(1,currentPage-2), ep=Math.min(tp,sp+4); sp=Math.max(1,ep-4);
    for(let i=sp;i<=ep;i++){const b=document.createElement('button');b.className=`page-btn ${i===currentPage?'active':''}`;b.textContent=i;b.onclick=()=>{currentPage=i;popFullTable();};c.appendChild(b);}
    const next=document.createElement('button'); next.className='page-btn'; next.innerHTML='<i class="fas fa-chevron-right"></i>'; next.disabled=currentPage===tp||tp===0; next.onclick=()=>{currentPage++;popFullTable();}; c.appendChild(next);
}

// ==================== SORT & FILTER ====================
function sortTable(ci) {
    const keys=['id_evaluacion','nombre','departamento','nivel_educacion','tipo_empleo','sector','ingreso_mensual','motivo_credito','monto_solicitado','plazo_meses','cuota_mensual_estimada','capacidad_pago','endeudamiento_total','prob_incumplimiento','prob_pago','decision','nivel_riesgo'];
    const k=keys[ci];
    if(sortColumn===ci) sortDirection=sortDirection==='asc'?'desc':'asc'; else {sortColumn=ci;sortDirection='asc';}
    showLoading('Ordenando...');
    setTimeout(()=>{
        const getVal=(d,k)=>{
            if(k==='ingreso_mensual'||k==='person_income') return getIngreso(d);
            if(k==='monto_solicitado'||k==='loan_amnt')    return getMonto(d);
            if(k==='cuota_mensual_estimada') return getCuota(d);
            if(k==='capacidad_pago')         return getCapacidad(d);
            return d[k];
        };
        filteredData.sort((a,b)=>{let x=getVal(a,k),y=getVal(b,k);if(typeof x==='string'){x=x.toLowerCase();y=y.toLowerCase();}if(x<y)return sortDirection==='asc'?-1:1;if(x>y)return sortDirection==='asc'?1:-1;return 0;});
        currentPage=1; hideLoading(); popFullTable();
    },100);
}

function popFilters() {
    const secs=[...new Set(evaluationData.slice(0,10000).map(d=>d.sector).filter(Boolean))];
    const deps=[...new Set(evaluationData.slice(0,10000).map(d=>d.departamento).filter(Boolean))];
    const ss=document.getElementById('filterSector'), ds=document.getElementById('filterDept');
    if(ss){ss.innerHTML='<option value="">Todos</option>';secs.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;ss.appendChild(o);});}
    if(ds){ds.innerHTML='<option value="">Todos</option>';deps.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;ds.appendChild(o);});}
}

function filterTable() {
    showLoading('Filtrando...');
    setTimeout(()=>{
        const dec=document.getElementById('filterDecision').value, ris=document.getElementById('filterRisk').value;
        const sec=document.getElementById('filterSector').value, dep=document.getElementById('filterDept').value;
        const srch=document.getElementById('tableSearch').value.toLowerCase();
        filteredData=evaluationData.filter(d=>{
            if(dec && !getDecision(d).includes(dec)) return false;
            if(ris && riskLevel(getRisk(d))!==ris) return false;
            if(sec && d.sector!==sec) return false;
            if(dep && d.departamento!==dep) return false;
            if(srch && !`${d.nombre} ${d.apellido_paterno} ${d.apellido_materno} ${d.departamento} ${d.sector} ${d.motivo_credito}`.toLowerCase().includes(srch)) return false;
            return true;
        });
        currentPage=1; hideLoading(); popFullTable();
    },100);
}

// ==================== NAV ====================
document.querySelectorAll('.nav-item').forEach(i=>i.addEventListener('click',e=>{e.preventDefault();navTo(i.dataset.section);}));
function navTo(sec) {
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    const a=document.querySelector(`.nav-item[data-section="${sec}"]`); if(a) a.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));
    const b=document.getElementById(`section-${sec}`); if(b) b.classList.add('active');
    const nm={dashboard:'Dashboard',evaluaciones:'Evaluaciones',clientes:'Clientes',contactados:'Contactados',analisis:'Análisis de Riesgo',reportes:'Reportes',config:'Configuración'};
    const br=document.getElementById('breadcrumbCurrent'); if(br) br.textContent=nm[sec]||sec;
}
function toggleSidebar() { const s=document.querySelector('.sidebar'); if(s) s.classList.toggle('open'); }

// ==================== CHARTS ====================
function renderDonut() {
    const svg=document.getElementById('donutChart'), lg=document.getElementById('riskLegend'); if(!svg||!lg) return;
    svg.innerHTML=''; lg.innerHTML='';
    const cnt={'BAJO':0,'MEDIO':0,'ALTO':0,'MUY ALTO':0};
    evaluationData.slice(0,10000).forEach(d=>{ const l=riskLevel(getRisk(d)); if(l) cnt[l]++; });
    const cols={'BAJO':'#00c853','MEDIO':'#ffab00','ALTO':'#ff6d00','MUY ALTO':'#ff1744'};
    const totalRiesgo=Object.values(cnt).reduce((a,b)=>a+b,0);
    const t=evaluationData.length, cx=100, cy=100, r=70; let sa=0;
    const dt=document.getElementById('donutTotal'); if(dt) dt.textContent=t.toLocaleString();
    Object.entries(cnt).forEach(([k,v])=>{
        if(v===0) return;
        const an=(v/totalRiesgo)*2*Math.PI, ea=sa+an;
        const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa),x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea);
        const p=document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('d',`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${an>Math.PI?1:0} 1 ${x2} ${y2} Z`);
        p.setAttribute('fill',cols[k]); p.setAttribute('stroke','var(--bg-dark)'); p.setAttribute('stroke-width','2'); p.setAttribute('opacity','0.95');
        p.addEventListener('mouseenter',()=>p.setAttribute('opacity','1')); p.addEventListener('mouseleave',()=>p.setAttribute('opacity','0.95'));
        svg.appendChild(p); sa=ea; // Arco exterior del donut (no relleno, solo trazo grueso)
        const arc = document.createElementNS('http://www.w3.org/2000/svg','path');
        const r2 = 55; // radio interior → grosor = r - r2 = 70 - 55 = 15px
        const x1o=cx+r*Math.cos(sa),  y1o=cy+r*Math.sin(sa);
        const x2o=cx+r*Math.cos(ea),  y2o=cy+r*Math.sin(ea);
        const x1i=cx+r2*Math.cos(ea), y1i=cy+r2*Math.sin(ea);
        const x2i=cx+r2*Math.cos(sa), y2i=cy+r2*Math.sin(sa);
        const lg = an>Math.PI?1:0;
        arc.setAttribute('d', `M ${x1o} ${y1o} A ${r} ${r} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r2} ${r2} 0 ${lg} 0 ${x2i} ${y2i} Z`);
        arc.setAttribute('fill', cols[k]);
        arc.setAttribute('stroke', 'var(--bg-dark)');
        arc.setAttribute('stroke-width', '2');
        arc.setAttribute('opacity', '0.92');
        arc.addEventListener('mouseenter', ()=>arc.setAttribute('opacity','1'));
        arc.addEventListener('mouseleave', ()=>arc.setAttribute('opacity','0.92'));
        svg.appendChild(arc); sa=ea;                 
        
    });
    lg.innerHTML=Object.entries(cnt).map(([k,v])=>`
        <div class="legend-item" style="padding:6px 10px;background:${cols[k]}18;border-radius:6px;margin:3px 0;">
            <span style="background:${cols[k]};width:10px;height:10px;display:inline-block;border-radius:3px;margin-right:6px;vertical-align:middle;"></span>
            <span style="font-weight:600;">${k}</span>
            <span style="color:var(--text-secondary);margin-left:4px;">(${v.toLocaleString()} · ${totalRiesgo>0?((v/totalRiesgo)*100).toFixed(1):0}%)</span>
        </div>`).join('');
}

function renderBar() {
    const c=document.getElementById('barChart'); if(!c) return; c.innerHTML='';
    const app=evaluationData.filter(d=>getDecision(d).includes('APROBADO')).length;
    const rej=evaluationData.filter(d=>getDecision(d).includes('RECHAZADO')).length;
    const mx=Math.max(app,rej);
    [{l:'Aprobados',v:app,c:'#00c853'},{l:'Rechazados',v:rej,c:'#ff1744'}].forEach(it=>{
        const d=document.createElement('div'); d.className='bar-item';
        d.innerHTML=`<span class="bar-value">${it.v.toLocaleString()}</span><div class="bar" style="height:${mx>0?(it.v/mx)*120:0}px;background:${it.c};"></div><span class="bar-label">${it.l}</span>`;
        c.appendChild(d);
    });
}

function renderDept() {
    const c=document.getElementById('deptChart'); if(!c) return; c.innerHTML='';
    const cnt={}; evaluationData.slice(0,10000).forEach(d=>{if(d.departamento) cnt[d.departamento]=(cnt[d.departamento]||0)+1;});
    const srt=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10), mx=srt[0]?srt[0][1]:0;
    const cls=['#2979ff','#00c853','#ffab00','#ff1744','#ab47bc','#00bcd4','#ff6d00','#8bc34a','#e91e63','#607d8b'];
    srt.forEach(([d,n],i)=>{
        const el=document.createElement('div'); el.className='h-bar-item';
        el.innerHTML=`<span class="h-bar-label">${d}</span><div class="h-bar-track"><div class="h-bar-fill" style="width:${mx>0?(n/mx)*100:0}%;background:${cls[i%cls.length]};">${n.toLocaleString()}</div></div>`;
        c.appendChild(el);
    });
}

// ==================== CLIENTS ====================
function renderClients() {
    const g=document.getElementById('clientsGrid'); if(!g) return; g.innerHTML='';
    const cols=['#2979ff','#00c853','#ffab00','#ff1744','#ab47bc','#00bcd4'];
    evaluationData.slice(0,20).forEach((d,i)=>{
        const ini=((d.nombre||'').charAt(0)+(d.apellido_paterno||'').charAt(0)).toUpperCase();
        const card=document.createElement('div'); card.className='client-card'; card.onclick=()=>viewDetail(d.id_evaluacion||0);
        card.innerHTML=`
            <div class="client-card-header">
                <div class="client-avatar" style="background:${cols[i%cols.length]}">${ini||'?'}</div>
                <div class="client-info"><h4>${d.nombre||''} ${d.apellido_paterno||''}</h4><p><i class="fas fa-map-marker-alt"></i> ${d.departamento||'-'} · ${d.sector||'-'}</p></div>
            </div>
            <div class="client-card-body">
                <div class="client-detail"><label>Ingreso</label><span>S/ ${fmtNum(Math.round(getIngreso(d)))}</span></div>
                <div class="client-detail"><label>Monto</label><span>S/ ${fmtNum(Math.round(getMonto(d)))}</span></div>
                <div class="client-detail"><label>Cap. Pago</label><span>S/ ${fmtNum(Math.round(getCapacidad(d)))}</span></div>
                <div class="client-detail"><label>Prob. Pago</label><span>${d.prob_pago||'-'}%</span></div>
            </div>
            <div class="client-card-footer">${getDecision(d).includes('APROBADO')?'<span class="badge badge-approved">✅ APROBADO</span>':'<span class="badge badge-rejected">❌ RECHAZADO</span>'} ${riskBadge(getRisk(d))}</div>`;
        g.appendChild(card);
    });
}

// ==================== MODAL ====================
function viewDetail(id) {
    const d=evaluationData.find(e=>e.id_evaluacion==id); if(!d) return;
    const m=document.getElementById('detailModal'), b=document.getElementById('modalBody'); if(!m||!b) return;
    const rl=riskLevel(getRisk(d));
    const rc=rl==='BAJO'?'#00c853':rl==='MEDIO'?'#ffab00':rl==='ALTO'?'#ff6d00':'#ff1744';
    const rw=rl==='BAJO'?'20%':rl==='MEDIO'?'50%':rl==='ALTO'?'75%':'100%';
    const pInc=parseFloat(d.prob_incumplimiento)||0, pPago=parseFloat(d.prob_pago)||0;
    const gradeColors={'A':'#00c853','B':'#64dd17','C':'#ffab00','D':'#ff6d00','E':'#ff1744','F':'#d500f9'};
    const endeudVal=d.endeudamiento_total?(parseFloat(d.endeudamiento_total)*100).toFixed(1)+'%':(d.loan_percent_income?(parseFloat(d.loan_percent_income)*100).toFixed(1)+'%':'-');
    b.innerHTML=`
        <div class="detail-section"><h4><i class="fas fa-user"></i> Personal</h4><div class="detail-grid">
            <div class="detail-item"><label>Nombre</label><span>${d.nombre||''} ${d.apellido_paterno||''} ${d.apellido_materno||''}</span></div>
            <div class="detail-item"><label>Género / Edad</label><span>${d.genero==='M'?'♂ Masculino':'♀ Femenino'}${d.person_age?' · '+d.person_age+' años':''}</span></div>
            <div class="detail-item"><label>Departamento</label><span>${d.departamento||'-'}</span></div>
            <div class="detail-item"><label>Educación</label><span>${d.nivel_educacion||'-'}</span></div>
            <div class="detail-item"><label>Estado Civil</label><span>${d.estado_civil||'-'}</span></div>
            <div class="detail-item"><label>Hijos</label><span>${d.numero_hijos!==undefined&&d.numero_hijos!==''?d.numero_hijos:'-'}</span></div>
        </div></div>
        <div class="detail-section"><h4><i class="fas fa-briefcase"></i> Laboral</h4><div class="detail-grid">
            <div class="detail-item"><label>Empresa</label><span>${d.nombre_empresa||'-'}</span></div>
            <div class="detail-item"><label>Tipo Empleo</label><span>${d.tipo_empleo||'-'}</span></div>
            <div class="detail-item"><label>Sector</label><span>${d.sector||'-'}</span></div>
            <div class="detail-item"><label>Antigüedad</label><span>${d.person_emp_length!==undefined&&d.person_emp_length!==''?d.person_emp_length+' años':'-'}</span></div>
            <div class="detail-item"><label>Situación</label><span style="color:var(--success)">${d.situacion_laboral||'-'}</span></div>
            <div class="detail-item"><label>Ingreso Mensual</label><span style="color:var(--accent)">S/ ${fmtNum(Math.round(getIngreso(d)))}</span></div>
        </div></div>
        <div class="detail-section"><h4><i class="fas fa-hand-holding-usd"></i> Crédito</h4><div class="detail-grid">
            <div class="detail-item"><label>Motivo</label><span>${d.motivo_credito||d.loan_intent||'-'}</span></div>
            <div class="detail-item"><label>Monto Solicitado</label><span style="color:var(--accent);font-size:18px;font-weight:700;">S/ ${fmtNum(Math.round(getMonto(d)))}</span></div>
            <div class="detail-item"><label>Plazo</label><span>${d.plazo_meses||'-'} meses</span></div>
            <div class="detail-item"><label>Cuota Est.</label><span>S/ ${fmtNum(Math.round(getCuota(d)))}</span></div>
            <div class="detail-item"><label>Cap. de Pago</label><span>S/ ${fmtNum(Math.round(getCapacidad(d)))}</span></div>
            <div class="detail-item"><label>Endeudamiento</label><span>${endeudVal}</span></div>
            ${d.loan_grade?'<div class="detail-item"><label>Loan Grade</label><span style="color:'+(gradeColors[d.loan_grade]||'var(--text-primary)')+';font-weight:800;font-size:18px;">'+d.loan_grade+'</span></div>':''}
            ${d.loan_int_rate?'<div class="detail-item"><label>Tasa Interés</label><span style="color:var(--warning)">'+parseFloat(d.loan_int_rate).toFixed(2)+'%</span></div>':''}
            ${d.cb_person_cred_hist_length?'<div class="detail-item"><label>Historial Crediticio</label><span>'+d.cb_person_cred_hist_length+' años</span></div>':''}
            ${d.person_home_ownership?'<div class="detail-item"><label>Vivienda</label><span>'+d.person_home_ownership+'</span></div>':''}
            <div class="detail-item"><label>Fecha Solicitud</label><span>${d.fecha_solicitud||'-'}</span></div>
        </div></div>
        <div class="detail-section"><h4><i class="fas fa-robot"></i> Predicción del Modelo <span style="font-size:11px;color:var(--text-muted);font-weight:400;">(output ML)</span></h4><div class="detail-grid">
            <div class="detail-item"><label>Prob. Incumplimiento</label><span style="color:${pInc>=75?'var(--danger)':pInc>=50?'#ff6d00':pInc>=20?'var(--warning)':'var(--success)'};font-weight:700;">${d.prob_incumplimiento||'-'}%</span></div>
            <div class="detail-item"><label>Prob. de Pago</label><span style="color:${pPago>85?'var(--success)':pPago>65?'var(--warning)':'var(--danger)'};font-weight:700;">${d.prob_pago||'-'}%</span></div>
        </div>
        <div class="risk-meter"><span class="risk-meter-label" style="color:${rc}">${rl||'-'}</span><div class="risk-meter-bar"><div class="risk-meter-fill" style="width:${rw};background:${rc};"></div></div><span class="risk-meter-value" style="color:${rc}">${d.prob_incumplimiento||'-'}%</span></div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Segmentación: &lt;20% BAJO · 20–50% MEDIO · 50–75% ALTO · ≥75% MUY ALTO</p></div>
        <div class="detail-section"><h4><i class="fas fa-gavel"></i> Decisión del Modelo</h4>
            <div class="detail-item full" style="text-align:center;padding:20px;">
                <label>Resultado</label>
                <span style="font-size:28px;margin-top:8px;display:block;">${getDecision(d).includes('APROBADO')?'✅ APROBADO':'❌ RECHAZADO'}</span>
                <span style="font-size:13px;color:var(--text-muted);margin-top:4px;display:block;">Nivel de Riesgo: <strong style="color:${rc}">${getRisk(d)||'-'}</strong></span>
            </div>
        </div>`;
    m.classList.remove('hidden');
}
function closeModal() { const m=document.getElementById('detailModal'); if(m) m.classList.add('hidden'); }
const dm=document.getElementById('detailModal'); if(dm) dm.addEventListener('click',e=>{if(e.target===dm) closeModal();});

// ==================== ANÁLISIS ====================
function renderAnalysis() {
    if(!evaluationData.length) return;
    const sd=evaluationData.slice(0,5000);
    // Endeudamiento top 50
    const ec=document.getElementById('endeudChart');
    if(ec){ec.innerHTML='';[...sd].sort((a,b)=>((parseFloat(a.endeudamiento_total)||parseFloat(a.loan_percent_income)||0)-(parseFloat(b.endeudamiento_total)||parseFloat(b.loan_percent_income)||0))).slice(0,50).forEach(d=>{const p=(parseFloat(d.endeudamiento_total)||parseFloat(d.loan_percent_income)||0)*100,c=p>60?'var(--danger)':p>40?'var(--warning)':'var(--success)';const e=document.createElement('div');e.className='h-bar-item';e.innerHTML=`<span class="h-bar-label">${(d.nombre||'?').substring(0,10)}...</span><div class="h-bar-track"><div class="h-bar-fill" style="width:${Math.min(p,100)}%;background:${c};">${p.toFixed(1)}%</div></div>`;ec.appendChild(e);});}
    // Capacidad vs Ingreso
    const cc=document.getElementById('capacidadChart');
    if(cc){cc.innerHTML='';sd.slice(0,50).forEach(d=>{const ing=getIngreso(d),cap=getCapacidad(d),r=ing>0?(cap/ing)*100:0,c=r>40?'var(--success)':r>25?'var(--warning)':'var(--danger)';const e=document.createElement('div');e.className='h-bar-item';e.innerHTML=`<span class="h-bar-label">${(d.nombre||'?').substring(0,10)}...</span><div class="h-bar-track"><div class="h-bar-fill" style="width:${Math.min(r,100)}%;background:${c};">${r.toFixed(1)}%</div></div>`;cc.appendChild(e);});}
    // Plazos
    const pc=document.getElementById('plazoChart');
    if(pc){pc.innerHTML='';const pg={};sd.forEach(d=>{const p=d.plazo_meses||0;const r=p<=24?'1-24m':p<=36?'25-36m':p<=48?'37-48m':'49-60m';pg[r]=(pg[r]||0)+1;});const mx=Math.max(...Object.values(pg));const cl=['#2979ff','#00c853','#ffab00','#ff1744'];Object.entries(pg).forEach(([r,n],i)=>{const e=document.createElement('div');e.className='h-bar-item';e.innerHTML=`<span class="h-bar-label">${r}</span><div class="h-bar-track"><div class="h-bar-fill" style="width:${mx>0?(n/mx)*100:0}%;background:${cl[i]};">${n.toLocaleString()}</div></div>`;pc.appendChild(e);});}
    // Tipo empleo
    const jc=document.getElementById('empleoChart');
    if(jc){jc.innerHTML='';const pg={};sd.forEach(d=>{if(d.tipo_empleo) pg[d.tipo_empleo]=(pg[d.tipo_empleo]||0)+1;});Object.entries(pg).forEach(([t,n])=>{const p=sd.length>0?(n/sd.length)*100:0;const e=document.createElement('div');e.className='h-bar-item';e.innerHTML=`<span class="h-bar-label">${t}</span><div class="h-bar-track"><div class="h-bar-fill" style="width:${p}%;background:var(--info);">${n.toLocaleString()} (${p.toFixed(0)}%)</div></div>`;jc.appendChild(e);});}
}

// ==================== REPORTES ====================
function renderReports() {
    if(!evaluationData.length) return;
    const sd=evaluationData.slice(0,10000), t=sd.length;
    // Resumen financiero
    const fc=document.getElementById('financialSummary');
    if(fc){
        const app=sd.filter(d=>getDecision(d).includes('APROBADO'));
        const rej=sd.filter(d=>getDecision(d).includes('RECHAZADO'));
        const avgInc=sd.reduce((s,d)=>s+(parseFloat(d.prob_incumplimiento)||0),0)/t;
        const avgPago=sd.reduce((s,d)=>s+(parseFloat(d.prob_pago)||0),0)/t;
        const avgMonto=sd.reduce((s,d)=>s+getMonto(d),0)/t;
        fc.innerHTML=`
            <div class="report-item"><span class="label"><i class="fas fa-check-circle" style="color:var(--success)"></i> Aprobados</span><span class="value">${app.length.toLocaleString()} (${((app.length/t)*100).toFixed(1)}%)</span></div>
            <div class="report-item"><span class="label"><i class="fas fa-times-circle" style="color:var(--danger)"></i> Rechazados</span><span class="value">${rej.length.toLocaleString()} (${((rej.length/t)*100).toFixed(1)}%)</span></div>
            <div class="report-item"><span class="label"><i class="fas fa-chart-line"></i> Prob. Incumpl. Prom.</span><span class="value">${avgInc.toFixed(2)}%</span></div>
            <div class="report-item"><span class="label"><i class="fas fa-hand-holding-usd"></i> Prob. Pago Prom.</span><span class="value">${avgPago.toFixed(2)}%</span></div>
            <div class="report-item"><span class="label"><i class="fas fa-coins"></i> Monto Solicitado Prom.</span><span class="value">S/ ${fmtNum(Math.round(avgMonto))}</span></div>`;
    }
    // Educación
    const ec=document.getElementById('educationSummary');
    if(ec){const pg={};sd.forEach(d=>{if(d.nivel_educacion) pg[d.nivel_educacion]=(pg[d.nivel_educacion]||0)+1;});ec.innerHTML='';Object.entries(pg).forEach(([e,n])=>{const p=((n/t)*100).toFixed(1);ec.innerHTML+=`<div class="report-item"><span class="label">${e}</span><span class="value">${n.toLocaleString()} (${p}%)</span></div>`;});}
    // Género
    const gc=document.getElementById('genderSummary');
    if(gc){const m=sd.filter(d=>d.genero==='M').length,f=sd.filter(d=>d.genero==='F').length;gc.innerHTML=`<div class="report-item"><span class="label">♂ Masculino</span><span class="value">${m.toLocaleString()} (${((m/t)*100).toFixed(1)}%)</span></div><div class="report-item"><span class="label">♀ Femenino</span><span class="value">${f.toLocaleString()} (${((f/t)*100).toFixed(1)}%)</span></div>`;}
    // Loan grade / Motivo
    const mc=document.getElementById('motivoSummary');
    if(mc){
        const gradeColors={'A':'#00c853','B':'#64dd17','C':'#ffab00','D':'#ff6d00','E':'#ff1744','F':'#d500f9'};
        const pg={}, useLoanGrade=sd[0]&&sd[0].loan_grade;
        sd.forEach(d=>{const g=useLoanGrade?d.loan_grade:d.motivo_credito;if(g) pg[g]=(pg[g]||0)+1;});
        mc.innerHTML='';
        Object.entries(pg).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>{
            const c=gradeColors[k]||'var(--info)';
            mc.innerHTML+=`<div class="report-item"><span class="label" style="color:${c}"><i class="fas fa-tag"></i> ${k}</span><span class="value">${n.toLocaleString()} (${((n/t)*100).toFixed(1)}%)</span></div>`;
        });
    }
}

// ==================== CONFIG ====================
function updateConfig() {
    const la=document.getElementById('lastAccess'); if(la) la.value=localStorage.getItem('lastLogin')?new Date(localStorage.getItem('lastLogin')).toLocaleString('es-PE'):'Primera vez';
    const cr=document.getElementById('configRecords'); if(cr) cr.textContent=evaluationData.length.toLocaleString();
}
function updateBadge() { const b=document.getElementById('totalBadge'); if(b) b.textContent=evaluationData.length>999?'999+':evaluationData.length; }

// ==================== GLOBAL SEARCH ====================
const gs=document.getElementById('globalSearch');
if(gs) gs.addEventListener('input', function(){
    const q=this.value.toLowerCase();
    if(q.length>0){showLoading('Buscando...');setTimeout(()=>{filteredData=evaluationData.filter(d=>`${d.nombre} ${d.apellido_paterno} ${d.apellido_materno} ${d.departamento} ${d.sector} ${d.motivo_credito} ${d.id_evaluacion}`.toLowerCase().includes(q));currentPage=1;hideLoading();popFullTable();navTo('evaluaciones');},100);}
    else {filteredData=[...evaluationData];currentPage=1;popFullTable();}
});

document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });


// ==================== LOGIN AUTOMÁTICO ====================
window.addEventListener('load', () => {
    document.getElementById('username').value = 'alumno1';
    document.getElementById('password').value = '12345678';
});
