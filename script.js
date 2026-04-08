// ========== CONFIGURAÇÃO FIREBASE ==========
const firebaseConfig = {
  apiKey: "AIzaSyC_z3mtM3e5stpmRU_XLT2JfBw9jjF9rXY",
  databaseURL: "https://atbuilt-7dd80-default-rtdb.firebaseio.com",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ========== VARIÁVEIS GLOBAIS ==========
let todosOsPostes = [];
let listaFiltrada = [];
let listaVisivel = [];
let paginaAtual = 1;
const itensPorPagina = 100;
let map = null;
let markersData = [];
let mapaInicializado = false;
let mostrandoSomentePodas = false;
let filtroLista = "";
let infoWindow = null;

// ========== REMOVER DUPLICADOS ==========
function removerPostesDuplicados(listaDePostes) {
  const registrosUnicos = new Map();
  listaDePostes.forEach(poste => {
    const chaveUnica = `${poste.dataLancamento}_${poste.lat}_${poste.lng}`;
    registrosUnicos.set(chaveUnica, poste);
  });
  return Array.from(registrosUnicos.values());
}

// ========== CRIAR INFOWINDOW ==========
function criarInfoWindow(poste) {
  const status = (poste.status || "em andamento").toLowerCase();
  const isConcluido = status === "concluído";
  const tempo = poste.tempoDecorrido ? `${poste.tempoDecorrido.dias}d ${poste.tempoDecorrido.horas}h` : "-";
  
  const fotos = [poste.foto1, poste.foto2, poste.foto3].filter(f => f);
  
  const fotosHTML = fotos.length > 0 ? `
    <div style="margin-top: 16px;">
      <div style="font-weight: 600; margin-bottom: 12px; color: #667eea;">📸 Fotos do Poste (${fotos.length})</div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        ${fotos.slice(0, 3).map(foto => `
          <div style="flex: 1; min-width: 80px; cursor: pointer; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onclick="window.open('${foto}','_blank')">
            <img src="${foto}" style="width: 100%; height: 100px; object-fit: cover;">
          </div>
        `).join('')}
      </div>
      ${fotos.length > 0 ? `
        <button onclick="window.abrirTodasFotos('${poste.foto1 || ''}', '${poste.foto2 || ''}', '${poste.foto3 || ''}')" style="width: 100%; margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: transform 0.2s;">
          🔍 Ver todas as fotos
        </button>
      ` : ''}
    </div>
  ` : '<div style="margin-top: 16px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #999;">📷 Nenhuma foto disponível</div>';
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; width: 380px; max-width: 100%; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.15);">
      
      <!-- Cabeçalho -->
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px;">
        <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">📁 ${poste.idProjeto || "B-1094801"}</div>
        <div style="font-size: 12px; opacity: 0.9;">🔖 ${poste.codigoPoste || "existentes"} | 📅 ${poste.dataLancamento ? poste.dataLancamento.split(' ')[0] : "06/03/2026"}</div>
      </div>
      
      <!-- Status e Tempo -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0;">
        <span style="padding: 4px 12px; border-radius: 20px; background: ${isConcluido ? '#4caf5020' : '#ff980020'}; color: ${isConcluido ? '#4caf50' : '#ff9800'}; font-size: 12px; font-weight: 600;">${poste.status || "Em andamento"}</span>
        <span style="font-size: 12px; color: #666;">⏱️ Tempo: ${tempo}</span>
      </div>
      
      <!-- POSTE PRIMÁRIO -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-weight: 600; margin-bottom: 10px; color: #667eea; font-size: 13px;">🏗️ POSTE PRIMÁRIO</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          <div><strong>Poste:</strong> ${poste.postePrimario || "Selecione"}</div>
          <div><strong>Estrutura:</strong> ${poste.estruturaPrimaria || "Selecione"}</div>
        </div>
      </div>
      
      <!-- POSTE SECUNDÁRIO -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-weight: 600; margin-bottom: 10px; color: #667eea; font-size: 13px;">🏗️ POSTE SECUNDÁRIO</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          <div><strong>Poste:</strong> ${poste.posteSecundario || "Selecione"}</div>
          <div><strong>Estrutura:</strong> ${poste.estruturaSecundaria || "-"}</div>
        </div>
      </div>
      
      <!-- SERVIÇOS -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-weight: 600; margin-bottom: 10px; color: #667eea; font-size: 13px;">⚡ SERVIÇOS</div>
        <div style="margin-bottom: 8px; font-size: 13px;"><strong>Linha Viva:</strong> ${poste.linhaViva || "Selecione os serviços"}</div>
        <div style="font-size: 13px;"><strong>Serviços de Podas:</strong> ${poste.servicosPodas || "Selecionar serviços de podas"}</div>
      </div>
      
      <!-- OBSERVAÇÕES -->
      ${poste.observacoes ? `
        <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
          <div style="font-weight: 600; margin-bottom: 10px; color: #667eea; font-size: 13px;">📝 OBSERVAÇÕES</div>
          <div style="font-size: 12px; color: #555; line-height: 1.5; background: #f8f9fa; padding: 10px; border-radius: 8px;">${poste.observacoes}</div>
        </div>
      ` : ''}
      
      <!-- LOCALIZAÇÃO -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-weight: 600; margin-bottom: 10px; color: #667eea; font-size: 13px;">📍 LOCALIZAÇÃO</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; font-size: 13px;">
          <div><strong>Latitude:</strong> ${poste.latitude || "-"}</div>
          <div><strong>Longitude:</strong> ${poste.longitude || "-"}</div>
        </div>
        <button onclick="window.ativarStreetView(${poste.latitude || 0}, ${poste.longitude || 0})" style="width: 100%; padding: 8px; background: #4285f4; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; transition: background 0.2s;">
          👁️ Ver no Street View
        </button>
      </div>
      
      <!-- USUÁRIO -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="font-size: 13px;"><strong>👤 Usuário responsável:</strong> ${poste.usuario || "visitante@visitante.com"}</div>
      </div>
      
      <!-- FOTOS -->
      ${fotosHTML}
      
    </div>
  `;
}

// ========== INICIALIZAR MAPA ==========
function inicializarMapa() {
  if (mapaInicializado) return;
  
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("Elemento do mapa não encontrado");
    return;
  }

  if (mapElement.clientHeight === 0) {
    mapElement.style.minHeight = "400px";
    mapElement.style.height = "400px";
  }

  try {
    map = new google.maps.Map(mapElement, {
      center: { lat: -8.0, lng: -35.0 },
      zoom: 6,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER
      },
      gestureHandling: "greedy",
      mapTypeControl: false,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      scrollwheel: true,
      disableDoubleClickZoom: false,
      touchGesture: "cooperative",
      draggable: true
    });
    
    mapaInicializado = true;
    console.log("Mapa inicializado com sucesso");
    
    infoWindow = new google.maps.InfoWindow({
      maxWidth: 420,
      pixelOffset: new google.maps.Size(0, -10)
    });
    
    setTimeout(() => {
      if (map) {
        google.maps.event.trigger(map, 'resize');
        if (todosOsPostes.length > 0) {
          criarTodosMarcadores();
          filtrarPostes();
        }
      }
    }, 100);
    
    if (todosOsPostes.length > 0) {
      criarTodosMarcadores();
      filtrarPostes();
    }
  } catch (error) {
    console.error("Erro ao inicializar mapa:", error);
  }
}

function forcarRedimensionamentoMapa() {
  if (map && mapaInicializado) {
    setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
      if (listaVisivel.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        let count = 0;
        listaVisivel.forEach(p => {
          const lat = parseFloat(p.latitude);
          const lng = parseFloat(p.longitude);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            bounds.extend({ lat, lng });
            count++;
          }
        });
        if (count > 0) map.fitBounds(bounds);
        else map.setZoom(6);
      }
    }, 200);
  }
}

window.addEventListener('resize', () => forcarRedimensionamentoMapa());
window.addEventListener('orientationchange', () => setTimeout(forcarRedimensionamentoMapa, 100));

// ========== CRIAR MARCADORES ==========
function criarMarker(poste) {
  const lat = parseFloat(poste.latitude);
  const lng = parseFloat(poste.longitude);
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

  if (normalizarTexto(poste.status) === "em andamento") {
    poste.tempoDecorrido = calcularTempoDecorrido(poste.dataLancamento || "");
  }

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: map,
    title: `${poste.codigoPoste || "Poste"} - ${poste.idProjeto || "Projeto"}`,
    icon: {
      url: "poste.png",
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 40),
    },
    animation: google.maps.Animation.DROP
  });

  marker.addListener("click", () => {
    const contentString = criarInfoWindow(poste);
    infoWindow.setContent(contentString);
    infoWindow.open(map, marker);
  });

  marker.addListener("dblclick", () => {
    infoWindow.close();
    ativarStreetView(lat, lng);
  });

  return marker;
}

function criarTodosMarcadores() {
  if (!mapaInicializado) return;
  markersData.forEach(m => m.marker.setMap(null));
  markersData = [];
  
  todosOsPostes.forEach(poste => {
    const marker = criarMarker(poste);
    if (marker) {
      markersData.push({ marker, id: poste.id, data: poste });
    }
  });
}

function atualizarVisibilidadeMarcadores(idsVisiveis) {
  const idsSet = new Set(idsVisiveis);
  markersData.forEach(item => {
    item.marker.setVisible(idsSet.has(item.id));
  });
}

// ========== STREET VIEW ==========
function ativarStreetView(lat, lng) {
  if (!map) return;
  if (infoWindow) infoWindow.close();
  const panorama = map.getStreetView();
  panorama.setPosition({ lat, lng });
  panorama.setPov({ heading: 0, pitch: 0, zoom: 1 });
  panorama.setVisible(true);
}

// ========== FUNÇÃO PARA ABRIR TODAS FOTOS ==========
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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1a1a2e;
          padding: 20px;
          min-height: 100vh;
        }
        h2 {
          color: white;
          text-align: center;
          margin-bottom: 30px;
          font-weight: 600;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 25px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.4);
        }
        .card img {
          width: 100%;
          height: 300px;
          object-fit: cover;
        }
        .card-footer {
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
        }
        .card-footer span {
          font-weight: 600;
          color: #333;
        }
        .abrir {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .abrir:hover {
          opacity: 0.9;
        }
        .close-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 30px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
          transition: background 0.2s;
        }
        .close-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .card img {
            height: 250px;
          }
        }
      </style>
    </head>
    <body>
      <button class="close-btn" onclick="window.close()">✕ Fechar</button>
      <h2>📸 Galeria de Fotos do Poste</h2>
      <div class="grid">
        ${fotos.map((f, i) => `
          <div class="card" onclick="window.open('${f}','_blank')">
            <img src="${f}" loading="lazy" alt="Foto ${i+1}">
            <div class="card-footer">
              <span>📷 Foto ${i+1}</span>
              <button class="abrir" onclick="event.stopPropagation();window.open('${f}','_blank')">Abrir em tela cheia</button>
            </div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
  
  const win = window.open('', '_blank');
  if (win) { 
    win.document.write(html); 
    win.document.close(); 
  } else { 
    alert('Por favor, permita pop-ups para ver as fotos.');
  }
}

