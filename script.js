// ==================== CONFIGURAÇÃO FIREBASE ====================
const firebaseConfig = { 
  apiKey: "AIzaSyC_z3mtM3e5stpmRU_XLT2JfBw9jjF9rXY", 
  databaseURL: "https://atbuilt-7dd80-default-rtdb.firebaseio.com" 
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ==================== VARIÁVEIS GLOBAIS ====================
let todosOsPostes = [], listaFiltrada = [], listaVisivel = [], paginaAtual = 1, itensPorPagina = 100;
let map = null, markersData = [], mapaInicializado = false, mostrandoSomentePodas = false, infoWindow = null;
let filtroProjetosModal = "", projetoSelecionado = null, valoresObra = {};
let projetosListaCompleta = [], projetosPaginaAtual = 1, projetosItensPorPagina = 100;
let projetosPaginaAtualLista = [];

// ==================== FUNÇÕES AUXILIARES ====================
function normalizarTexto(txt) { 
  return (txt || "").toString().trim().toLowerCase(); 
}

function escapeHtml(text) { 
  if (!text) return ""; 
  const div = document.createElement("div"); 
  div.textContent = text; 
  return div.innerHTML; 
}

function formatarMoeda(valor) { 
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); 
}

function calcularTempoDecorrido(dataLancStr) {
  if (!dataLancStr) return null;
  const partes = dataLancStr.split(/[\s/:]+/).map(Number);
  if (partes.length < 5) return null;
  const dataLanc = new Date(partes[2], partes[1] - 1, partes[0], partes[3], partes[4], partes[5] || 0);
  const diffMs = new Date() - dataLanc;
  if (diffMs < 0) return null;
  return { dias: Math.floor(diffMs / (1000*60*60*24)), horas: Math.floor((diffMs % (1000*60*60*24)) / (1000*60*60)) };
}

function somarValor(labelField, statusField, lista) {
  let total = 0;
  lista.forEach(p => {
    const texto = (p[labelField] || "").toLowerCase();
    const stat = normalizarTexto(p[statusField]);
    if (!texto || texto === "não recebido" || texto === "selecione os serviços" || stat === "concluído") return;
    const matches = texto.match(/r\$ ?[\d.,]+/gi);
    if (matches) matches.forEach(val => { total += parseFloat(val.replace(/[^\d,]/g, "").replace(",", ".")) || 0; });
  });
  return total;
}

