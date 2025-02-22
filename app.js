let leaderboardData = [];
let allPlayers = [];
let currentMode = "FFA";
let currentSortColumn = "kills";
let currentSortDirection = "desc";
let currentPage = 1;
const groupSize = 4;
let maxPages = 1;
let currentGroupStart = 1;

async function fetchLeaderboard(mode = currentMode, sortParam = currentSortColumn) {
  const url = `https://api.hglabor.de/stats/${mode}/top?sort=${sortParam}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fehler beim Abrufen der Daten");
    const data = await response.json();
    leaderboardData = data.map(item => ({
      playerId: item.playerId || null,
      kills: item.kills || 0,
      deaths: item.deaths || 0,
      highestKillStreak: item.highestKillStreak || 0,
      xp: item.xp || 0,
      currentKillStreak: item.currentKillStreak || 0,
      playerName: item.playerName || ""
    }));
    maxPages = Math.ceil(leaderboardData.length / 10);
    allPlayers = [...leaderboardData];
    const promises = leaderboardData.map(entry => {
      if ((!entry.playerName || entry.playerName === "") && entry.playerId) {
        return getNameFromAshcon(entry.playerId).then(name => {
          entry.playerName = name;
          return entry;
        });
      }
      return Promise.resolve(entry);
    });
    await Promise.all(promises);
    fillTable();
    renderPageNumbers();
  } catch (err) {
    console.error(err);
    alert("Fehler beim Laden der Leaderboard-Daten.");
  }
}

function fillTable() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";
  const offset = (currentPage - 1) * 10;
  const pageData = leaderboardData.slice(offset, offset + 10);
  pageData.forEach((item, index) => {
    const row = document.createElement("tr");
    const rankCell = document.createElement("td");
    const rank = offset + index + 1;
    rankCell.textContent = rank;
    rankCell.style.fontWeight = "bold";
    if (currentPage === 1) {
      if (index === 0) rankCell.style.color = "#FFD700";
      else if (index === 1) rankCell.style.color = "#b1b1b1";
      else if (index === 2) rankCell.style.color = "#CD7F32";
      else rankCell.style.color = "#FFF";
    } else {
      rankCell.style.color = "#FFF";
    }
    row.appendChild(rankCell);
    const nameCell = document.createElement("td");
    const wrapper = document.createElement("div");
    wrapper.classList.add("player-wrapper");
    if (item.playerId) {
      const uuidNoDashes = item.playerId.replace(/-/g, "");
      const headImg = document.createElement("img");
      headImg.classList.add("player-head");
      headImg.dataset.src = `https://crafatar.com/avatars/${uuidNoDashes}?size=28`;
      wrapper.appendChild(headImg);
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = item.playerName || "???";
    wrapper.appendChild(nameSpan);
    wrapper.style.cursor = "pointer";
    wrapper.addEventListener("click", () => {
      if (item.playerId) showPlayerDetail(item.playerId);
    });
    nameCell.appendChild(wrapper);
    row.appendChild(nameCell);
    const killsCell = document.createElement("td");
    killsCell.textContent = item.kills;
    row.appendChild(killsCell);
    const deathsCell = document.createElement("td");
    deathsCell.textContent = item.deaths;
    row.appendChild(deathsCell);
    const highestCell = document.createElement("td");
    highestCell.textContent = item.highestKillStreak;
    row.appendChild(highestCell);
    const xpCell = document.createElement("td");
    xpCell.textContent = item.xp;
    row.appendChild(xpCell);
    const currentCell = document.createElement("td");
    currentCell.textContent = item.currentKillStreak;
    row.appendChild(currentCell);
    tbody.appendChild(row);
  });
  delayedLoadSkins();
}

function delayedLoadSkins() {
  const heads = document.querySelectorAll(".player-head");
  heads.forEach((img, i) => {
    setTimeout(() => {
      if (img.dataset.src) img.src = img.dataset.src;
    }, i * 200);
  });
}

function showPlayerDetail(playerId) {
  const url = "https://api.hglabor.de/stats/" + currentMode + "/" + playerId;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      document.querySelector(".leaderboard-container").style.display = "none";
      document.getElementById("playerDetail").style.display = "block";
      const detailSkin = document.getElementById("detailSkin");
      detailSkin.src = `https://crafatar.com/avatars/${playerId}?size=64`;
      if (data.spieler) {
        document.getElementById("detailName").textContent = data.spieler;
      } else {
        getNameFromAshcon(playerId).then(name => {
          document.getElementById("detailName").textContent = name;
        });
      }
      document.getElementById("detailUUID").textContent = data.playerId || playerId;
      document.getElementById("detailKills").textContent = data.kills || 0;
      document.getElementById("detailDeaths").textContent = data.deaths || 0;
      document.getElementById("detailXP").textContent = data.xp || 0;
      document.getElementById("detailHighestStreak").textContent = data.highestKillStreak || 0;
      document.getElementById("detailCurrentStreak").textContent = data.currentKillStreak || 0;
      let kd = 0;
      if ((data.deaths || 0) > 0) kd = (data.kills || 0) / data.deaths;
      document.getElementById("detailKD").textContent = kd.toFixed(2);
    })
    .catch(err => {
      alert("Fehler beim Laden der Detaildaten.");
      console.error(err);
    });
}