// ========== FUNÇÕES DO MAPA ==========
function recentrarMapa() {
  if (!map || listaVisivel.length === 0) return;
  if (infoWindow) infoWindow.close();
  const bounds = new google.maps.LatLngBounds();
  let count = 0;
  listaVisivel.forEach(p => {
    const lat = parseFloat(p.latitude);
    const lng = parseFloat(p.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      bounds.extend({ lat, lng });
      count++;
    }
  });
  if (count) map.fitBounds(bounds);
}

function alternarVisualizacaoMapa(botao) {
  if (!map) return;
  if (infoWindow) infoWindow.close();
  const currentType = map.getMapTypeId();
  const newType = currentType === google.maps.MapTypeId.ROADMAP ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP;
  map.setMapTypeId(newType);
  
  if (newType === google.maps.MapTypeId.SATELLITE) {
    botao.innerHTML = '<span>🗺️</span> Mapa';
  } else {
    botao.innerHTML = '<span>🛰️</span> Satélite';
  }
}

// ========== AUTENTICAÇÃO ==========
function fazerLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();
  if (!email || !senha) {
    document.getElementById("loginErro").innerText = "Preencha e-mail e senha.";
    return;
  }
  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById("loginContainer").style.display = "none";
      document.getElementById("sistemaContainer").style.display = "block";
      carregarPostes();
    })
    .catch(err => {
      document.getElementById("loginErro").innerText = `Erro: ${err.message}`;
    });
}

