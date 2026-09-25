import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

if (window.ChartZoom) {
    Chart.register(window.ChartZoom);
}

const firebaseConfig = {
    apiKey: "AIzaSyC8RUchuAsxVdsPsk9yEdZ8O8HaG05vKcE",
    authDomain: "atmostech26.firebaseapp.com",
    projectId: "atmostech26",
    storageBucket: "atmostech26.firebasestorage.app",
    messagingSenderId: "917510370604",
    appId: "1:917510370604:web:934d5debee73d28863a889"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const q = query(collection(db, "leituras"), orderBy("timestamp", "desc"), limit(1440));

let grafico = null;
const canvas = document.getElementById("meuGrafico");
const ctx = canvas.getContext("2d");

const dataAtualEl = document.getElementById("dataAtual");
const tempAtualEl = document.getElementById("tempAtual");
const umidAtualEl = document.getElementById("umidAtual");
const tempDetalheEl = document.getElementById("tempDetalhe");
const umidDetalheEl = document.getElementById("umidDetalhe");
const tempConditionEl = document.getElementById("tempCondition");
const humidityConditionEl = document.getElementById("humidityCondition");
const auraStatusDetailEl = document.getElementById("auraStatusDetail");
const feelsLikeEl = document.getElementById("feelsLike");
const dewPointEl = document.getElementById("dewPoint");
const windSpeedEl = document.getElementById("windSpeed");
const environmentStatusEl = document.getElementById("environmentStatus");
const statusDescriptionEl = document.getElementById("statusDescription");
const statusDotEl = document.getElementById("statusDot");
const forecastListEl = document.getElementById("forecastList");
const forecastLocationEl = document.getElementById("forecastLocation");
const dailyAverageEl = document.getElementById("dailyAverage");
const alertListEl = document.getElementById("alertList");
const alertCountEl = document.getElementById("alertCount");
const deviceCityEl = document.getElementById("deviceCity");
const boardStatusEl = document.getElementById("boardStatus");
const boardStatusLabelEl = document.getElementById("boardStatusLabel");
const boardLocationEl = document.getElementById("boardLocation");
const alertsNavEl = document.getElementById("alertsNav");
const dashboardNavEl = document.getElementById("dashboardNav");
const reportsNavEl = document.getElementById("reportsNav");
const updatesNavEl = document.getElementById("updatesNav");
const faqNavEl = document.getElementById("faqNav");
const alertsViewEl = document.getElementById("alertsView");
const mainLayoutEl = document.querySelector(".main-layout");
const backDashboardEl = document.getElementById("backDashboard");
const alertsPageListEl = document.getElementById("alertsPageList");
const alertsPageCountEl = document.getElementById("alertsPageCount");
let historicoGrafico = null;
let techMessageHistory = [];
let ultimaLeituraFisica = null;
let ultimaLeituraTimestamp = 0;
let cidadeDispositivo = "sua localização";
let ultimaConsultaGeocodificacao = 0;
const techToggleEl = document.getElementById("techToggle");
const techChatEl = document.getElementById("techChat");
const techCloseEl = document.getElementById("techClose");
const techMessagesEl = document.getElementById("techMessages");
const techFormEl = document.getElementById("techForm");
const techInputEl = document.getElementById("techInput");
const techMicEl = document.getElementById("techMic");
const techAudioEl = document.getElementById("techAudio");
const techPromptEls = document.querySelectorAll("[data-tech-prompt]");
const techState = { ready: false, temp: null, humidity: null, labels: [], temps: [], umids: [], forecast: [] };
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechRecognition = SpeechRecognition ? new SpeechRecognition() : null;
let audioEnabled = true;
let speaking = false;

if (speechRecognition) {
    speechRecognition.lang = "pt-BR";
    speechRecognition.interimResults = false;
    speechRecognition.continuous = false;
    speechRecognition.onstart = () => techMicEl.classList.add("is-listening");
    speechRecognition.onend = () => techMicEl.classList.remove("is-listening");
    speechRecognition.onerror = () => techMicEl.classList.remove("is-listening");
    speechRecognition.onresult = (event) => {
        techInputEl.value = event.results[0][0].transcript;
        techFormEl.requestSubmit();
    };
} else {
    techMicEl.title = "Comando de voz não disponível neste navegador";
}

function abrirAlertas() {
    mainLayoutEl.style.display = "none";
    alertsViewEl.classList.add("is-visible");
    dashboardNavEl.classList.remove("active");
    alertsNavEl.classList.add("active");
    window.location.hash = "alertas";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirDashboard() {
    mainLayoutEl.style.display = "block";
    alertsViewEl.classList.remove("is-visible");
    alertsNavEl.classList.remove("active");
    dashboardNavEl.classList.add("active");
    history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

alertsNavEl.addEventListener("click", abrirAlertas);
dashboardNavEl.addEventListener("click", abrirDashboard);
backDashboardEl.addEventListener("click", abrirDashboard);
reportsNavEl.addEventListener("click", () => {
    abrirDashboard();
    document.querySelector(".history-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
});
updatesNavEl.addEventListener("click", () => {
    abrirDashboard();
    document.querySelector(".climate-modules")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
faqNavEl.addEventListener("click", () => {
    abrirTech();
    if (techMessagesEl.children.length) {
        adicionarMensagem("Você pode perguntar sobre temperatura, umidade, histórico, previsão, alertas e recomendações de proteção climática.", "tech");
    }
});
if (window.location.hash === "#alertas") abrirAlertas();

function extrairValor(campo) {
    if (campo === undefined || campo === null) return 0;
    if (typeof campo === "number") return campo;
    if (typeof campo === "string") return parseFloat(campo);
    if (typeof campo === "object") {
        return Number(campo.doubleValue ?? campo.integerValue ?? campo.stringValue ?? 0);
    }
    return 0;
}

function extrairTimestamp(campo) {
    if (campo === undefined || campo === null) return 0;
    if (typeof campo === "number") return campo;
    if (typeof campo === "string") return Number(campo) || 0;
    if (typeof campo.toMillis === "function") return campo.toMillis() / 1000;
    if (typeof campo === "object") {
        const segundos = campo.seconds ?? campo._seconds ?? campo.integerValue;
        return Number(segundos) || 0;
    }
    return 0;
}

function formatoDataAtual(timestamp) {
    const data = new Date(timestamp * 1000);
    return data.toLocaleString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short"
    }).replace(".", "");
}

function atualizarStatusPlaca(timestamp = ultimaLeituraTimestamp) {
    const online = timestamp > 0 && Date.now() - (timestamp * 1000) <= 180000;
    boardStatusEl.classList.toggle("is-on", online);
    boardStatusEl.classList.toggle("is-off", !online);
    boardStatusEl.setAttribute("aria-pressed", String(online));
    boardStatusEl.title = online ? "Placa online: última leitura recente" : "Placa offline: sem leitura recente";
    boardStatusLabelEl.textContent = online ? "ON" : "OFF";
}

function iniciarLocalizacaoDispositivo() {
    if (!navigator.geolocation) {
        boardLocationEl.textContent = "GPS indisponível";
        return;
    }

    navigator.geolocation.watchPosition(({ coords }) => {
        const { latitude, longitude } = coords;
        boardLocationEl.textContent = `Dispositivo ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        boardLocationEl.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
        boardLocationEl.title = "Abrir a localização atual do dispositivo no mapa";
        atualizarCidadeDispositivo(latitude, longitude);
    }, () => {
        boardLocationEl.textContent = "GPS bloqueado";
        boardLocationEl.removeAttribute("href");
        boardLocationEl.title = "Permita o acesso à localização para usar o GPS do dispositivo";
    }, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000
    });
}

async function atualizarCidadeDispositivo(latitude, longitude) {
    if (Date.now() - ultimaConsultaGeocodificacao < 60000) return;
    ultimaConsultaGeocodificacao = Date.now();
    try {
        const resposta = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
        if (!resposta.ok) throw new Error("Falha ao consultar a cidade");
        const dados = await resposta.json();
        const endereco = dados.address || {};
        const cidade = endereco.city || endereco.town || endereco.village || endereco.municipality || endereco.county;
        if (!cidade) return;
        cidadeDispositivo = cidade;
        deviceCityEl.textContent = cidade;
        forecastLocationEl.textContent = cidade;
    } catch (error) {
        console.warn("Não foi possível identificar a cidade do dispositivo:", error);
    }
}

function calcularPontoOrvalho(temperatura, umidade) {
    const a = 17.27;
    const b = 237.7;
    const gamma = (a * temperatura) / (b + temperatura) + Math.log(umidade / 100);
    return (b * gamma) / (a - gamma);
}

function atualizarStatus(temperatura, umidade) {
    const ideal = temperatura >= 20 && temperatura <= 30 && umidade >= 40 && umidade <= 70;
    const moderado = temperatura >= 16 && temperatura <= 34 && umidade >= 25 && umidade <= 80;
    const status = ideal ? "Ideal" : moderado ? "Moderado" : "Crítico";
    const description = ideal ? "Condições confortáveis" : moderado ? "Atenção às variações" : "Verifique o ambiente";
    environmentStatusEl.textContent = status;
    statusDescriptionEl.textContent = description;
    statusDotEl.style.background = ideal ? "#8ee0bc" : moderado ? "#f2c17e" : "#f19b8d";
    statusDotEl.style.boxShadow = `0 0 12px ${ideal ? "#8ee0bc" : moderado ? "#f2c17e" : "#f19b8d"}`;
}

function atualizarCondicoesIndicadores(temperatura, umidade) {
    const temperaturaCondicao = temperatura <= 15 || temperatura >= 35 ? "critical" : temperatura >= 20 && temperatura <= 30 ? "normal" : "attention";
    const temperaturaTexto = temperaturaCondicao === "critical" ? "Crítico" : temperaturaCondicao === "normal" ? "Normal" : "Atenção";
    const umidadeCondicao = umidade < 30 || umidade > 80 ? "critical" : umidade < 40 ? "attention" : "normal";
    const umidadeTexto = umidadeCondicao === "critical" ? "Crítico" : umidadeCondicao === "normal" ? "Normal" : "Atenção";

    tempConditionEl.className = `metric-condition ${temperaturaCondicao}`;
    tempConditionEl.lastElementChild.textContent = temperaturaTexto;
    humidityConditionEl.className = `metric-condition ${umidadeCondicao}`;
    humidityConditionEl.lastElementChild.textContent = umidadeTexto;

    const resumo = umidade < 30
        ? `Umidade em ${umidade.toFixed(0)}%. Condição crítica de baixa umidade.`
        : umidade < 40
            ? `Umidade em ${umidade.toFixed(0)}%. Atenção às condições do ambiente.`
            : temperatura < 20 || temperatura > 30
                ? `Temperatura em ${temperatura.toFixed(1)} graus Celsius. Atenção à variação térmica.`
                : `Condição atual estável: ${temperatura.toFixed(1)} graus Celsius e ${umidade.toFixed(0)}% de umidade.`;
    auraStatusDetailEl.textContent = resumo;
}

function aplicarTemaAmbiental(temperatura = techState.temp) {
    const temperaturaExtrema = Number.isFinite(temperatura) && (temperatura >= 35 || temperatura <= 15);
    localStorage.removeItem("climateDashboardThemeMode");
    document.body.dataset.theme = "dark";
    document.body.dataset.climate = temperaturaExtrema ? "extreme" : temperatura >= 30 ? "warm" : "stable";
}

function atualizarPrevisao(temperatura, umidade) {
    const nomesDias = ["Hoje", "Amanhã", "Qui", "Sex", "Sáb"];
    techState.forecast = [];
    forecastListEl.replaceChildren();
    nomesDias.forEach((nome, index) => {
        const variation = Math.sin(index * 1.45) * 1.8;
        const forecastTemp = temperatura + variation;
        const forecastHumidity = Math.max(20, Math.min(95, umidade + Math.cos(index * 1.2) * 5));
        techState.forecast.push({ day: nome, temp: forecastTemp, humidity: forecastHumidity, icon: index % 3 === 2 ? "☔" : index % 2 ? "☼" : "◌" });
        const item = document.createElement("div");
        item.className = "forecast-day";
        item.innerHTML = `<strong>${nome}</strong><span class="forecast-icon">${techState.forecast.at(-1).icon}</span><span class="forecast-temp">${forecastTemp.toFixed(1)}°</span><span class="forecast-humidity">${forecastHumidity.toFixed(0)}%</span>`;
        forecastListEl.append(item);
    });
}

function atualizarAlertas(temperatura, umidade, temps, umids) {
    const alertas = [];
    if (temperatura >= 35 || temperatura <= 15) alertas.push({ text: `Temperatura fora da faixa: ${temperatura.toFixed(1)}°C`, type: "critical" });
    if (umidade >= 80) alertas.push({ text: `Umidade muito alta: ${umidade.toFixed(0)}%`, type: "warning" });
    else if (umidade < 30) alertas.push({ text: `Umidade crítica: ${umidade.toFixed(0)}%`, type: "critical" });
    else if (umidade < 40) alertas.push({ text: `Umidade baixa: ${umidade.toFixed(0)}%`, type: "warning" });
    if (temps.length > 1 && Math.abs(temps.at(-1) - temps.at(-2)) >= 3) alertas.push({ text: "Variação brusca de temperatura detectada", type: "warning" });
    if (umids.length > 1 && Math.abs(umids.at(-1) - umids.at(-2)) >= 15) alertas.push({ text: "Variação brusca de umidade detectada", type: "warning" });
    alertCountEl.textContent = `${alertas.length} ${alertas.length === 1 ? "aviso" : "avisos"}`;
    alertsPageCountEl.textContent = `${alertas.length} ${alertas.length === 1 ? "aviso" : "avisos"}`;
    alertListEl.replaceChildren();
    alertsPageListEl.replaceChildren();
    if (!alertas.length) {
        const empty = document.createElement("span");
        empty.className = "empty-alert";
        empty.textContent = "Nenhum alerta ativo no momento.";
        alertListEl.append(empty);
        alertsPageListEl.append(empty.cloneNode(true));
        return;
    }
    alertas.forEach(({ text, type }) => {
        const item = document.createElement("span");
        item.className = `alert-item ${type}`;
        item.textContent = text;
        alertListEl.append(item);
        alertsPageListEl.append(item.cloneNode(true));
    });
}

function montarHistorico(labels, temps, umids) {
    const historyCanvas = document.getElementById("historicoGrafico");
    const temaClaro = document.body.dataset.theme === "light";
    const textoGrafico = temaClaro ? "rgba(29, 67, 79, 0.78)" : "rgba(223, 239, 255, 0.72)";
    const textoTemperatura = temaClaro ? "rgba(183, 91, 73, 0.9)" : "rgba(238, 155, 136, 0.8)";
    const textoUmidade = temaClaro ? "rgba(45, 111, 137, 0.9)" : "rgba(139, 199, 220, 0.8)";
    if (historicoGrafico) historicoGrafico.destroy();
    historicoGrafico = new Chart(historyCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                { label: "Temperatura", data: temps, borderColor: "#ee9b88", backgroundColor: "rgba(238, 155, 136, 0.12)", borderWidth: 2, pointRadius: 2, tension: 0.4, fill: true, yAxisID: "tempHistory" },
                { label: "Umidade", data: umids, borderColor: "#8bc7dc", borderWidth: 2, pointRadius: 2, tension: 0.4, yAxisID: "humidityHistory" }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: true, position: "bottom", labels: { color: textoGrafico, boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 16 } },
                tooltip: { enabled: true, backgroundColor: temaClaro ? "rgba(245, 252, 251, 0.96)" : "rgba(6, 20, 32, 0.94)", titleColor: temaClaro ? "#193340" : "#f5fbff", bodyColor: temaClaro ? "#315460" : "#dfefff", borderColor: "rgba(168, 220, 255, 0.24)", borderWidth: 1, cornerRadius: 10, padding: 10 }
            },
            scales: {
                x: { ticks: { color: textoGrafico, maxTicksLimit: 5 }, grid: { display: false }, border: { display: false } },
                tempHistory: { position: "left", ticks: { color: textoTemperatura, maxTicksLimit: 4 }, grid: { color: temaClaro ? "rgba(43, 93, 104, 0.1)" : "rgba(191, 221, 245, 0.08)" }, border: { display: false } },
                humidityHistory: { position: "right", ticks: { color: textoUmidade, maxTicksLimit: 4 }, grid: { display: false }, border: { display: false } }
            }
        }
    });
}

function atualizarModulos(temperatura, umidade, labels, temps, umids) {
    techState.ready = true;
    techState.temp = temperatura;
    techState.humidity = umidade;
    techState.labels = [...labels];
    techState.temps = [...temps];
    techState.umids = [...umids];
    aplicarTemaAmbiental(temperatura);
    const feelsLike = temperatura + ((umidade - 40) * 0.05);
    const dewPoint = calcularPontoOrvalho(temperatura, Math.max(1, umidade));
    const windSpeed = 5 + Math.abs(temperatura - 24) * 1.2 + (umidade < 45 ? 2 : 0);
    feelsLikeEl.textContent = feelsLike.toFixed(1);
    dewPointEl.textContent = dewPoint.toFixed(1);
    windSpeedEl.textContent = windSpeed.toFixed(1);
    dailyAverageEl.textContent = `Média: ${(temps.reduce((sum, value) => sum + value, 0) / Math.max(temps.length, 1)).toFixed(1)}°C`;
    atualizarStatus(temperatura, umidade);
    atualizarCondicoesIndicadores(temperatura, umidade);
    atualizarPrevisao(temperatura, umidade);
    atualizarAlertas(temperatura, umidade, temps, umids);
    montarHistorico(labels, temps, umids);
}

function anunciarVariacaoFisica(temperatura, umidade) {
    if (!ultimaLeituraFisica) {
        ultimaLeituraFisica = { temperatura, umidade };
        return;
    }

    const deltaTemperatura = temperatura - ultimaLeituraFisica.temperatura;
    const deltaUmidade = umidade - ultimaLeituraFisica.umidade;
    ultimaLeituraFisica = { temperatura, umidade };
    const mudouTemperatura = Math.abs(deltaTemperatura) >= 0.5;
    const mudouUmidade = Math.abs(deltaUmidade) >= 5;
    if (!mudouTemperatura && !mudouUmidade) return;

    const partes = [];
    if (mudouTemperatura) partes.push(`temperatura ${deltaTemperatura > 0 ? "subiu" : "caiu"} ${Math.abs(deltaTemperatura).toFixed(1)}°C`);
    if (mudouUmidade) partes.push(`umidade ${deltaUmidade > 0 ? "subiu" : "caiu"} ${Math.abs(deltaUmidade).toFixed(0)}%`);
    const aviso = `🔔 Atualização da placa em ${cidadeDispositivo}: ${partes.join(" e ")}. Agora são ${temperatura.toFixed(1)}°C e ${umidade.toFixed(0)}% de umidade.`;
    if (techChatEl.classList.contains("is-open")) adicionarMensagem(aviso, "tech");
}

function montarGrafico(labels, temps, umids) {
    const temaClaro = document.body.dataset.theme === "light";
    const tempColor = "#d99182";
    const humidColor = "#8eaeba";
    const gridColor = temaClaro ? "rgba(43, 93, 104, 0.12)" : "rgba(191, 221, 245, 0.12)";
    const textColor = temaClaro ? "rgba(29, 67, 79, 0.78)" : "rgba(223, 239, 255, 0.7)";
    const gradientTemp = ctx.createLinearGradient(0, 0, 0, 320);
    gradientTemp.addColorStop(0, "rgba(217, 145, 130, 0.34)");
    gradientTemp.addColorStop(0.45, "rgba(217, 145, 130, 0.12)");
    gradientTemp.addColorStop(1, "rgba(217, 145, 130, 0)");

    const gradientHumid = ctx.createLinearGradient(0, 0, 0, 320);
    gradientHumid.addColorStop(0, "rgba(112, 150, 167, 0.34)");
    gradientHumid.addColorStop(0.52, "rgba(112, 150, 167, 0.14)");
    gradientHumid.addColorStop(1, "rgba(112, 150, 167, 0.01)");

    if (grafico) {
        grafico.destroy();
    }

    grafico = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Temperatura",
                    data: temps,
                    borderColor: tempColor,
                    backgroundColor: gradientTemp,
                    borderWidth: 1.6,
                    borderCapStyle: "round",
                    borderJoinStyle: "round",
                    pointRadius: 0.8,
                    pointHoverRadius: 5,
                    pointBackgroundColor: tempColor,
                    pointBorderColor: "rgba(241, 249, 250, 0.8)",
                    pointBorderWidth: 1,
                    fill: true,
                    tension: 0.68,
                    cubicInterpolationMode: "monotone",
                    yAxisID: "temperature",
                    order: 2,
                    spanGaps: true
                },
                {
                    label: "Umidade",
                    data: umids,
                    borderColor: humidColor,
                    backgroundColor: gradientHumid,
                    borderWidth: 1.4,
                    pointRadius: 0.8,
                    pointHoverRadius: 5,
                    pointBackgroundColor: humidColor,
                    pointBorderColor: "rgba(241, 249, 250, 0.8)",
                    pointBorderWidth: 1,
                    fill: true,
                    tension: 0.68,
                    cubicInterpolationMode: "monotone",
                    yAxisID: "humidity",
                    order: 1,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 550,
                easing: "easeOutQuart"
            },
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        color: "rgba(223, 239, 255, 0.72)",
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: temaClaro ? "rgba(245, 252, 251, 0.96)" : "rgba(8, 18, 30, 0.94)",
                    titleColor: temaClaro ? "#193340" : "#f5fbff",
                    bodyColor: temaClaro ? "#315460" : "#dfefff",
                    borderColor: "rgba(168, 220, 255, 0.2)",
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label(context) {
                            const suffix = context.dataset.label === "Temperatura" ? "°C" : "%";
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}${suffix}`;
                        }
                    },
                    displayColors: true
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: "x"
                    },
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: "x"
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: "rgba(191, 221, 245, 0.1)",
                        borderDash: [2, 6],
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    },
                    border: {
                        display: false
                    }
                },
                temperature: {
                    position: "left",
                    min: 20,
                    max: 40,
                    ticks: {
                        color: textColor,
                        stepSize: 5,
                        callback: (value) => `${value}°C`
                    },
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    }
                },
                humidity: {
                    position: "right",
                    min: 40,
                    max: 80,
                    ticks: {
                        color: textColor,
                        stepSize: 10,
                        callback: (value) => `${value}%`
                    },
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

const valorPadrao = {
    temp: 28,
    umid: 68
};

tempAtualEl.textContent = valorPadrao.temp.toFixed(1);
umidAtualEl.textContent = valorPadrao.umid.toFixed(0);
tempDetalheEl.textContent = valorPadrao.temp.toFixed(1);
umidDetalheEl.textContent = valorPadrao.umid.toFixed(0);
dataAtualEl.textContent = "Aguardando leitura...";
atualizarStatusPlaca(0);
boardLocationEl.textContent = "GPS do dispositivo aguardando";
iniciarLocalizacaoDispositivo();
atualizarModulos(valorPadrao.temp, valorPadrao.umid, ["Agora"], [valorPadrao.temp], [valorPadrao.umid]);
window.setInterval(() => {
    atualizarStatusPlaca();
    aplicarTemaAmbiental(techState.temp ?? valorPadrao.temp);
}, 15000);

onSnapshot(q, (snapshot) => {
    if (!snapshot || snapshot.empty) {
        ultimaLeituraTimestamp = 0;
        atualizarStatusPlaca(0);
        tempAtualEl.textContent = valorPadrao.temp.toFixed(1);
        umidAtualEl.textContent = valorPadrao.umid.toFixed(0);
        tempDetalheEl.textContent = valorPadrao.temp.toFixed(1);
        umidDetalheEl.textContent = valorPadrao.umid.toFixed(0);
        atualizarModulos(valorPadrao.temp, valorPadrao.umid, ["Agora"], [valorPadrao.temp], [valorPadrao.umid]);
        return;
    }

    const labels = [];
    const temps = [];
    const umids = [];

    const dadosRecentes = snapshot.docs[0].data();
    const temperaturaAtual = extrairValor(dadosRecentes.temperatura);
    const umidadeAtual = extrairValor(dadosRecentes.umidade);
    const timestampAtual = extrairTimestamp(dadosRecentes.timestamp);
    ultimaLeituraTimestamp = timestampAtual;
    atualizarStatusPlaca(timestampAtual);

    tempAtualEl.textContent = temperaturaAtual.toFixed(1);
    umidAtualEl.textContent = umidadeAtual.toFixed(0);
    tempDetalheEl.textContent = temperaturaAtual.toFixed(1);
    umidDetalheEl.textContent = umidadeAtual.toFixed(0);

    if (timestampAtual > 0) {
        dataAtualEl.textContent = formatoDataAtual(timestampAtual);
    }

    snapshot.docs.forEach((doc) => {
        const dados = doc.data();
        const rawTimestamp = extrairTimestamp(dados.timestamp);

        let hora = "--:--";
        if (rawTimestamp > 0) {
            hora = new Date(rawTimestamp * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        labels.push(hora);
        temps.push(extrairValor(dados.temperatura));
        umids.push(extrairValor(dados.umidade));
    });

    montarGrafico(labels.reverse(), temps.reverse(), umids.reverse());
    atualizarModulos(temperaturaAtual, umidadeAtual, labels, temps, umids);
    anunciarVariacaoFisica(temperaturaAtual, umidadeAtual);
}, (error) => {
    console.error("Erro no listener do Firestore:", error);
    techState.ready = false;
});

function normalizarPergunta(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function adicionarMensagem(texto, tipo) {
    techMessageHistory.push({ texto, tipo });
    const mensagem = document.createElement("div");
    mensagem.className = `tech-message ${tipo}`;
    if (tipo === "user") {
        mensagem.textContent = texto;
    } else {
        mensagem.innerHTML = texto;
    }
    techMessagesEl.append(mensagem);
    techMessagesEl.scrollTop = techMessagesEl.scrollHeight;
}

function resetChatHistory() {
    techMessageHistory = [];
    techMessagesEl.replaceChildren();
}

function responderTech(pergunta) {
    const texto = normalizarPergunta(pergunta);
    const risco = techState.temp >= 35 || techState.temp <= 15 || techState.humidity >= 80 || techState.humidity <= 25;
    const topicos = [];
    const querConexao = texto.includes("conexao") || texto.includes("conectada") || texto.includes("online") || texto.includes("offline") || texto.includes("placa") || texto.includes("hardware");
    const querPainel = texto.includes("painel") || texto.includes("dashboard") || texto.includes("funcionalidade") || texto.includes("como funciona");
    const querGrafico = texto.includes("grafico") || texto.includes("variacao") || texto.includes("curva") || texto.includes("evolucao");
    const querAlerta = texto.includes("alerta") || texto.includes("avisos") || texto.includes("notificacao");
    const querRelatorio = texto.includes("relatorio") || texto.includes("media") || texto.includes("historico");
    const querLocalizacao = texto.includes("localizacao") || texto.includes("cidade") || texto.includes("gps");
    const temDados = techState.ready && techState.temp !== null;
    if (!temDados && querConexao) {
        return "A placa está OFF ou ainda não enviou uma leitura válida. O dashboard considera a placa online quando recebe uma medição recente do Firestore.";
    }
    if (!temDados) return "A AURA ainda não recebeu uma leitura válida do Firestore. Verifique a conexão da placa, as credenciais do Firebase e tente novamente.";
    const querRecomendacao = texto.includes("recomend") || texto.includes("dica") || texto.includes("protec") || texto.includes("saude") || texto.includes("o que fazer") || texto.includes("vestir") || texto.includes("roupa");
    const querRisco = texto.includes("risco") || texto.includes("perigo") || texto.includes("alerta") || texto.includes("desidrat") || texto.includes("estresse termico");
    const querMaior = texto.includes("maior temperatura") || texto.includes("maxima") || texto.includes("maior calor");
    const querMenor = texto.includes("menor temperatura") || texto.includes("minima");
    const querTemperatura = texto.includes("temperatura") || texto.includes("calor") || texto.includes("graus");
    const querUmidade = texto.includes("umidade") || texto.includes("humidade");
    const querHistorico = texto.includes("historico") || texto.includes("historia") || texto.includes("hora") || /\d{1,2}h/.test(texto);
    const querPrevisao = texto.includes("previsao") || texto.includes("chover") || texto.includes("chuva") || texto.includes("amanha") || texto.includes("quarta");
    const querStatus = texto.includes("status") || texto.includes("ambiente") || texto.includes("ideal");

    if (querPainel) {
        topicos.push("🖥️ <strong>Painel geral:</strong> mostra a temperatura e a umidade mais recentes, o horário da leitura, o gráfico de evolução, o status ambiental, a previsão estimada, o histórico e os alertas ativos.");
    }
    if (querGrafico) {
        const amostras = techState.temps.length;
        topicos.push(`📈 <strong>Gráfico:</strong> a linha de temperatura usa graus Celsius e a linha de umidade usa porcentagem. O gráfico apresenta ${amostras} amostra${amostras === 1 ? "" : "s"} da coleção <em>leituras</em>; os pontos são ordenados pelo horário recebido e podem ser ampliados ou deslocados horizontalmente.`);
    }
    if (querRelatorio) {
        const media = techState.temps.reduce((sum, value) => sum + value, 0) / Math.max(techState.temps.length, 1);
        topicos.push(`📊 <strong>Relatório:</strong> há ${techState.temps.length} leituras no período carregado. A média de temperatura é ${media.toFixed(1)} graus Celsius; o histórico permite comparar temperatura e umidade por horário.`);
    }
    if (querAlerta) {
        const statusAlerta = alertCountEl.textContent || "0 avisos";
        topicos.push(`⚠️ <strong>Alertas:</strong> o sistema verifica temperatura fora de 15 a 35 graus Celsius, umidade fora de 25% a 80% e variações bruscas entre leituras. Estado atual: ${statusAlerta}.`);
    }
    if (querConexao) {
        const online = boardStatusLabelEl.textContent === "ON";
        const idade = ultimaLeituraTimestamp ? Math.max(0, Math.round((Date.now() - ultimaLeituraTimestamp * 1000) / 1000)) : null;
        topicos.push(`🔌 <strong>Conexão da placa:</strong> ${online ? "ON" : "OFF"}. ${online ? `A última medição chegou há aproximadamente ${idade} segundos pelo Firestore.` : "Não há uma medição recente; confira energia, Wi-Fi, autenticação Firebase e o sensor DHT11."}`);
    }
    if (querLocalizacao) {
        topicos.push(`📍 <strong>Localização:</strong> o navegador informou ${cidadeDispositivo}. O link GPS no cabeçalho abre as coordenadas atuais do dispositivo no mapa.`);
    }

    if (querRecomendacao) {
        if (techState.temp >= 35 || techState.temp >= 30 && techState.humidity < 35) topicos.push("☀️ <strong>Recomendação para calor:</strong> use protetor solar, roupas leves, óculos de sol e beba água com frequência. Evite exposição e exercícios nos horários de pico.");
        else if (techState.temp <= 18) topicos.push("🧥 <strong>Recomendação para frio:</strong> use agasalhos, mantenha os ambientes ventilados e redobre os cuidados com a imunidade.");
        else if (techState.humidity < 35) topicos.push("💧 <strong>Recomendação para baixa umidade:</strong> considere um umidificador, reforce a hidratação e evite exercícios ao ar livre nos horários mais quentes.");
        else topicos.push("🌤️ <strong>Recomendação:</strong> as condições estão estáveis. Mantenha a hidratação, acompanhe os alertas e prefira atividades ao ar livre em horários confortáveis.");
    }
    if (querRisco) {
        topicos.push(risco
            ? `⚠️ <strong>Análise de risco:</strong> ${techState.temp.toFixed(1)}°C com ${techState.humidity.toFixed(0)}% de umidade pode causar desconforto climático. Hidrate-se e acompanhe os alertas.`
            : `✅ <strong>Análise de risco:</strong> não há risco climático crítico agora. ${techState.temp.toFixed(1)}°C e ${techState.humidity.toFixed(0)}% estão em uma faixa segura.`);
    }
    if (querMaior) {
        const maior = Math.max(...techState.temps);
        const indice = techState.temps.indexOf(maior);
        topicos.push(`📊 <strong>Maior temperatura no histórico:</strong> ${maior.toFixed(1)}°C, registrada às ${techState.labels[indice] || "--:--"}.`);
    }
    if (querMenor) {
        const menor = Math.min(...techState.temps);
        const indice = techState.temps.indexOf(menor);
        topicos.push(`📊 <strong>Menor temperatura no histórico:</strong> ${menor.toFixed(1)}°C, registrada às ${techState.labels[indice] || "--:--"}.`);
    }
    if (querTemperatura && !querMaior && !querMenor) {
        topicos.push(`🌡️ <strong>Temperatura atual em ${cidadeDispositivo}:</strong> ${techState.temp.toFixed(1)}°C.`);
    }
    if (querUmidade) {
        const status = techState.humidity > 70 ? "alta" : techState.humidity < 35 ? "baixa" : "normal";
        topicos.push(`💧 <strong>Umidade atual:</strong> ${techState.humidity.toFixed(0)}%, considerada ${status} para este ambiente.`);
    }
    if (querHistorico && !querMaior && !querMenor) {
        const hora = texto.match(/\d{1,2}h/);
        const indice = hora ? techState.labels.findIndex((label) => label.startsWith(hora[0].replace("h", ":"))) : techState.labels.length - 1;
        const leituraIndex = indice >= 0 ? indice : techState.labels.length - 1;
        topicos.push(`📈 <strong>Histórico:</strong> às ${techState.labels[leituraIndex] || "últimas horas"}, a temperatura era ${techState.temps[leituraIndex]?.toFixed(1)}°C e a umidade estava em ${techState.umids[leituraIndex]?.toFixed(0)}%.`);
    }
    if (querPrevisao) {
        const previsao = texto.includes("amanha") ? techState.forecast[1] : techState.forecast[2] || techState.forecast[1];
        topicos.push(`${previsao.icon} <strong>Previsão para ${previsao.day}:</strong> ${previsao.temp.toFixed(1)}°C e ${previsao.humidity.toFixed(0)}% de umidade. ${previsao.icon === "☔" ? "Há possibilidade de chuva isolada." : "Não há indicação de chuva forte."}`);
    }
    if (querStatus) {
        const status = techState.temp >= 20 && techState.temp <= 30 && techState.humidity >= 40 && techState.humidity <= 70 ? "ideal" : "moderado";
        topicos.push(`✅ <strong>Status do ambiente:</strong> ${status}, com ${techState.temp.toFixed(1)}°C e ${techState.humidity.toFixed(0)}% de umidade.`);
    }
    if (topicos.length) return `<ul>${topicos.map((topico) => `<li>${topico}</li>`).join("")}</ul>`;
    return "Meu foco é exclusivamente o monitoramento climático deste site. Posso te ajudar com temperaturas, umidade, históricos, alertas ou recomendações de proteção para o clima atual!";
}

function textoFalado(html) {
    const elemento = document.createElement("div");
    elemento.innerHTML = html;
    return (elemento.textContent || "")
        .replace(/°\s*C\b/gi, " graus Celsius")
        .replace(/\bC\b/gi, "Celsius")
        .replace(/°/g, " graus ")
        .replace(/%/g, " por cento ")
        .replace(/\s+/g, " ")
        .trim();
}

function falarComoAura(texto) {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textoFalado(texto));
    const vozes = window.speechSynthesis.getVoices();
    utterance.voice = vozes.find((voice) => /pt-BR/i.test(voice.lang) && /male|masculino|homem/i.test(voice.name))
        || vozes.find((voice) => /pt-BR/i.test(voice.lang))
        || vozes.find((voice) => /^pt/i.test(voice.lang));
    utterance.lang = "pt-BR";
    utterance.rate = 0.96;
    utterance.pitch = 0.82;
    speaking = true;
    utterance.onend = () => { speaking = false; };
    window.speechSynthesis.speak(utterance);
}

function abrirTech() {
    const aberto = techChatEl.classList.toggle("is-open");
    techChatEl.setAttribute("aria-hidden", String(!aberto));
    techToggleEl.setAttribute("aria-expanded", String(aberto));
    if (!aberto) {
        resetChatHistory();
        return;
    }
    if (aberto && !techMessagesEl.children.length) {
        const boasVindas = `Olá! Sou a AURA. Estou monitorando ${cidadeDispositivo}. Posso te ajudar com dados de temperatura, umidade, histórico, alertas de risco ou recomendações climáticas. Como posso ajudar agora?`;
        adicionarMensagem(boasVindas, "tech");
        falarComoAura(boasVindas);
    }
    if (aberto) techInputEl.focus();
}

function fecharTech() {
    resetChatHistory();
    techChatEl.classList.remove("is-open");
    techChatEl.setAttribute("aria-hidden", "true");
    techToggleEl.setAttribute("aria-expanded", "false");
    techInputEl.value = "";
}

techToggleEl.addEventListener("click", abrirTech);
techCloseEl.addEventListener("click", fecharTech);
techMicEl.addEventListener("click", () => {
    if (!speechRecognition) {
        adicionarMensagem("O comando de voz não está disponível neste navegador. Você ainda pode me enviar sua pergunta pelo campo de texto.", "tech");
        return;
    }
    speechRecognition.start();
});
techAudioEl.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    techAudioEl.classList.toggle("is-muted", !audioEnabled);
    techAudioEl.setAttribute("aria-pressed", String(audioEnabled));
    if (!audioEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
});

function enviarPerguntaTech(pergunta) {
    const textoPergunta = pergunta.trim();
    if (!textoPergunta) return;
    adicionarMensagem(textoPergunta, "user");
    techInputEl.value = "";
    window.setTimeout(() => {
        const resposta = responderTech(textoPergunta);
        adicionarMensagem(resposta, "tech");
        falarComoAura(resposta);
    }, 180);
}

techPromptEls.forEach((prompt) => {
    prompt.addEventListener("click", () => enviarPerguntaTech(prompt.dataset.techPrompt));
});

techFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    enviarPerguntaTech(techInputEl.value);
});