// ==================== FUNÇÕES DE FOTOS ====================
function abrirTodasFotos(foto1, foto2, foto3) {
  const fotos = [foto1, foto2, foto3].filter(f => f && f.trim() !== "");
  if (!fotos.length) {
    alert("Nenhuma foto disponível para este poste.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fotos do Poste</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px; min-height: 100vh; }
        h2 { color: white; text-align: center; margin-bottom: 30px; font-weight: 600; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; max-width: 1400px; margin: 0 auto; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.3s, box-shadow 0.3s; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.4); }
        .card img { width: 100%; height: 300px; object-fit: cover; transition: transform 0.3s; }
        .card:hover img { transform: scale(1.05); }
        .card-footer { padding: 15px; display: flex; justify-content: space-between; align-items: center; background: white; }
        .card-footer span { font-weight: 600; color: #333; }
        .abrir { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: transform 0.2s; }
        .abrir:hover { transform: scale(1.05); }
        .close-btn { position: fixed; top: 20px; right: 20px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer; z-index: 1000; font-weight: 500; transition: all 0.3s; }
        .close-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); }
        .contador { text-align: center; color: rgba(255,255,255,0.7); margin-top: 20px; font-size: 14px; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } .card img { height: 250px; } .close-btn { top: 10px; right: 10px; padding: 8px 16px; font-size: 12px; } }
      </style>
    </head>
    <body>
      <button class="close-btn" onclick="window.close()">✕ Fechar</button>
      <h2>📸 Galeria de Fotos do Poste</h2>
      <div class="grid">
        ${fotos.map((f, i) => `
          <div class="card" onclick="window.open('${f}','_blank')">
            <img src="${f}" loading="lazy" alt="Foto ${i+1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">
            <div class="card-footer">
              <span>📷 Foto ${i+1}</span>
              <button class="abrir" onclick="event.stopPropagation();window.open('${f}','_blank')">🔍 Abrir</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="contador">Total de ${fotos.length} fotos | Clique na imagem para ampliar</div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert("Por favor, permita pop-ups para ver as fotos.");
  }
}

function abrirFotoNovaAba(fotoUrl) {
  if (fotoUrl && fotoUrl.trim() !== "") {
    window.open(fotoUrl, '_blank');
  }
}

// ==================== INFOWINDOW COMPLETA ====================
function criarInfoWindow(poste) {
  const status = (poste.status || "em andamento").toLowerCase();
  const isConcluido = status === "concluído";
  const tempo = poste.tempoDecorrido ? `${poste.tempoDecorrido.dias}d ${poste.tempoDecorrido.horas}h` : "-";
  
  const fotos = [poste.foto1, poste.foto2, poste.foto3].filter(f => f && f.trim() !== "");
  const hasFotos = fotos.length > 0;
  
  let miniaturas = '';
  if (hasFotos) {
    miniaturas = `
      <div style="margin-top: 16px;">
        <div style="font-size: 12px; font-weight: 600; color: #4361ee; margin-bottom: 10px;">
          <i class="fas fa-camera"></i> Fotos do Poste (${fotos.length})
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          ${fotos.slice(0, 3).map(foto => `
            <div style="flex: 1; min-width: 80px; cursor: pointer; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s;" 
                 onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                 onclick="event.stopPropagation(); window.open('${foto}', '_blank')">
              <img src="${foto}" style="width: 100%; height: 70px; object-fit: cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">
            </div>
          `).join('')}
        </div>
        <div style="text-align: center;">
          <button onclick="event.stopPropagation(); abrirTodasFotos('${poste.foto1 || ''}', '${poste.foto2 || ''}', '${poste.foto3 || ''}')" 
                  style="background: linear-gradient(135deg, #4361ee, #7209b7); color: white; border: none; padding: 8px 20px; border-radius: 25px; cursor: pointer; font-size: 12px; font-weight: 500; width: 100%;">
            <i class="fas fa-images"></i> 📸 VER TODAS AS ${fotos.length} FOTOS
          </button>
        </div>
      </div>
    `;
  } else {
    miniaturas = '<div style="margin-top: 16px; padding: 20px; background: #f8f9fa; border-radius: 12px; text-align: center; color: #adb5bd;"><i class="fas fa-camera-slash"></i> Nenhuma foto disponível</div>';
  }

  const lat = parseFloat(poste.latitude);
  const lng = parseFloat(poste.longitude);
  const streetViewUrl = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}`;

  return `
    <div style="font-family: 'Inter', sans-serif; width: 380px; max-width: 100%; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
      <div style="background: linear-gradient(135deg, #4361ee, #7209b7); padding: 16px 20px; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-folder"></i> ${escapeHtml(poste.idProjeto || "Sem Projeto")}
          </div>
          <span style="background: ${isConcluido ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;">
            ${poste.status || "Em andamento"}
          </span>
        </div>
        <div style="font-size: 13px; opacity: 0.9; display: flex; gap: 12px; flex-wrap: wrap;">
          <span><i class="fas fa-hashtag"></i> ${escapeHtml(poste.codigoPoste || "Sem código")}</span>
          <span><i class="fas fa-calendar-alt"></i> ${poste.dataLancamento ? poste.dataLancamento.split(' ')[0] : "-"}</span>
          <span><i class="fas fa-clock"></i> ${tempo}</span>
        </div>
      </div>
      
      <div style="padding: 16px 20px;">
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; font-size: 13px; color: #4361ee; margin-bottom: 8px;">
            <i class="fas fa-tower-cell"></i> POSTE PRIMÁRIO
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div><strong>Poste:</strong> ${escapeHtml(poste.postePrimario || "Selecione")}</div>
            <div><strong>Estrutura:</strong> ${escapeHtml(poste.estruturaPrimaria || "Selecione")}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; font-size: 13px; color: #4361ee; margin-bottom: 8px;">
            <i class="fas fa-tower-broadcast"></i> POSTE SECUNDÁRIO
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div><strong>Poste:</strong> ${escapeHtml(poste.posteSecundario || "Selecione")}</div>
            <div><strong>Estrutura:</strong> ${escapeHtml(poste.estruturaSecundaria || "Selecione")}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; font-size: 13px; color: #4361ee; margin-bottom: 8px;">
            <i class="fas fa-bolt"></i> SERVIÇOS
          </div>
          <div style="font-size: 12px; margin-bottom: 6px;">
            <strong>Linha Viva:</strong> ${escapeHtml(poste.linhaViva || "Selecione os serviços")}
          </div>
          <div style="font-size: 12px;">
            <strong>Serviços de Podas:</strong> ${escapeHtml(poste.servicosPodas || "-")}
          </div>
        </div>
        
        ${poste.observacoes ? `
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; font-size: 13px; color: #4361ee; margin-bottom: 8px;">
              <i class="fas fa-pen"></i> OBSERVAÇÕES
            </div>
            <div style="font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 10px; line-height: 1.4;">
              ${escapeHtml(poste.observacoes)}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; font-size: 13px; color: #4361ee; margin-bottom: 8px;">
            <i class="fas fa-map-marker-alt"></i> LOCALIZAÇÃO
          </div>
          <div style="font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 10px;">
            <div><strong>Latitude:</strong> ${poste.latitude || "-"}</div>
            <div><strong>Longitude:</strong> ${poste.longitude || "-"}</div>
            ${!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 ? `
              <div style="margin-top: 8px;">
                <a href="${streetViewUrl}" target="_blank" style="color: #4361ee; text-decoration: none; font-size: 12px;">
                  <i class="fas fa-street-view"></i> Ver no Street View
                </a>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; color: #6c757d; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-user-circle"></i> ${escapeHtml(poste.usuario || "Usuário não informado")}
          </div>
        </div>
        
        ${miniaturas}
      </div>
    </div>
  `;
}

// ==================== FUNÇÕES DO MAPA ====================
function inicializarMapa() {
  if (mapaInicializado) return;
  const mapElement = document.getElementById("map");
  if (!mapElement) return;
  try {
    map = new google.maps.Map(mapElement, { 
      center: { lat: -8.0, lng: -35.0 }, 
      zoom: 6,
      zoomControl: true,
      gestureHandling: "greedy",
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      scrollwheel: true
    });
    mapaInicializado = true;
    infoWindow = new google.maps.InfoWindow({ maxWidth: 420 });
    setTimeout(() => { if (map && todosOsPostes.length > 0) { criarTodosMarcadores(); filtrarPostes(); } }, 100);
  } catch (error) { console.error("Erro mapa:", error); }
}

function criarMarker(poste) {
  const lat = parseFloat(poste.latitude), lng = parseFloat(poste.longitude);
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
  
  const markerIcon = {
    url: "poste.png",
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 40),
    origin: new google.maps.Point(0, 0)
  };
  
  const marker = new google.maps.Marker({ 
    position: { lat, lng }, 
    map: map, 
    title: poste.codigoPoste || "Poste",
    icon: markerIcon,
    animation: google.maps.Animation.DROP
  });
  
  marker.addListener("click", () => { 
    infoWindow.setContent(criarInfoWindow(poste)); 
    infoWindow.open(map, marker); 
  });
  return marker;
}

function criarTodosMarcadores() {
  if (!mapaInicializado) return;
  markersData.forEach(m => m.marker.setMap(null));
  markersData = [];
  todosOsPostes.forEach(poste => { const marker = criarMarker(poste); if (marker) markersData.push({ marker, id: poste.id }); });
}

function atualizarVisibilidadeMarcadores(idsVisiveis) {
  const idsSet = new Set(idsVisiveis);
  markersData.forEach(item => item.marker.setVisible(idsSet.has(item.id)));
}

function recentrarMapa() {
  if (!map || listaVisivel.length === 0) return;
  const bounds = new google.maps.LatLngBounds();
  listaVisivel.forEach(p => { const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude); if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) bounds.extend({ lat, lng }); });
  map.fitBounds(bounds);
}