function fazerLogout() {
  if (confirm("Tem certeza que deseja sair?")) {
    auth.signOut().then(() => {
      document.getElementById("sistemaContainer").style.display = "none";
      document.getElementById("loginContainer").style.display = "flex";
      limparDados();
    }).catch(err => alert(`Falha ao sair: ${err.message}`));
  }
}

function limparDados() {
  todosOsPostes = [];
  listaFiltrada = [];
  listaVisivel = [];
  markersData.forEach(item => item.marker.setMap(null));
  markersData = [];
}

auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("sistemaContainer").style.display = "block";
    carregarPostes();
  }
});

// ========== CÁLCULOS ==========
function calcularTempoDecorrido(dataLancStr) {
  if (!dataLancStr) return null;
  const partes = dataLancStr.split(/[\s/:]+/).map(Number);
  const dataLanc = new Date(partes[2], partes[1]-1, partes[0], partes[3], partes[4], partes[5]||0);
  const agora = new Date();
  const diffMs = agora - dataLanc;
  if (isNaN(diffMs) || diffMs < 0) return null;
  return {
    dias: Math.floor(diffMs / (1000*60*60*24)),
    horas: Math.floor((diffMs % (1000*60*60*24)) / (1000*60*60))
  };
}

function normalizarTexto(txt) {
  return (txt || "").toString().trim().toLowerCase();
}

