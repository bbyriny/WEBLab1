const canvas = document.getElementById("canvasPlot");
const ctx = canvas.getContext("2d");
const mainMessage = document.getElementById("mainMessage");
const tbody = document.getElementById("Tbody");
const form = document.getElementById("pointForm");
let R = 2; // по умолчанию

function formatNumberString(numStr) {
    numStr = numStr.replace(',', '.');
    if (!numStr.includes('.')) return numStr;
    let [intPart, fracPart] = numStr.split('.');
    fracPart = fracPart.slice(0, 6);
    return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
}

function isYInRange(yStr) {
    try {
        yStr = yStr.trim().replace(',', '.');
        let parts = yStr.split('.');
        let intPart = BigInt(parts[0]);
        let fracPart = parts[1] ? BigInt(parts[1].padEnd(18, '0')) : BigInt(0);
        let yBig = intPart * BigInt(10 ** 18) + (intPart < 0 ? -fracPart : fracPart);
        const min = BigInt(-5 * 10 ** 18);
        const max = BigInt(3 * 10 ** 18);
        return yBig >= min && yBig <= max;
    } catch (e) {
        return false;
    }
}

function drawGraph(r) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 40;

    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    ctx.font = "12px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("x", canvas.width - 10, centerY + 20);
    ctx.fillText("-R", centerX - r*scale - 10, centerY + 20);
    ctx.fillText("-R/2", centerX - r*scale/2 - 10, centerY + 20);
    ctx.fillText("R/2", centerX + r*scale/2 - 10, centerY + 20);
    ctx.fillText("R", centerX + r*scale - 10, centerY + 20);

    ctx.fillText("y", centerX - 20, 10);
    ctx.fillText("R", centerX - 20, centerY - r*scale - 10);
    ctx.fillText("R/2", centerX - 20, centerY - r*scale/2 - 10);
    ctx.fillText("-R/2", centerX - 20, centerY + r*scale/2 - 10);
    ctx.fillText("-R", centerX - 20, centerY + r*scale - 10);

    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, r*scale, -Math.PI/2, 0, false); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + r/2*scale, centerY);
    ctx.lineTo(centerX + r/2*scale, centerY + r*scale);
    ctx.lineTo(centerX, centerY + r*scale); ctx.closePath(); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - r*scale, centerY);
    ctx.lineTo(centerX, centerY - r*scale); ctx.closePath(); ctx.stroke();

    ctx.fillStyle = "rgba(100,149,237,0.5)";
    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, r*scale, -Math.PI/2, 0, false); ctx.lineTo(centerX, centerY); ctx.fill();

    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + r/2*scale, centerY);
    ctx.lineTo(centerX + r/2*scale, centerY + r*scale);
    ctx.lineTo(centerX, centerY + r*scale); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - r*scale, centerY);
    ctx.lineTo(centerX, centerY - r*scale); ctx.closePath(); ctx.fill();
}

function drawPoint(x, y, hit) {
    const centerX = canvas.width/2;
    const centerY = canvas.height/2;
    const scale = 40;
    ctx.fillStyle = hit ? "green" : "red";
    ctx.beginPath();
    ctx.arc(centerX + x*scale, centerY - y*scale, 4, 0, 2*Math.PI);
    ctx.fill();
}

function isValidNumber(str) {
    return /^-?\d+(\.\d+)?$/.test(str.trim().replace(',', '.'));
}

function addResult(x, y, r, status, serverTime) {
    const tr = document.createElement("tr");
    const now = new Date();
    const timeStr = serverTime ? `${serverTime} ms` : "—";
    tr.innerHTML = `
        <td>${formatNumberString(x)}</td>
        <td>${formatNumberString(y)}</td>
        <td>${r}</td>
        <td>${status === true || status === "true" ? "Ура, попал" : "Мимо"}</td>
        <td>${now.toLocaleTimeString()}</td>
        <td>${timeStr}</td>
    `;
    tbody.prepend(tr);
    localStorage.setItem("tableData", tbody.innerHTML);
}

function checkForm(form) {
    let xStr = form.x.value.trim();
    let yStr = form.y.value.trim();
    let rStr = form.r.value.trim();

    if (!isValidNumber(xStr) || !isValidNumber(yStr) || !isValidNumber(rStr)) {
        mainMessage.textContent = "Все значения должны быть числами";
        mainMessage.style.backgroundColor = "red";
        return false;
    }

    if (!isYInRange(yStr)) {
        mainMessage.textContent = "Недопустимое значение Y";
        mainMessage.style.backgroundColor = "red";
        return false;
    }

    mainMessage.textContent = "Данные корректны";
    mainMessage.style.backgroundColor = "lightgreen";

    let x = parseFloat(xStr);
    let r = parseInt(rStr);

    drawGraph(r);

    fetch("/calculate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({x: xStr, y: yStr, r: rStr})
    })
    .then(res => res.json())
    .then(data => {
        const hit = data.hit === true || data.hit === "true";
        drawPoint(parseFloat(xStr), parseFloat(yStr), hit);
        addResult(xStr, yStr, rStr, hit, data.scriptTimeMs);
    })
    .catch(err => {
        console.error(err);
        drawPoint(parseFloat(xStr), parseFloat(yStr), false);
        addResult(xStr, yStr, rStr, false, "—");
    });

    return false;
}

window.onload = function() {
    drawGraph(R);
    if (localStorage.getItem("tableData")) {
        tbody.innerHTML = localStorage.getItem("tableData");
    }
};

const music = document.getElementById("backgroundMusic");
const toggleButton = document.getElementById("musicToggle");
toggleButton.addEventListener("click", function() {
    if (music.paused) {
        music.play();
        toggleButton.textContent = "Выключить музыку";
    } else {
        music.pause();
        toggleButton.textContent = "Включить музыку";
    }
});

document.getElementById("clearTableButton").addEventListener("click", function() {
    tbody.innerHTML = "";
    localStorage.removeItem("tableData");
});