function alternarVisualizacaoMapa(botao) {
  if (!map) return;
  const newType = map.getMapTypeId() === google.maps.MapTypeId.ROADMAP ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP;
  map.setMapTypeId(newType);
  botao.innerHTML = newType === google.maps.MapTypeId.SATELLITE ? '<i class="fas fa-map"></i> Mapa' : '<i class="fas fa-satellite"></i> Satélite';
}

function mostrarMapaOtimizado(lista) {
  if (!mapaInicializado) { setTimeout(() => mostrarMapaOtimizado(lista), 100); return; }
  const idsVisiveis = lista.map(p => p.id);
  atualizarVisibilidadeMarcadores(idsVisiveis);
  if (lista.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    lista.forEach(p => { const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude); if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) bounds.extend({ lat, lng }); });
    map.fitBounds(bounds);
  }
}

// ==================== AUTENTICAÇÃO ====================
function fazerLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();
  if (!email || !senha) { document.getElementById("loginErro").innerText = "Preencha e-mail e senha."; return; }
  auth.signInWithEmailAndPassword(email, senha).then(() => {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("sistemaContainer").style.display = "block";
    document.getElementById("userEmail").innerText = email;
    carregarPostes();
    carregarValoresObra();
  }).catch(err => { document.getElementById("loginErro").innerText = `Erro: ${err.message}`; });
}

function fazerLogout() { auth.signOut().then(() => { location.reload(); }); }

function carregarValoresObra() {
  db.ref("valoresObra").on("value", snapshot => { valoresObra = snapshot.val() || {}; if (document.getElementById("modalProjetos").style.display === "flex") atualizarListaProjetos(); });
}

function carregarPostes() {
  db.ref("postes").on("value", snapshot => {
    const obj = snapshot.val() || {};
    const lista = Object.entries(obj).map(([id, data]) => ({ id, ...data }));
    lista.sort((a, b) => {
      const dataA = a.dataLancamento ? new Date(a.dataLancamento.split(' ')[0].split('/').reverse().join('-')) : 0;
      const dataB = b.dataLancamento ? new Date(b.dataLancamento.split(' ')[0].split('/').reverse().join('-')) : 0;
      return dataB - dataA;
    });
    todosOsPostes = lista;
    paginaAtual = 1;
    if (mapaInicializado) criarTodosMarcadores();
    atualizarContadorStatus();
    filtrarPostes();
  });
}

function atualizarContadorStatus() {
  const totalProj = new Set(todosOsPostes.map(p => p.idProjeto).filter(Boolean)).size;
  const totalPodas = somarValor("servicosPodas", "status", todosOsPostes);
  const totalLV = somarValor("linhaViva", "status", todosOsPostes);
  document.getElementById("contadorStatus").innerHTML = `<i class="fas fa-chart-line"></i> 📚 ${totalProj} projetos | 🔢 ${todosOsPostes.length} postes | 💰 Podas: ${formatarMoeda(totalPodas)} | 💰 LV: ${formatarMoeda(totalLV)} | 🕒 Atualizado: ${new Date().toLocaleString("pt-BR")}`;
}