function somarValor(labelField, statusField, lista) {
  let total = 0;
  lista.forEach(p => {
    const texto = (p[labelField] || "").toLowerCase();
    const stat = normalizarTexto(p[statusField]);
    if (!texto || texto === "não recebido" || texto === "selecione os serviços" || stat === "concluído") return;
    const matches = texto.match(/r\$ ?[\d.,]+/gi);
    if (matches) {
      matches.forEach(val => {
        total += parseFloat(val.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
      });
    }
  });
  return total;
}

function atualizarContadorStatus() {
  const lista = todosOsPostes;
  const totalProj = new Set(lista.map(p => (p.idProjeto || "").trim()).filter(Boolean)).size;
  const totalPostes = lista.length;
  const concluidos = lista.filter(p => normalizarTexto(p.status) === "concluído").length;
  const andamento = lista.filter(p => { const s = normalizarTexto(p.status); return s === "" || s === "em andamento"; }).length;
  const regexValor = /r\$ ?[\d.,]+/i;
  const comPodas = lista.filter(p => regexValor.test((p.servicosPodas || "").toLowerCase())).length;
  const podasPend = lista.filter(p => regexValor.test((p.servicosPodas || "").toLowerCase()) && normalizarTexto(p.status) !== "concluído").length;
  const comLV = lista.filter(p => regexValor.test((p.linhaViva || "").toLowerCase())).length;
  const lvPend = lista.filter(p => regexValor.test((p.linhaViva || "").toLowerCase()) && normalizarTexto(p.status) !== "concluído").length;
  const totalPodas = somarValor("servicosPodas", "status", lista);
  const totalLV = somarValor("linhaViva", "status", lista);
  const totalPodasf = totalPodas > 0 ? totalPodas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
  const totalLVf = totalLV > 0 ? totalLV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
  const agora = new Date();
  const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dataAtual = agora.toLocaleDateString("pt-BR");
  let msg = `📚 ${totalProj} projetos | 🔢 ${totalPostes} postes | ✅ ${concluidos} concluídos | 🛠 ${andamento} em andamento | 🌿 ${comPodas} com poda | 🕳️ ${podasPend} podas pendentes | ⚡ ${comLV} com linha viva | ⏳ ${lvPend} linha viva pendente`;
  if (totalPodasf) msg += ` | 💰 Total Podas: ${totalPodasf}`;
  if (totalLVf) msg += ` | 💰 Total LV: ${totalLVf}`;
  msg += ` | 🕒 Atualizado em: ${dataAtual} às ${horaAtual}`;
  document.getElementById("contadorStatus").innerText = msg;
}

// ========== CARREGAR POSTES ==========
function carregarPostes() {
  db.ref("postes").on("value", snapshot => {
    const obj = snapshot.val() || {};
    const lista = Object.entries(obj).filter(([,v]) => v !== null).map(([id, data]) => {
      if (data.dataLancamento && typeof data.dataLancamento === "string") {
        const partes = data.dataLancamento.split(/[\s/:]+/).map(Number);
        if (partes.length >= 5) {
          data._dataConvertida = new Date(partes[2], partes[1]-1, partes[0], partes[3], partes[4], partes[5]||0);
        } else data._dataConvertida = null;
      }
      return { id, ...data };
    });
    
    lista.sort((a,b) => (b._dataConvertida||0) - (a._dataConvertida||0));
    todosOsPostes = removerPostesDuplicados(lista);
    paginaAtual = 1;
    
    if (mapaInicializado) {
      criarTodosMarcadores();
    }
    atualizarContadorStatus();
    filtrarPostes();
  });
}

// ========== FILTRAGEM ==========
function filtrarPostes() {
  const filtroProjeto = normalizarTexto(document.getElementById("filtroProjeto")?.value);
  const filtroPoste = normalizarTexto(document.getElementById("filtroPoste")?.value);
  const filtroUsuario = normalizarTexto(document.getElementById("usuario")?.value);
  const filtroStatus = normalizarTexto(document.getElementById("filtroStatus")?.value);
  const dataInicial = document.getElementById("dataInicial").value;
  const dataFinal = document.getElementById("dataFinal").value;

  listaFiltrada = todosOsPostes.filter(p => {
    const data = p._dataConvertida;
    const okProjeto = !filtroProjeto || normalizarTexto(p.idProjeto).includes(filtroProjeto);
    const okPoste = !filtroPoste || normalizarTexto(p.codigoPoste).includes(filtroPoste);
    const okUsuario = !filtroUsuario || normalizarTexto(p.usuario).includes(filtroUsuario);
    const statusNorm = normalizarTexto(p.status);
    const okStatus = !filtroStatus || (filtroStatus === "em andamento" ? (statusNorm === "" || statusNorm === "em andamento") : statusNorm === filtroStatus);
    let okData = true;
    if (dataInicial && data) {
      const dtIni = new Date(`${dataInicial}T00:00:00`);
      okData = data >= dtIni;
    }
    if (okData && dataFinal && data) {
      const dtFim = new Date(`${dataFinal}T23:59:59`);
      okData = data <= dtFim;
    }
    return okProjeto && okPoste && okUsuario && okStatus && okData;
  });

  if (mostrandoSomentePodas) {
    listaFiltrada = listaFiltrada.filter(p => {
      const podas = (p.servicosPodas || "").toLowerCase();
      const status = normalizarTexto(p.status);
      return podas && podas !== "não recebido" && status !== "concluído";
    });
  }

  listaFiltrada.forEach(p => {
    if (normalizarTexto(p.status) === "em andamento") {
      p.tempoDecorrido = calcularTempoDecorrido(p.dataLancamento || "");
    } else p.tempoDecorrido = null;
  });

  listaFiltrada.sort((a,b) => (b._dataConvertida||0) - (a._dataConvertida||0));

  const totalPaginas = Math.ceil(listaFiltrada.length / itensPorPagina);
  const inicio = (paginaAtual-1) * itensPorPagina;
  listaVisivel = listaFiltrada.slice(inicio, inicio + itensPorPagina);

  exibirPostes(listaVisivel);
  mostrarMapaOtimizado(listaVisivel);
  atualizarPaginacao(totalPaginas);
  document.getElementById("contadorMapa").innerText = `${listaVisivel.length} postes`;
}

function mostrarMapaOtimizado(lista) {
  if (!mapaInicializado) {
    setTimeout(() => mostrarMapaOtimizado(lista), 100);
    return;
  }
  const idsVisiveis = lista.map(p => p.id);
  atualizarVisibilidadeMarcadores(idsVisiveis);
  
  if (lista.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    lista.forEach(p => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        bounds.extend({ lat, lng });
        count++;
      }
    });
    if (count > 0) map.fitBounds(bounds);
  }
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
      <td><input type="text" value="${p.idProjeto||""}" disabled></td>
      <td><input type="text" value="${p.codigoPoste||""}" disabled></td>
      <td><input type="text" value="${p.postePrimario||""}" disabled></td>
      <td><input type="text" value="${p.estruturaPrimaria||""}" disabled></td>
      <td><input type="text" value="${p.posteSecundario||""}" disabled></td>
      <td><input type="text" value="${p.estruturaSecundaria||""}" disabled></td>
      <td><textarea disabled>${p.linhaViva||""}</textarea></td>
      <td><textarea disabled>${p.servicosPodas||""}</textarea></td>
      <td><textarea disabled>${p.observacoes||""}</textarea></td>
      <td><input type="text" value="${p.latitude||""}" readonly></td>
      <td><input type="text" value="${p.longitude||""}" readonly></td>
      <td><input type="text" value="${p.usuario||""}" readonly></td>
      <td><span class="status-badge ${status === "concluído" ? "status-concluido" : "status-andamento"}">${p.status || "Em andamento"}</span></td>
      <td>${tempo}</td>
      <td><button class="btn-edit" onclick="editar(this)">✏️ Editar</button></td>
      <td><button class="delete-btn" onclick="excluir(this)">🗑️</button></td>
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
  const span = document.createElement("span");
  span.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  span.style.margin = "0 10px";
  pagDiv.appendChild(span);
  const btnAnt = document.createElement("button");
  btnAnt.textContent = "« Anterior";
  btnAnt.disabled = paginaAtual === 1;
  btnAnt.onclick = () => { paginaAtual--; filtrarPostes(); };
  pagDiv.appendChild(btnAnt);
  const btnProx = document.createElement("button");
  btnProx.textContent = "Próxima »";
  btnProx.disabled = paginaAtual === totalPaginas;
  btnProx.onclick = () => { paginaAtual++; filtrarPostes(); };
  pagDiv.appendChild(btnProx);
}

