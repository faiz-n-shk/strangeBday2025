// Burst animation for image tiles (random scatter, all visible, no clipping, true reverse outro)
function burstImagesForTile(tile, burstImgsArr) {
  const burstCount = burstImgsArr.length;
  const burstImgs = [];
  const rect = tile.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const imgW = Math.min(140, vw - 40); // match .burst-img size
  const imgH = Math.min(140, vh - 40);
  // Remove any existing burst images
  document.querySelectorAll(".burst-img").forEach((e) => e.remove());
  // Calculate random scatter positions (all visible, no clipping)
  const margin = 30;
  const positions = [];
  for (let i = 0; i < burstCount; i++) {
    let tries = 0;
    let pos;
    do {
      pos = {
        x: Math.random() * (vw - imgW - 2 * margin) + margin + imgW / 2,
        y: Math.random() * (vh - imgH - 2 * margin) + margin + imgH / 2,
      };
      tries++;
    } while (
      positions.some(
        (p) => Math.abs(p.x - pos.x) < imgW && Math.abs(p.y - pos.y) < imgH
      ) &&
      tries < 20
    );
    positions.push(pos);
  }
  burstImgsArr.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = "burst-img";
    img.style.left = `${centerX}px`;
    img.style.top = `${centerY}px`;
    img.style.transitionDelay = `${i * 0.03}s`;
    document.body.appendChild(img);
    burstImgs.push({ img, pos: positions[i] });
  });
  // Animate burst out (intro)
  setTimeout(() => {
    burstImgs.forEach(({ img, pos }, i) => {
      img.classList.add("burst-active");
      img.classList.add("burst-scatter");
      img.style.transform = `translate(-50%, -50%) scale(1.1) translate(${
        pos.x - centerX
      }px, ${pos.y - centerY}px)`;
      img.style.opacity = "1";
    });
  }, 10);
  // Add reverse handler (outro: animate back to tile, then fade out)
  function reverseBurst() {
    burstImgs.forEach(({ img }, i) => {
      img.style.transitionDelay = `${i * 0.03}s`;
      // Animate back to tile position
      img.style.transform = `translate(-50%, -50%) scale(0.5) translate(0px, 0px)`;
      img.style.opacity = "1";
    });
    // After the move, fade out
    setTimeout(() => {
      burstImgs.forEach(({ img }, i) => {
        img.style.transitionDelay = `${i * 0.03}s`;
        img.style.opacity = "0";
      });
    }, 500);
    setTimeout(() => {
      burstImgs.forEach(({ img }) => img.remove());
    }, 900);
    document.removeEventListener("mousedown", reverseBurst);
    tile.removeEventListener("mousedown", reverseBurst);
    tile.classList.remove("bursting");
  }
  setTimeout(() => {
    document.addEventListener("mousedown", reverseBurst);
    tile.addEventListener("mousedown", reverseBurst);
  }, 100);
}

// Attach burst to image tiles (use burst array from JSON)
function setupBurstTiles() {
  const memoryItems = document.querySelectorAll(".memory-item");
  memoryItems.forEach((item, idx) => {
    const img = item.querySelector(".memory-img");
    if (
      img &&
      window._burstData &&
      window._burstData[idx] &&
      window._burstData[idx].burst
    ) {
      item.addEventListener("mousedown", (e) => {
        if (item.classList.contains("bursting")) return;
        item.classList.add("bursting");
        burstImagesForTile(item, window._burstData[idx].burst);
        e.stopPropagation();
      });
    }
  });
}

// Load memories from content.json and render them
fetch("content.json")
  .then((res) => res.json())
  .then((content) => {
    window._burstData = content;
    const memoryList = document.getElementById("memory-list");
    content.forEach((item, idx) => {
      let el;
      if (item.type === "image") {
        el = document.createElement("div");
        el.className = "memory-item";
        el.innerHTML = `
          <img src="${item.src}" alt="${item.alt}" class="memory-img" />
          <div class="caption">${item.caption}</div>
        `;
      } else if (item.type === "video") {
        el = document.createElement("div");
        el.className = "memory-item memory-video-tile";
        el.innerHTML = `
          <video class="memory-video" loop muted playsinline autoplay>
            <source src="${item.src}" type="video/mp4">
            ${item.alt}
          </video>
          <div class="caption">${item.caption}</div>
        `;
        // Add click handler for video tile popup
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          showVideoPopup();
        });
      }
      memoryList.appendChild(el);
    });
    setupBurstTiles();
    setupBackgroundAudio(content);
  });