// ==================== FILTRAGEM ====================
function filtrarPostes() {
  const filtroProjeto = normalizarTexto(document.getElementById("filtroProjeto")?.value);
  const filtroPoste = normalizarTexto(document.getElementById("filtroPoste")?.value);
  const filtroUsuario = normalizarTexto(document.getElementById("usuario")?.value);
  const filtroStatus = normalizarTexto(document.getElementById("filtroStatus")?.value);
  const dataInicial = document.getElementById("dataInicial").value;
  const dataFinal = document.getElementById("dataFinal").value;

  listaFiltrada = todosOsPostes.filter(p => {
    const okProjeto = !filtroProjeto || normalizarTexto(p.idProjeto).includes(filtroProjeto);
    const okPoste = !filtroPoste || normalizarTexto(p.codigoPoste).includes(filtroPoste);
    const okUsuario = !filtroUsuario || normalizarTexto(p.usuario).includes(filtroUsuario);
    const statusNorm = normalizarTexto(p.status);
    const okStatus = !filtroStatus || (filtroStatus === "em andamento" ? (statusNorm === "" || statusNorm === "em andamento") : statusNorm === filtroStatus);
    let okData = true;
    if (dataInicial && p.dataLancamento) { 
      const partes = p.dataLancamento.split(' ')[0].split('/');
      const dataPoste = new Date(partes[2], partes[1]-1, partes[0]);
      okData = dataPoste >= new Date(dataInicial);
    }
    if (okData && dataFinal && p.dataLancamento) { 
      const partes = p.dataLancamento.split(' ')[0].split('/');
      const dataPoste = new Date(partes[2], partes[1]-1, partes[0]);
      okData = dataPoste <= new Date(dataFinal);
    }
    return okProjeto && okPoste && okUsuario && okStatus && okData;
  });

  if (mostrandoSomentePodas) {
    listaFiltrada = listaFiltrada.filter(p => /r\$ ?[\d.,]+/i.test((p.servicosPodas || "")) && normalizarTexto(p.status) !== "concluído");
  }

  listaFiltrada.forEach(p => { p.tempoDecorrido = calcularTempoDecorrido(p.dataLancamento); });
  listaFiltrada.sort((a, b) => {
    const dataA = a.dataLancamento ? new Date(a.dataLancamento.split(' ')[0].split('/').reverse().join('-')) : 0;
    const dataB = b.dataLancamento ? new Date(b.dataLancamento.split(' ')[0].split('/').reverse().join('-')) : 0;
    return dataB - dataA;
  });
  
  const totalPaginas = Math.ceil(listaFiltrada.length / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  listaVisivel = listaFiltrada.slice(inicio, inicio + itensPorPagina);
  exibirPostes(listaVisivel);
  mostrarMapaOtimizado(listaVisivel);
  atualizarPaginacao(totalPaginas);
  document.getElementById("contadorMapa").innerHTML = `<i class="fas fa-map-marker-alt"></i> ${listaVisivel.length} postes`;
}

function limparFiltros() {
  document.getElementById("filtroProjeto").value = "";
  document.getElementById("filtroPoste").value = "";
  document.getElementById("usuario").value = "";
  document.getElementById("filtroStatus").value = "";
  document.getElementById("dataInicial").value = "";
  document.getElementById("dataFinal").value = "";
  filtrarPostes();
}

function exibirPostes(lista) {
  const tbody = document.querySelector("#tabelaPostes tbody");
  const fragment = document.createDocumentFragment();
  lista.forEach(p => {
    const status = normalizarTexto(p.status || "em andamento");
    const tempo = p.tempoDecorrido ? `${p.tempoDecorrido.dias}d ${p.tempoDecorrido.horas}h` : "-";
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;
    tr.innerHTML = `
      <td>${p.dataLancamento || ""}</td>
      <td><input type="text" value="${escapeHtml(p.idProjeto || "")}" disabled></td>
      <td><input type="text" value="${escapeHtml(p.codigoPoste || "")}" disabled></td>
      <td><input type="text" value="${escapeHtml(p.postePrimario || "")}" disabled></td>
      <td><input type="text" value="${escapeHtml(p.estruturaPrimaria || "")}" disabled></td>
      <td><input type="text" value="${escapeHtml(p.posteSecundario || "")}" disabled></td>
      <td><input type="text" value="${escapeHtml(p.estruturaSecundaria || "")}" disabled></td>
      <td><textarea disabled>${escapeHtml(p.linhaViva || "")}</textarea></td>
      <td><textarea disabled>${escapeHtml(p.servicosPodas || "")}</textarea></td>
      <td><textarea disabled>${escapeHtml(p.observacoes || "")}</textarea></td>
      <td><input type="text" value="${p.latitude || ""}" readonly></td>
      <td><input type="text" value="${p.longitude || ""}" readonly></td>
      <td><input type="text" value="${escapeHtml(p.usuario || "")}" readonly></td>
      <td><span class="status-badge ${status === "concluído" ? "status-concluido" : "status-andamento"}">${p.status || "Em andamento"}</span></td>
      <td>${tempo}</td>
      <td><button class="btn-edit" onclick="editar(this)"><i class="fas fa-edit"></i> Editar</button></td>
      <td><button class="delete-btn" onclick="excluir(this)"><i class="fas fa-trash-alt"></i></button></td>
    `;
    fragment.appendChild(tr);
  });
  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

function atualizarPaginacao(totalPaginas) {
  const pagDiv = document.getElementById("paginacao");
  pagDiv.innerHTML = "";
  if (totalPaginas <= 1) return;
  const btnAnt = document.createElement("button");
  btnAnt.innerHTML = '<i class="fas fa-chevron-left"></i> Anterior';
  btnAnt.disabled = paginaAtual === 1;
  btnAnt.onclick = () => { paginaAtual--; filtrarPostes(); };
  pagDiv.appendChild(btnAnt);
  const span = document.createElement("span");
  span.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  pagDiv.appendChild(span);
  const btnProx = document.createElement("button");
  btnProx.innerHTML = 'Próxima <i class="fas fa-chevron-right"></i>';
  btnProx.disabled = paginaAtual === totalPaginas;
  btnProx.onclick = () => { paginaAtual++; filtrarPostes(); };
  pagDiv.appendChild(btnProx);
}

// ==================== EDIÇÃO E EXCLUSÃO ====================
function editar(botao) {
  const tr = botao.closest("tr");
  const estaEditando = botao.textContent.includes("Salvar");
  if (estaEditando) {
    salvar(tr);
    botao.innerHTML = '<i class="fas fa-edit"></i> Editar';
    botao.className = "btn-edit";
    tr.querySelectorAll("input, textarea").forEach(el => el.disabled = true);
  } else {
    botao.innerHTML = '<i class="fas fa-save"></i> Salvar';
    botao.style.background = "#3b82f6";
    tr.querySelectorAll("input, textarea").forEach((el, idx) => { 
      const td = el.closest("td"); 
      const colIndex = Array.from(tr.children).indexOf(td); 
      if (![0, 10, 11, 12].includes(colIndex)) el.disabled = false; 
    });
  }
}

async function salvar(tr) {
  const btn = tr.querySelector("button");
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span> Salvando...';
  const id = tr.dataset.id;
  const dados = {
    idProjeto: tr.children[1].querySelector("input").value.trim(),
    codigoPoste: tr.children[2].querySelector("input").value.trim(),
    postePrimario: tr.children[3].querySelector("input").value.trim(),
    estruturaPrimaria: tr.children[4].querySelector("input").value.trim(),
    posteSecundario: tr.children[5].querySelector("input").value.trim(),
    estruturaSecundaria: tr.children[6].querySelector("input").value.trim(),
    linhaViva: tr.children[7].querySelector("textarea").value.trim(),
    servicosPodas: tr.children[8].querySelector("textarea").value.trim(),
    observacoes: tr.children[9].querySelector("textarea").value.trim(),
    latitude: tr.children[10].querySelector("input").value.trim(),
    longitude: tr.children[11].querySelector("input").value.trim(),
    usuario: tr.children[12].querySelector("input").value.trim(),
    status: tr.children[13].querySelector(".status-badge").textContent.trim(),
  };
  try {
    await db.ref(`postes/${id}`).update(dados);
    btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-edit"></i> Editar';
      btn.style.background = "#10b981";
      btn.disabled = false;
      filtrarPostes();
    }, 1000);
  } catch (err) { 
    alert(`Erro: ${err.message}`); 
    btn.innerHTML = '<i class="fas fa-edit"></i> Editar'; 
    btn.disabled = false; 
  }
}