// ========== EDIÇÃO E EXCLUSÃO ==========
function editar(botao) {
  const tr = botao.closest("tr");
  const estaEditando = botao.textContent === "Salvar";
  if (estaEditando) {
    salvar(tr);
    botao.textContent = "✏️ Editar";
    botao.className = "btn-edit";
    tr.querySelectorAll("input, textarea").forEach(el => el.disabled = true);
  } else {
    botao.textContent = "Salvar";
    botao.className = "btn-success";
    tr.querySelectorAll("input, textarea").forEach((el, idx) => {
      const td = el.closest("td");
      const colIndex = Array.from(tr.children).indexOf(td);
      if (![0,10,11,12].includes(colIndex)) el.disabled = false;
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
    btn.textContent = "✓ Salvo!";
    setTimeout(() => {
      btn.textContent = "✏️ Editar";
      btn.className = "btn-edit";
      btn.disabled = false;
      filtrarPostes();
    }, 1000);
  } catch (err) {
    alert(`Erro: ${err.message}`);
    btn.textContent = "✏️ Editar";
    btn.disabled = false;
  }
}

async function excluir(botao) {
  const tr = botao.closest("tr");
  const id = tr.dataset.id;
  if (!confirm("Excluir este poste?")) return;
  botao.disabled = true;
  botao.innerHTML = '<span class="loading"></span>';
  try {
    await db.ref(`postes/${id}`).remove();
    tr.style.opacity = "0.5";
    setTimeout(() => filtrarPostes(), 300);
  } catch (err) {
    alert(`Erro: ${err.message}`);
    botao.disabled = false;
    botao.textContent = "🗑️";
  }
}

// ========== FUNÇÕES ESPECIAIS ==========
function togglePodas() {
  mostrandoSomentePodas = !mostrandoSomentePodas;
  const btn = document.getElementById("btnMostrarPodas");
  btn.textContent = mostrandoSomentePodas ? "🌿 Mostrar Todos" : "🌿 Mostrar Podas";
  if (mostrandoSomentePodas) btn.classList.add("success");
  else btn.classList.remove("success");
  filtrarPostes();
}

function togglePowerBI() {
  const main = document.querySelector(".sistema-container > :not(#powerbiContainer)");
  const power = document.getElementById("powerbiContainer");
  if (power.style.display === "none" || power.style.display === "") {
    main.style.display = "none";
    power.style.display = "block";
  } else {
    power.style.display = "none";
    main.style.display = "block";
  }
}

// ========== PDF ==========
function configurarAtalhoPDF() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      gerarPDFPersonalizado();
    }
  });
}