// Show popup with 3 videos (placeholders for now)
function showVideoPopup() {
  // Remove existing popup if any
  const oldPopup = document.getElementById("video-popup");
  if (oldPopup) oldPopup.remove();
  const popup = document.createElement("div");
  popup.id = "video-popup";
  document.body.appendChild(popup);

  // Add overlay
  const overlay = document.createElement("div");
  overlay.className = "video-popup-overlay";
  popup.appendChild(overlay);
  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-popup";
  closeBtn.innerHTML = "&times;";
  popup.appendChild(closeBtn);

  // Get the position of the video tile (center of screen if not found)
  let tileRect = {
    left: window.innerWidth / 2 - 160,
    top: window.innerHeight / 2 - 100,
    width: 320,
    height: 200,
  };
  const tile = document.querySelector(".memory-video-tile");
  if (tile) {
    const rect = tile.getBoundingClientRect();
    tileRect = rect;
  }
  const centerX = tileRect.left + tileRect.width / 2;
  const centerY = tileRect.top + tileRect.height / 2;

  // Add 3 videos, burst out to random locations (not clipped)
  // Now use popupVideos from content.json if available
  let videoUrls = [
    "./videos/arnav-gekko.mp4",
    "./videos/arnav-laugh.mp4",
    "./videos/dir-boba.mp4",
    "./videos/Muhammad Sumbul.mp4",
    "./videos/strange-doggy.mp4",
    "./videos/strange-sus.mp4",
  ];
  // Try to get from content.json
  if (window._burstData && Array.isArray(window._burstData)) {
    const videoTile = window._burstData.find(
      (item) => item.type === "video" && Array.isArray(item.popupVideos)
    );
    if (videoTile && videoTile.popupVideos.length === 3) {
      videoUrls = videoTile.popupVideos;
    }
  }
  const vidW = 320,
    vidH = 200;
  const margin = 24;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const usedPositions = [];
  const videoEls = [];
  videoUrls.forEach((url, idx) => {
    const vid = document.createElement("video");
    vid.src = url;
    vid.loop = true;
    vid.muted = true;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.controls = true;
    vid.style.position = "fixed";
    vid.style.zIndex = 1006;
    vid.style.width = vidW + "px";
    vid.style.height = vidH + "px";
    vid.style.borderRadius = "18px";
    vid.style.boxShadow = "0 2px 18px rgba(30,30,47,0.16)";
    vid.setAttribute("controlsList", "nodownload noremoteplayback");
    // Start at tile center
    vid.style.left = `${centerX - vidW / 2}px`;
    vid.style.top = `${centerY - vidH / 2}px`;
    vid.style.opacity = "0";
    popup.appendChild(vid);
    videoEls.push(vid);
    // Find a random, non-overlapping, non-clipped position
    let tries = 0,
      x,
      y,
      overlap;
    do {
      x = Math.floor(Math.random() * (vw - vidW - 3 * margin)) + margin;
      y = Math.floor(Math.random() * (vh - vidH - 3 * margin)) + margin;
      overlap = usedPositions.some(
        (pos) => Math.abs(pos.x - x) < vidW && Math.abs(pos.y - y) < vidH
      );
      tries++;
    } while (overlap && tries < 30);
    usedPositions.push({ x, y });
    // Animate burst out
    setTimeout(() => {
      vid.style.transition = "all 0.7s cubic-bezier(0.68,-0.55,0.27,1.55)";
      vid.style.left = `${x}px`;
      vid.style.top = `${y}px`;
      vid.style.opacity = "1";
    }, 30 + idx * 80);
    // Store burst target for outro
    vid._burstTarget = { x, y };
  });

  // Outro burst: reverse animation when closing
  function reverseBurstAndRemove() {
    videoEls.forEach((vid, idx) => {
      vid.style.transition = "all 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)";
      vid.style.left = `${centerX - vidW / 2}px`;
      vid.style.top = `${centerY - vidH / 2}px`;
      vid.style.opacity = "0";
    });
    setTimeout(() => {
      if (popup.parentNode) popup.remove();
    }, 650);
  }
  closeBtn.onclick = reverseBurstAndRemove;
  overlay.onclick = reverseBurstAndRemove;
}

// Setup background audio (placeholder for now)
function setupBackgroundAudio(content) {
  // Find a background audio from content.json if available, else use placeholder
  let audioSrc = null;
  // Look for the first audio type in the array
  if (Array.isArray(content)) {
    // Prefer .mp3 or .ogg for best browser support
    const audioObj = content.find(
      (item) =>
        item.type === "audio" &&
        item.src &&
        (item.src.endsWith(".mp3") || item.src.endsWith(".ogg"))
    );
    if (audioObj) {
      audioSrc = audioObj.src;
    } else {
      // fallback: any audio type
      const anyAudio = content.find(
        (item) => item.type === "audio" && item.src
      );
      if (anyAudio) audioSrc = anyAudio.src;
    }
  }
  if (!audioSrc) {
    audioSrc = "./Broken Clocks.mp3"; // fallback placeholder
  }
  let audio = document.getElementById("bg-audio");
  if (!audio) {
    audio = document.createElement("audio");
    audio.id = "bg-audio";
    audio.src = audioSrc;
    audio.loop = true;
    audio.volume = 0.03;
    audio.muted = false; // Ensure not muted
    audio.playsInline = true; // For mobile compatibility

    audio.autoplay = true;
    audio.style.display = "none";
    document.body.appendChild(audio);
    // Ensure volume is set after play starts (for some browsers)
    audio.addEventListener("play", () => {
      audio.volume = 0.3;
    });
    // Try to play (handle browser restrictions)
    setTimeout(() => {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }, 500);
  } else {
    audio.volume = 0.3; // Reset volume
    audio.loop = true; // Ensure loop is set
    audio.autoplay = true; // Ensure autoplay is set
    audio.src = audioSrc;
    // Try to play (handle browser restrictions)
    setTimeout(() => {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }, 500);
  }
  // Add a user interaction fallback for browsers that block autoplay
  function tryPlayOnUserGesture() {
    if (audio.paused) {
      audio.play().catch(() => {});
    }
    window.removeEventListener("pointerdown", tryPlayOnUserGesture);
    window.removeEventListener("keydown", tryPlayOnUserGesture);
  }
  window.addEventListener("pointerdown", tryPlayOnUserGesture);
  window.addEventListener("keydown", tryPlayOnUserGesture);
}

// Animated particles background
function animateParticles() {
  const canvas = document.getElementById("particles-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = window.innerWidth;
  let h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  let particles = [];
  const colors = [
    "#ff7e5f",
    "#feb47b",
    "#76b2fe",
    "#b69cff",
    "#43e97b",
    "#ffd200",
  ];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 2 + Math.random() * 3,
      d: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
    });
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener("resize", () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
  });
}

animateParticles();