async function excluir(botao) {
  const tr = botao.closest("tr");
  const id = tr.dataset.id;
  if (!confirm("Excluir este poste permanentemente?")) return;
  botao.disabled = true;
  botao.innerHTML = '<span class="loading"></span>';
  try {
    await db.ref(`postes/${id}`).remove();
    tr.style.opacity = "0.5";
    setTimeout(() => filtrarPostes(), 300);
  } catch (err) { 
    alert(`Erro: ${err.message}`); 
    botao.disabled = false; 
    botao.innerHTML = '<i class="fas fa-trash-alt"></i>'; 
  }
}

// ==================== LISTA DE PROJETOS COM PAGINAÇÃO ====================
function abrirModalProjetos() {
  document.getElementById("modalProjetos").style.display = "flex";
  document.body.style.overflow = "hidden";
  projetosPaginaAtual = 1;
  atualizarListaProjetos();
}

function fecharModalProjetos() {
  document.getElementById("modalProjetos").style.display = "none";
  document.body.style.overflow = "auto";
}

function abrirModalEditarValor(projetoId) {
  projetoSelecionado = projetoId;
  const valorAtual = valoresObra[projetoId] || 0;
  document.getElementById("valorObraInput").value = formatarMoeda(valorAtual).replace("R$", "").trim();
  document.getElementById("modalEditarValor").style.display = "flex";
}

function fecharModalEditarValor() {
  document.getElementById("modalEditarValor").style.display = "none";
  projetoSelecionado = null;
}

function salvarValorObra() {
  let valor = document.getElementById("valorObraInput").value.replace(/[^\d,]/g, "").replace(",", ".");
  valor = parseFloat(valor) || 0;
  if (projetoSelecionado) {
    db.ref(`valoresObra/${projetoSelecionado}`).set(valor).then(() => {
      fecharModalEditarValor();
      atualizarListaProjetos();
    });
  }
}