function baixarPDFModelo() { gerarPDFPersonalizado(); }

async function gerarPDFPersonalizado() {
  const loading = mostrarLoadingPDF();
  const dados = prepararDadosParaPDF();
  await gerarPDFComIcones(dados);
  removerLoadingPDF(loading);
}

function mostrarLoadingPDF() {
  const div = document.createElement('div');
  div.id = 'pdf-loading';
  div.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999;';
  div.innerHTML = '<div style="background:white; padding:30px; border-radius:16px; text-align:center;"><div style="width:60px; height:60px; border:4px solid #f3f3f3; border-top:4px solid #667eea; border-radius:50%; margin:0 auto 20px; animation:spin 1s linear infinite;"></div><h3>Gerando PDF...</h3></div>';
  document.body.appendChild(div);
  return div;
}

function removerLoadingPDF(loading) {
  if (loading && loading.parentNode) loading.remove();
}

function prepararDadosParaPDF() {
  const dados = listaFiltrada.length ? listaFiltrada : todosOsPostes;
  const stats = {
    total: dados.length,
    concluidos: dados.filter(p => normalizarTexto(p.status) === 'concluído').length,
    andamento: dados.filter(p => { const s = normalizarTexto(p.status); return s === '' || s === 'em andamento'; }).length,
    comPodas: dados.filter(p => /r\$ ?[\d.,]+/i.test((p.servicosPodas||'').toLowerCase())).length,
    comLV: dados.filter(p => /r\$ ?[\d.,]+/i.test((p.linhaViva||'').toLowerCase())).length,
    projetos: new Set(dados.map(p => p.idProjeto).filter(Boolean)).size,
    totalPodas: somarValor('servicosPodas', 'status', dados),
    totalLV: somarValor('linhaViva', 'status', dados)
  };
  const agora = new Date();
  const filtros = obterFiltrosAtuais();
  return { dados: dados.slice(0,500), stats, dataGeracao: agora.toLocaleDateString('pt-BR'), horaGeracao: agora.toLocaleTimeString('pt-BR'), filtros };
}