function hidePlayerDetail() {
  document.getElementById("playerDetail").style.display = "none";
  document.querySelector(".leaderboard-container").style.display = "block";
}

function getNameFromAshcon(uuid) {
  const uuidNoDashes = uuid.replace(/-/g, "");
  const url = "https://api.ashcon.app/mojang/v2/user/" + uuidNoDashes;
  return fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data || !data.username) return "Unknown";
      return data.username;
    })
    .catch(() => "Unknown");
}

function showSuggestionsAll(query) {
  const suggestionsContainer = document.getElementById("suggestions");
  suggestionsContainer.innerHTML = "";
  if (query.length < 2) return;
  const matches = allPlayers.filter(item => item.playerName && item.playerName.toLowerCase().includes(query.toLowerCase()));
  matches.forEach(match => {
    const div = document.createElement("div");
    div.classList.add("suggestion-item");
    if (match.playerId) {
      const uuidNoDashes = match.playerId.replace(/-/g, "");
      const img = document.createElement("img");
      img.src = `https://crafatar.com/avatars/${uuidNoDashes}?size=24`;
      div.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = match.playerName;
    div.appendChild(span);
    div.addEventListener("click", () => {
      document.getElementById("playerInput").value = match.playerName;
      suggestionsContainer.innerHTML = "";
      showPlayerDetail(match.playerId);
    });
    suggestionsContainer.appendChild(div);
  });
}

function renderPageNumbers() {
  const container = document.getElementById("pageNumbers");
  container.innerHTML = "";
  const end = Math.min(currentGroupStart + groupSize - 1, maxPages);
  for (let i = currentGroupStart; i <= end; i++) {
    const span = document.createElement("span");
    span.textContent = i;
    if (i === currentPage) span.classList.add("active");
    span.addEventListener("click", () => {
      currentPage = i;
      fillTable();
      renderPageNumbers();
    });
    container.appendChild(span);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchLeaderboard();
  renderPageNumbers();

  document.getElementById("modeSelect").addEventListener("change", () => {
    currentMode = document.getElementById("modeSelect").value;
    currentPage = 1;
    currentGroupStart = 1;
    fetchLeaderboard(currentMode, currentSortColumn);
    renderPageNumbers();
  });

  document.getElementById("prevGroupBtn").addEventListener("click", () => {
    if (currentGroupStart - groupSize >= 1) {
      currentGroupStart -= groupSize;
      if (currentPage < currentGroupStart) currentPage = currentGroupStart;
      fillTable();
      renderPageNumbers();
    }
  });

  document.getElementById("nextGroupBtn").addEventListener("click", () => {
    if (currentGroupStart + groupSize <= maxPages) {
      currentGroupStart += groupSize;
      currentPage = currentGroupStart;
      fillTable();
      renderPageNumbers();
    }
  });

  document.querySelectorAll("thead th").forEach(th => {
    const column = th.getAttribute("data-sort");
    if (column === "kills") {
      th.classList.add("sorted");
      currentSortColumn = column;
      currentSortDirection = "desc";
      const icon = document.createElement("i");
      icon.classList.add("sort-icon", "fa-solid", "fa-arrow-down");
      th.appendChild(icon);
    }
    th.addEventListener("click", function() {
      if (column === "rank" || column === "playerName") return;
      if (this.classList.contains("sorted")) {
        document.querySelectorAll("thead th").forEach(el => {
          el.classList.remove("sorted");
          const icon = el.querySelector(".sort-icon");
          if (icon) icon.remove();
        });
        currentSortColumn = "random";
        currentSortDirection = "desc";
        fetchLeaderboard(currentMode, "random");
      } else {
        document.querySelectorAll("thead th").forEach(el => {
          el.classList.remove("sorted");
          const icon = el.querySelector(".sort-icon");
          if (icon) icon.remove();
        });
        this.classList.add("sorted");
        currentSortColumn = column;
        currentSortDirection = "desc";
        const icon = document.createElement("i");
        icon.classList.add("sort-icon", "fa-solid", "fa-arrow-down");
        this.appendChild(icon);
        fetchLeaderboard(currentMode, column);
      }
    });
  });

  document.getElementById("backBtn").addEventListener("click", hidePlayerDetail);

  document.getElementById("searchBtn").addEventListener("click", () => {
    const input = document.getElementById("playerInput");
    const name = input.value.trim();
    if (!name) return;
    fetch("https://api.ashcon.app/mojang/v2/user/" + encodeURIComponent(name))
      .then(res => {
        if (res.status === 204) throw new Error("Spieler nicht gefunden");
        return res.json();
      })
      .then(profile => {
        const uuid = profile.uuid;
        showPlayerDetail(uuid);
      })
      .catch(err => {
        alert("Spieler nicht gefunden: " + name);
        console.error(err);
      });
  });
});