function filtrarProjetoNoMapa(projetoId) {
  fecharModalProjetos();
  document.getElementById("filtroProjeto").value = projetoId;
  filtrarPostes();
  setTimeout(() => {
    if (listaVisivel.length > 0 && map) {
      const bounds = new google.maps.LatLngBounds();
      listaVisivel.forEach(p => {
        const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) bounds.extend({ lat, lng });
      });
      map.fitBounds(bounds);
    }
  }, 500);
}

function atualizarListaProjetos() {
  const listaParaResumo = listaFiltrada.length > 0 ? listaFiltrada : todosOsPostes;
  const projetosMap = new Map();

  listaParaResumo.forEach(poste => {
    const projetoId = (poste.idProjeto || "Sem Projeto").trim();
    if (!projetosMap.has(projetoId)) {
      projetosMap.set(projetoId, { id: projetoId, postes: [], totalPodas: 0, totalLinhaViva: 0, valorObra: valoresObra[projetoId] || 0 });
    }
    const projeto = projetosMap.get(projetoId);
    projeto.postes.push(poste);
    const podasMatch = (poste.servicosPodas || "").toLowerCase().match(/r\$ ?[\d.,]+/i);
    if (podasMatch && normalizarTexto(poste.status) !== "concluído") projeto.totalPodas += parseFloat(podasMatch[0].replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    const lvMatch = (poste.linhaViva || "").toLowerCase().match(/r\$ ?[\d.,]+/i);
    if (lvMatch && normalizarTexto(poste.status) !== "concluído") projeto.totalLinhaViva += parseFloat(lvMatch[0].replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  });

  let projetos = Array.from(projetosMap.values());
  if (filtroProjetosModal) {
    const filtroLower = filtroProjetosModal.toLowerCase();
    projetos = projetos.filter(p => p.id.toLowerCase().includes(filtroLower));
  }
  projetos.sort((a, b) => a.id.localeCompare(b.id));
  
  projetosListaCompleta = projetos;
  
  const totalProjetos = projetosListaCompleta.length;
  const totalPostesGeral = projetosListaCompleta.reduce((s,p) => s + p.postes.length, 0);
  const totalConcluidosGeral = projetosListaCompleta.reduce((s,p) => s + p.postes.filter(poste => normalizarTexto(poste.status) === "concluído").length, 0);
  const totalPodasGeral = projetosListaCompleta.reduce((s,p) => s + p.totalPodas, 0);
  const totalLVGeral = projetosListaCompleta.reduce((s,p) => s + p.totalLinhaViva, 0);
  const totalValorObra = projetosListaCompleta.reduce((s,p) => s + (p.valorObra || 0), 0);

  document.getElementById("statsContainer").innerHTML = `
    <div class="stat-card"><i class="fas fa-folder"></i><div class="stat-card-value">${totalProjetos}</div><div class="stat-card-label">Projetos</div></div>
    <div class="stat-card"><i class="fas fa-map-pin"></i><div class="stat-card-value">${totalPostesGeral}</div><div class="stat-card-label">Postes</div></div>
    <div class="stat-card"><i class="fas fa-check-circle"></i><div class="stat-card-value" style="color:#10b981;">${totalConcluidosGeral}</div><div class="stat-card-label">Concluídos</div></div>
    <div class="stat-card"><i class="fas fa-chart-line"></i><div class="stat-card-value" style="color:#f59e0b;">${totalPostesGeral - totalConcluidosGeral}</div><div class="stat-card-label">Andamento</div></div>
    <div class="stat-card"><i class="fas fa-tree"></i><div class="stat-card-value">${formatarMoeda(totalPodasGeral)}</div><div class="stat-card-label">Total Podas</div></div>
    <div class="stat-card"><i class="fas fa-bolt"></i><div class="stat-card-value">${formatarMoeda(totalLVGeral)}</div><div class="stat-card-label">Total LV</div></div>
    <div class="stat-card"><i class="fas fa-dollar-sign"></i><div class="stat-card-value" style="color:#4361ee;">${formatarMoeda(totalValorObra)}</div><div class="stat-card-label">Valor Total</div></div>
  `;

  const totalPaginas = Math.ceil(projetosListaCompleta.length / projetosItensPorPagina);
  const inicio = (projetosPaginaAtual - 1) * projetosItensPorPagina;
  const projetosPagina = projetosListaCompleta.slice(inicio, inicio + projetosItensPorPagina);
  projetosPaginaAtualLista = projetosPagina;

  const container = document.getElementById("projetosGrid");
  if (projetosPagina.length === 0) { 
    container.innerHTML = '<div style="text-align:center;padding:60px;">Nenhum projeto encontrado</div>'; 
    document.getElementById("modalPaginacao").innerHTML = "";
    return; 
  }

  let html = "";
  projetosPagina.forEach(projeto => {
    const totalPostes = projeto.postes.length;
    const concluidos = projeto.postes.filter(p => normalizarTexto(p.status) === "concluído").length;
    const percentualConcluido = totalPostes > 0 ? (concluidos / totalPostes * 100).toFixed(1) : 0;
    const podasPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.servicosPodas || "")) && normalizarTexto(p.status) !== "concluído").length;
    const lvPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.linhaViva || "")) && normalizarTexto(p.status) !== "concluído").length;
    const totalGasto = projeto.totalPodas + projeto.totalLinhaViva;
    const percentualGasto = projeto.valorObra > 0 ? (totalGasto / projeto.valorObra * 100).toFixed(1) : 0;

    html += `
      <div class="projeto-card" onclick="filtrarProjetoNoMapa('${escapeHtml(projeto.id)}')">
        <div class="projeto-card-header">
          <div class="projeto-id"><i class="fas fa-folder"></i> ${escapeHtml(projeto.id)}</div>
          <div class="projeto-valor-editar"><button class="edit-valor-btn" onclick="event.stopPropagation(); abrirModalEditarValor('${escapeHtml(projeto.id)}')"><i class="fas fa-edit"></i> Editar Valor</button></div>
          <div class="projeto-valor-exibido"><small>💰 VALOR DA OBRA</small><br>${formatarMoeda(projeto.valorObra)}</div>
        </div>
        <div class="projeto-stats">
          <div class="projeto-stat"><span class="projeto-stat-value">${totalPostes}</span><span class="projeto-stat-label">POSTES</span></div>
          <div class="projeto-stat"><span class="projeto-stat-value" style="color:#10b981;">${concluidos}</span><span class="projeto-stat-label">CONCLUÍDOS</span></div>
          <div class="projeto-stat"><span class="projeto-stat-value" style="color:#f59e0b;">${totalPostes - concluidos}</span><span class="projeto-stat-label">ANDAMENTO</span></div>
        </div>
        <div class="projeto-progresso">
          <div class="progresso-bar"><div class="progresso-fill" style="width: ${percentualConcluido}%"></div></div>
          <div class="progresso-texto">${percentualConcluido}% dos postes concluídos</div>
        </div>
        ${projeto.valorObra > 0 ? `
        <div class="projeto-progresso">
          <div class="progresso-bar"><div class="progresso-fill" style="width: ${percentualGasto}%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"></div></div>
          <div class="progresso-texto">💰 ${percentualGasto}% do orçamento gasto (${formatarMoeda(totalGasto)} de ${formatarMoeda(projeto.valorObra)})</div>
        </div>
        ` : ''}
        <div class="projeto-detalhes">
          <div class="projeto-detalhe"><div class="projeto-detalhe-label"><i class="fas fa-tree"></i> Podas Pend.</div><div class="projeto-detalhe-valor" style="color:${podasPendentes > 0 ? '#f59e0b' : '#10b981'}">${podasPendentes}</div></div>
          <div class="projeto-detalhe"><div class="projeto-detalhe-label"><i class="fas fa-bolt"></i> LV Pend.</div><div class="projeto-detalhe-valor" style="color:${lvPendentes > 0 ? '#f59e0b' : '#10b981'}">${lvPendentes}</div></div>
          <div class="projeto-detalhe"><div class="projeto-detalhe-label"><i class="fas fa-chart-line"></i> Gasto Total</div><div class="projeto-detalhe-valor valor-destaque">${formatarMoeda(totalGasto)}</div></div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;

  const pagDiv = document.getElementById("modalPaginacao");
  if (totalPaginas <= 1) {
    pagDiv.innerHTML = "";
    return;
  }
  pagDiv.innerHTML = `
    <button onclick="projetosPaginaAtual--; atualizarListaProjetos();" ${projetosPaginaAtual === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i> Anterior
    </button>
    <span>Página ${projetosPaginaAtual} de ${totalPaginas} (${projetosListaCompleta.length} projetos)</span>
    <button onclick="projetosPaginaAtual++; atualizarListaProjetos();" ${projetosPaginaAtual === totalPaginas ? 'disabled' : ''}>
      Próxima <i class="fas fa-chevron-right"></i>
    </button>
  `;
}

function filtrarListaProjetos() {
  filtroProjetosModal = document.getElementById("modalFiltroProjetos").value;
  projetosPaginaAtual = 1;
  atualizarListaProjetos();
}

function limparFiltroProjetos() {
  document.getElementById("modalFiltroProjetos").value = "";
  filtroProjetosModal = "";
  projetosPaginaAtual = 1;
  atualizarListaProjetos();
}

function exportarProjetosExcel() {
  const projetos = projetosListaCompleta;
  const excelData = [["Projeto", "Total Postes", "Concluídos", "Em Andamento", "% Concluído", "Podas Pendentes", "LV Pendentes", "Total Podas (R$)", "Total LV (R$)", "Valor Obra (R$)", "% Gasto"]];
  
  projetos.forEach(projeto => {
    const totalPostes = projeto.postes.length;
    const concluidos = projeto.postes.filter(p => normalizarTexto(p.status) === "concluído").length;
    const percentual = totalPostes > 0 ? (concluidos / totalPostes * 100).toFixed(1) : 0;
    const podasPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.servicosPodas || "")) && normalizarTexto(p.status) !== "concluído").length;
    const lvPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.linhaViva || "")) && normalizarTexto(p.status) !== "concluído").length;
    const totalGasto = projeto.totalPodas + projeto.totalLinhaViva;
    const percentualGasto = projeto.valorObra > 0 ? (totalGasto / projeto.valorObra * 100).toFixed(1) : 0;
    excelData.push([projeto.id, totalPostes, concluidos, totalPostes - concluidos, `${percentual}%`, podasPendentes, lvPendentes, projeto.totalPodas.toFixed(2), projeto.totalLinhaViva.toFixed(2), projeto.valorObra.toFixed(2), `${percentualGasto}%`]);
  });

  const csvContent = excelData.map(row => row.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `projetos_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportarProjetosPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  doc.setFillColor(67, 97, 238);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Lista de Projetos - Atbuilt", pageWidth / 2, 13, { align: "center" });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  y = 30;
  doc.text(`Total de Projetos nesta página: ${projetosPaginaAtualLista.length}`, 15, y);
  y += 7;
  doc.text(`Página ${projetosPaginaAtual} | Total geral: ${projetosListaCompleta.length} projetos`, 15, y);
  y += 7;
  doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 15, y);
  y += 12;
  
  const colunas = ["Projeto", "Postes", "Conc.", "Andam.", "%", "Podas Pend.", "LV Pend.", "Total Podas", "Total LV", "Valor Obra"];
  const colWidths = [40, 12, 12, 12, 10, 18, 18, 25, 25, 30];
  
  doc.setFillColor(67, 97, 238);
  doc.rect(15, y - 5, pageWidth - 30, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  let x = 15;
  colunas.forEach((col, idx) => {
    doc.text(col, x + 1, y);
    x += colWidths[idx];
  });
  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6);
  
  projetosPaginaAtualLista.forEach((projeto, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      doc.setFillColor(67, 97, 238);
      doc.rect(15, y - 5, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      x = 15;
      colunas.forEach((col, colIdx) => {
        doc.text(col, x + 1, y);
        x += colWidths[colIdx];
      });
      y += 8;
      doc.setTextColor(0, 0, 0);
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, y - 3, pageWidth - 30, 5, "F");
    }
    const totalPostes = projeto.postes.length;
    const concluidos = projeto.postes.filter(p => normalizarTexto(p.status) === "concluído").length;
    const percentual = totalPostes > 0 ? (concluidos / totalPostes * 100).toFixed(1) : 0;
    const podasPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.servicosPodas || "")) && normalizarTexto(p.status) !== "concluído").length;
    const lvPendentes = projeto.postes.filter(p => /r\$ ?[\d.,]+/i.test((p.linhaViva || "")) && normalizarTexto(p.status) !== "concluído").length;
    x = 15;
    doc.text(projeto.id.substring(0, 25), x + 1, y); x += colWidths[0];
    doc.text(totalPostes.toString(), x + 1, y); x += colWidths[1];
    doc.text(concluidos.toString(), x + 1, y); x += colWidths[2];
    doc.text((totalPostes - concluidos).toString(), x + 1, y); x += colWidths[3];
    doc.text(percentual + "%", x + 1, y); x += colWidths[4];
    doc.text(podasPendentes.toString(), x + 1, y); x += colWidths[5];
    doc.text(lvPendentes.toString(), x + 1, y); x += colWidths[6];
    doc.text(formatarMoeda(projeto.totalPodas), x + 1, y); x += colWidths[7];
    doc.text(formatarMoeda(projeto.totalLinhaViva), x + 1, y); x += colWidths[8];
    doc.text(formatarMoeda(projeto.valorObra), x + 1, y);
    y += 5;
  });
  
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth / 2, 285, { align: "center" });
  }
  
  doc.save(`lista_projetos_pagina_${projetosPaginaAtual}_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
}

function baixarPDFModelo() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.text("Relatório de Postes - Atbuilt", 20, 20);
  doc.save(`relatorio_postes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function togglePodas() {
  mostrandoSomentePodas = !mostrandoSomentePodas;
  const btn = document.getElementById("btnMostrarPodas");
  btn.innerHTML = mostrandoSomentePodas ? '<i class="fas fa-eye"></i> Mostrar Todos' : '<i class="fas fa-tree"></i> Mostrar Podas';
  btn.classList.toggle("ativo");
  paginaAtual = 1;
  filtrarPostes();
}

// ==================== EVENTOS E INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", () => inicializarMapa());
document.addEventListener("click", (e) => { if (e.target === document.getElementById("modalProjetos")) fecharModalProjetos(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { fecharModalProjetos(); fecharModalEditarValor(); } });

// Registrar funções globais
window.abrirTodasFotos = abrirTodasFotos;
window.abrirFotoNovaAba = abrirFotoNovaAba;
window.filtrarProjetoNoMapa = filtrarProjetoNoMapa;
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
window.limparFiltros = limparFiltros;
window.filtrarPostes = filtrarPostes;
window.editar = editar;
window.excluir = excluir;
window.togglePodas = togglePodas;
window.baixarPDFModelo = baixarPDFModelo;
window.abrirModalProjetos = abrirModalProjetos;
window.fecharModalProjetos = fecharModalProjetos;
window.filtrarListaProjetos = filtrarListaProjetos;
window.limparFiltroProjetos = limparFiltroProjetos;
window.exportarProjetosExcel = exportarProjetosExcel;
window.exportarProjetosPDF = exportarProjetosPDF;
window.abrirModalEditarValor = abrirModalEditarValor;
window.fecharModalEditarValor = fecharModalEditarValor;
window.salvarValorObra = salvarValorObra;
window.recentrarMapa = recentrarMapa;
window.alternarVisualizacaoMapa = alternarVisualizacaoMapa;