function obterFiltrosAtuais() {
  const filtros = [];
  const proj = document.getElementById('filtroProjeto')?.value;
  if (proj) filtros.push(`📁 Projeto: ${proj}`);
  const poste = document.getElementById('filtroPoste')?.value;
  if (poste) filtros.push(`🔖 Poste: ${poste}`);
  const usuario = document.getElementById('usuario')?.value;
  if (usuario) filtros.push(`👤 Usuário: ${usuario}`);
  const status = document.getElementById('filtroStatus')?.value;
  if (status) filtros.push(`📊 Status: ${status}`);
  const dataInicial = document.getElementById('dataInicial')?.value;
  if (dataInicial) {
    const dataFinal = document.getElementById('dataFinal')?.value;
    filtros.push(`📅 Período: ${dataInicial} ${dataFinal ? `a ${dataFinal}` : 'em diante'}`);
  }
  return filtros.length ? filtros : ['📋 Sem filtros aplicados'];
}

async function gerarPDFComIcones(dados) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Atbuilt - Sistema de Gestão de Postes', pageWidth/2, 15, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Gerado em: ${dados.dataGeracao} às ${dados.horaGeracao}`, pageWidth-margin, 20, { align: 'right' });
  yPos = 35;

  doc.setTextColor(51,51,51);
  doc.setFontSize(14);
  doc.text('ESTATÍSTICAS GERAIS', margin, yPos);
  yPos += 8;
  const statsArr = [
    ['Total de Postes', dados.stats.total],
    ['Projetos', dados.stats.projetos],
    ['Concluídos', dados.stats.concluidos],
    ['Em Andamento', dados.stats.andamento],
    ['Com Podas', dados.stats.comPodas],
    ['Com Linha Viva', dados.stats.comLV]
  ];
  const cardW = (pageWidth - 2*margin - 20)/3;
  statsArr.forEach((stat, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx/3);
    const x = margin + col*(cardW+10);
    const y = yPos + row*25;
    doc.setFillColor(248,249,250);
    doc.roundedRect(x, y, cardW, 20, 3, 3, 'F');
    doc.setFontSize(8);
    doc.text(stat[0], x+5, y+8);
    doc.setFontSize(12);
    doc.text(stat[1].toString(), x+5, y+16);
  });
  yPos += 55;

  if (dados.stats.totalPodas > 0 || dados.stats.totalLV > 0) {
    doc.setFillColor(240,244,248);
    doc.roundedRect(margin, yPos, pageWidth-2*margin, 15, 3, 3, 'F');
    doc.setFontSize(10);
    let texto = '';
    if (dados.stats.totalPodas) texto += `Total Podas: ${dados.stats.totalPodas.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`;
    if (dados.stats.totalLV) {
      if (texto) texto += ' | ';
      texto += `Total Linha Viva: ${dados.stats.totalLV.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`;
    }
    doc.text(texto, pageWidth/2, yPos+10, { align: 'center' });
    yPos += 25;
  } else yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(102,126,234);
  doc.text('FILTROS APLICADOS:', margin, yPos);
  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(100,100,100);
  doc.text(dados.filtros.join(' • '), margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setTextColor(51,51,51);
  doc.text('LISTA DE POSTES', margin, yPos);
  yPos += 8;

  const colunas = [
    { label: 'Data', width: 18 }, { label: 'Projeto', width: 15 }, { label: 'PG', width: 15 },
    { label: 'Poste Prim.', width: 20 }, { label: 'Estr.Prim', width: 15 }, { label: 'Poste Sec.', width: 20 },
    { label: 'Estr.Sec', width: 15 }, { label: 'Linha Viva', width: 18 }, { label: 'Podas', width: 15 },
    { label: 'Obs', width: 20 }, { label: 'Local', width: 18 }, { label: 'Usuario', width: 18 },
    { label: 'Status', width: 15 }, { label: 'Tempo', width: 12 }
  ];

  let xPos = margin;
  doc.setFillColor(102,126,234);
  doc.rect(margin, yPos-3, pageWidth-2*margin, 8, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(6);
  colunas.forEach(col => {
    doc.text(col.label, xPos+1, yPos+2);
    xPos += col.width;
  });
  yPos += 8;
  doc.setTextColor(51,51,51);
  doc.setFontSize(5.5);

  dados.dados.forEach((poste, idx) => {
    if (yPos > pageHeight - margin - 10) {
      doc.addPage();
      yPos = margin + 10;
      doc.setFillColor(102,126,234);
      doc.rect(margin, yPos-3, pageWidth-2*margin, 8, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(6);
      xPos = margin;
      colunas.forEach(col => { doc.text(col.label, xPos+1, yPos+2); xPos += col.width; });
      doc.setTextColor(51,51,51);
      doc.setFontSize(5.5);
      yPos += 8;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248,249,250);
      doc.rect(margin, yPos-2, pageWidth-2*margin, 4.5, 'F');
    }
    xPos = margin;
    const data = poste.dataLancamento ? poste.dataLancamento.split(' ')[0] : '-';
    doc.text(data, xPos+1, yPos); xPos += colunas[0].width;
    doc.text((poste.idProjeto||'-').substring(0,8), xPos+1, yPos); xPos += colunas[1].width;
    doc.text((poste.codigoPoste||'-').substring(0,8), xPos+1, yPos); xPos += colunas[2].width;
    doc.text((poste.postePrimario||'-').substring(0,10), xPos+1, yPos); xPos += colunas[3].width;
    doc.text((poste.estruturaPrimaria||'-').substring(0,8), xPos+1, yPos); xPos += colunas[4].width;
    doc.text((poste.posteSecundario||'-').substring(0,10), xPos+1, yPos); xPos += colunas[5].width;
    doc.text((poste.estruturaSecundaria||'-').substring(0,8), xPos+1, yPos); xPos += colunas[6].width;
    const lv = (poste.linhaViva||'-');
    const lvDisp = lv.includes('R$') ? lv.substring(0,10) : (lv.length>8 ? lv.substring(0,8)+'...' : lv);
    doc.text(lvDisp, xPos+1, yPos); xPos += colunas[7].width;
    const podas = (poste.servicosPodas||'-');
    const podasDisp = podas.includes('R$') ? podas.substring(0,10) : (podas.length>8 ? podas.substring(0,8)+'...' : podas);
    doc.text(podasDisp, xPos+1, yPos); xPos += colunas[8].width;
    doc.text((poste.observacoes||'-').substring(0,10), xPos+1, yPos); xPos += colunas[9].width;
    const lat = poste.latitude ? poste.latitude.substring(0,6) : '-';
    const lng = poste.longitude ? poste.longitude.substring(0,6) : '-';
    doc.text(`${lat},${lng}`, xPos+1, yPos); xPos += colunas[10].width;
    doc.text((poste.usuario||'-').substring(0,10), xPos+1, yPos); xPos += colunas[11].width;
    const status = poste.status || 'Em andamento';
    const isConcluido = normalizarTexto(status) === 'concluído';
    doc.setTextColor(isConcluido ? 76 : 255, isConcluido ? 175 : 152, isConcluido ? 80 : 0);
    doc.text(status.substring(0,8), xPos+1, yPos);
    doc.setTextColor(51,51,51);
    xPos += colunas[12].width;
    const tempo = poste.tempoDecorrido ? `${poste.tempoDecorrido.dias}d` : '-';
    doc.text(tempo, xPos+1, yPos);
    yPos += 4.5;
  });

  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i=1; i<=totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(200,200,200);
    doc.line(margin, pageHeight-8, pageWidth-margin, pageHeight-8);
    doc.setFontSize(6);
    doc.setTextColor(150,150,150);
    doc.text(`Página ${i} de ${totalPaginas} • Total de registros: ${dados.dados.length}`, pageWidth/2, pageHeight-4, { align: 'center' });
    doc.setTextColor(102,126,234);
    doc.text('Atbuilt - Sistema Inteligente de Gestão', margin, pageHeight-4);
  }
  doc.save(`relatorio_postes_${dados.dataGeracao.replace(/\//g,'-')}.pdf`);
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  configurarAtalhoPDF();
  inicializarMapa();
});

// ========== EXPOR FUNÇÕES GLOBAIS ==========
window.ativarStreetView = ativarStreetView;
window.recentrarMapa = recentrarMapa;
window.alternarVisualizacaoMapa = alternarVisualizacaoMapa;
window.abrirTodasFotos = abrirTodasFotos;
window.editar = editar;
window.excluir = excluir;
window.togglePodas = togglePodas;
window.togglePowerBI = togglePowerBI;
window.baixarPDFModelo = baixarPDFModelo;
window.fazerLogin = fazerLogin;
window.fazerLogout = fazerLogout;
